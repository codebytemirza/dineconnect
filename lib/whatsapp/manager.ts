import makeWASocket, {
  DisconnectReason,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  isJidGroup,
  isJidBroadcast,
  isJidNewsletter,
  WASocket,
  WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import { env } from '../env';
import { createOrderAgentForRestaurant } from '../agent/order-agent';
import { saveChatMessage, getRestaurant } from '../queries';
import { 
  createRedisAuthState, 
  clearRedisAuthState, 
  getAuthStatus, 
  updateAuthStatus,
  setConnectedPhone 
} from '../redis/whatsapp-auth';
import { 
  getOrCreateSession, 
  cleanupExpiredSessions, 
  startSessionCleanup,
  checkRateLimit 
} from '../redis/session';

const logger = pino({ level: 'silent' });
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export type BridgeConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

interface RestaurantBridgeState {
  restaurantId: string;
  status: BridgeConnectionStatus;
  qrRaw: string | null;
  qrDataUrl: string | null;
  connectedPhone: string | null;
  socket: WASocket | null;
}

class WhatsAppBridgeManager {
  private bridges = new Map<string, RestaurantBridgeState>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private getOrCreateBridgeState(restaurantId: string): RestaurantBridgeState {
    let state = this.bridges.get(restaurantId);
    if (!state) {
      state = {
        restaurantId,
        status: 'disconnected',
        qrRaw: null,
        qrDataUrl: null,
        connectedPhone: null,
        socket: null,
      };
      this.bridges.set(restaurantId, state);
    }
    return state;
  }

  public async getStatus(restaurantId: string) {
    const state = this.getOrCreateBridgeState(restaurantId);
    
    // Check Redis for auth state
    const redisStatus = await getAuthStatus(restaurantId);
    
    // If socket is open, it is connected
    if (state.socket && state.status === 'connected') {
      return {
        restaurantId,
        status: 'connected',
        connectedPhone: state.connectedPhone,
        qrDataUrl: null,
        enabled: env.ENABLE_WHATSAPP === 'true',
      };
    }

    // If socket is generating QR
    if (state.status === 'qr_ready' && state.qrDataUrl) {
      return {
        restaurantId,
        status: 'qr_ready',
        connectedPhone: null,
        qrDataUrl: state.qrDataUrl,
        enabled: env.ENABLE_WHATSAPP === 'true',
      };
    }

    if (state.status === 'connecting') {
      return {
        restaurantId,
        status: 'connecting',
        connectedPhone: null,
        qrDataUrl: state.qrDataUrl,
        enabled: env.ENABLE_WHATSAPP === 'true',
      };
    }

    // Check Redis for existing credentials
    if (!state.socket && state.status === 'disconnected' && redisStatus.hasCreds) {
      // Auto-reconnect active socket in background
      this.startBridge(restaurantId).catch((err) => {
        console.error(`Failed to auto-reconnect bridge for ${restaurantId}:`, err);
      });
      return {
        restaurantId,
        status: 'connecting',
        connectedPhone: redisStatus.connectedPhone,
        qrDataUrl: null,
        enabled: env.ENABLE_WHATSAPP === 'true',
      };
    }

    return {
      restaurantId,
      status: 'disconnected',
      connectedPhone: null,
      qrDataUrl: null,
      enabled: env.ENABLE_WHATSAPP === 'true',
    };
  }

  public async startBridge(restaurantId: string): Promise<{ status: BridgeConnectionStatus; qrDataUrl: string | null }> {
    const bridge = this.getOrCreateBridgeState(restaurantId);

    // If already connected or connecting with an active socket
    if (bridge.socket && (bridge.status === 'connected' || bridge.status === 'qr_ready')) {
      return {
        status: bridge.status,
        qrDataUrl: bridge.qrDataUrl,
      };
    }

    bridge.status = 'connecting';
    await updateAuthStatus(restaurantId, 'connecting');

    console.log(`\n[WHATSAPP BRIDGE] Initializing connection for restaurant "${restaurantId}"...`);

    // Create Redis-backed auth state
    const { state, saveCreds } = await createRedisAuthState(restaurantId);

    const sock = makeWASocket({
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      shouldIgnoreJid: (jid) => isJidBroadcast(jid) || isJidNewsletter(jid),
    });

    bridge.socket = sock;

    // Connection Events
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        bridge.status = 'qr_ready';
        bridge.qrRaw = qr;
        await updateAuthStatus(restaurantId, 'qr_ready');
        try {
          bridge.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
        } catch (qrErr) {
          console.error('Failed to generate QR data URL:', qrErr);
        }

        console.log(`\n📱 [${restaurantId}] WhatsApp QR Code Generated! Scan via Linked Devices:\n`);
        qrcodeTerminal.generate(qr, { small: true });
        console.log('------------------------------------------------------------\n');
      }

      if (connection === 'open') {
        bridge.status = 'connected';
        bridge.qrRaw = null;
        bridge.qrDataUrl = null;
        const rawUser = sock.user?.id || '';
        bridge.connectedPhone = rawUser.split(':')[0] || rawUser;
        await updateAuthStatus(restaurantId, 'connected');
        await setConnectedPhone(restaurantId, bridge.connectedPhone);
        console.log(`🎉 [${restaurantId}] WhatsApp Bridge CONNECTED! (Phone: ${bridge.connectedPhone})`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(
          `[${restaurantId}] WhatsApp socket closed (statusCode: ${statusCode}). Reconnecting: ${shouldReconnect}`
        );

        if (shouldReconnect) {
          bridge.status = 'connecting';
          await updateAuthStatus(restaurantId, 'connecting');
          setTimeout(() => this.startBridge(restaurantId), 3000);
        } else {
          bridge.status = 'disconnected';
          bridge.socket = null;
          bridge.connectedPhone = null;
          bridge.qrRaw = null;
          bridge.qrDataUrl = null;
          await clearRedisAuthState(restaurantId);
          await updateAuthStatus(restaurantId, 'disconnected');
          console.log(`❌ [${restaurantId}] Logged out from WhatsApp.`);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Incoming Messages
    sock.ev.on('messages.upsert', async (event) => {
      if (event.type !== 'notify') return;

      for (const msg of event.messages) {
        if (msg.key.fromMe) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || isJidGroup(remoteJid) || isJidBroadcast(remoteJid)) continue;

        const customerPhone = jidNormalizedUser(remoteJid);
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          null;

        if (!text || text.trim().length === 0) continue;

        console.log(`\n📩 [${restaurantId}] INCOMING from ${customerPhone}: "${text}"`);

        // Rate limiting
        const rateLimit = await checkRateLimit(restaurantId, customerPhone);
        if (!rateLimit.allowed) {
          console.warn(`[RATE LIMIT] ${customerPhone} exceeded limit`);
          continue;
        }

        // 1. Log customer message
        saveChatMessage(restaurantId, customerPhone, 'customer', text);

        // 2. Typing indicator
        try {
          await sock.sendPresenceUpdate('composing', remoteJid);
        } catch {}

        // 3. Process via Restaurant LangChain Order Agent
        const botReply = await this.handleMessageWithAgent(restaurantId, customerPhone, text);

        // 4. Log bot reply
        saveChatMessage(restaurantId, customerPhone, 'bot', botReply);

        // 5. Send reply
        try {
          await sock.sendMessage(remoteJid, { text: botReply }, { quoted: msg });
          console.log(`📤 [${restaurantId}] SENT REPLY to ${customerPhone}`);
        } catch (sendErr: any) {
          console.error(`❌ Failed to send reply to ${customerPhone}:`, sendErr.message);
        } finally {
          try {
            await sock.sendPresenceUpdate('paused', remoteJid);
          } catch {}
        }
      }
    });

    // Wait a brief moment for QR event to fire if needed
    await new Promise((r) => setTimeout(r, 1500));

    return {
      status: bridge.status,
      qrDataUrl: bridge.qrDataUrl,
    };
  }

  public async disconnectBridge(restaurantId: string): Promise<boolean> {
    const bridge = this.bridges.get(restaurantId);
    if (bridge?.socket) {
      try {
        await bridge.socket.logout();
      } catch {}
      try {
        bridge.socket.end(undefined);
      } catch {}
    }

    // Clear Redis auth state
    await clearRedisAuthState(restaurantId);

    if (bridge) {
      bridge.status = 'disconnected';
      bridge.socket = null;
      bridge.connectedPhone = null;
      bridge.qrRaw = null;
      bridge.qrDataUrl = null;
    }

    console.log(`🔌 [${restaurantId}] WhatsApp Bridge disconnected and session cleared.`);
    return true;
  }

  public async sendMessage(
    restaurantId: string,
    toPhone: string,
    text: string
  ): Promise<boolean> {
    try {
      const bridge = this.bridges.get(restaurantId);
      if (!bridge?.socket || bridge.status !== 'connected') {
        console.warn(`[WHATSAPP BRIDGE] Bridge for "${restaurantId}" not connected. Notification queued/logged.`);
        return false;
      }

      const cleanPhone = toPhone.replace(/[^0-9]/g, '');
      if (!cleanPhone) {
        console.warn(`[WHATSAPP BRIDGE] Invalid phone number "${toPhone}"`);
        return false;
      }

      const remoteJid = `${cleanPhone}@s.whatsapp.net`;
      await bridge.socket.sendMessage(remoteJid, { text });
      console.log(`📤 [${restaurantId}] Automated WhatsApp notification sent to ${cleanPhone}`);
      return true;
    } catch (err: any) {
      console.error(`❌ [${restaurantId}] Error sending WhatsApp notification to ${toPhone}:`, err.message);
      return false;
    }
  }

  private async handleMessageWithAgent(
    restaurantId: string,
    customerPhone: string,
    userText: string
  ): Promise<string> {
    const bridge = this.getOrCreateBridgeState(restaurantId);
    const now = Date.now();

    // Get or create session from Redis
    const userSession = await getOrCreateSession(restaurantId, customerPhone);

    const agent = await createOrderAgentForRestaurant(restaurantId);
    let responseText = '';
    let retryCount = 0;
    const maxRetries = 4;

    while (retryCount <= maxRetries) {
      try {
        responseText = '';
        const result = await agent.invoke(
          { messages: [{ role: 'user', content: userText }] },
          { configurable: { thread_id: userSession.threadId } },
        );
        const lastMessage = result.messages.at(-1);
        responseText = typeof lastMessage?.content === 'string'
          ? lastMessage.content
          : Array.isArray(lastMessage?.content)
            ? lastMessage.content
              .filter((block): block is { type: 'text'; text: string } => typeof block === 'object' && block !== null && block.type === 'text')
              .map((block) => block.text)
              .join('')
            : '';

        if (responseText.trim().length > 0) {
          break;
        }
      } catch (err: any) {
        console.warn(`[AGENT LANGCHAIN] error on attempt ${retryCount + 1}: ${err.message}`);
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }

    if (!responseText.trim()) {
      responseText =
        "Welcome! I am your AI Order Assistant. How can I help you today? Feel free to ask for our *menu*!";
    }

    return responseText;
  }

  public startCleanup(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = startSessionCleanup(60000); // Every minute
    console.log('[SESSION] Periodic cleanup started');
  }

  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global singleton to survive hot reloads
const globalForWhatsApp = globalThis as unknown as {
  whatsappBridgeManager: WhatsAppBridgeManager | undefined;
};

export const whatsappManager =
  globalForWhatsApp.whatsappBridgeManager ?? new WhatsAppBridgeManager();

if (process.env.NODE_ENV !== 'production') {
  globalForWhatsApp.whatsappBridgeManager = whatsappManager;
}

// Start periodic cleanup
whatsappManager.startCleanup();
