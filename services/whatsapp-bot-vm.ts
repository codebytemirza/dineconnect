import makeWASocket, {
  DisconnectReason,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  isJidGroup,
  isJidBroadcast,
  isJidNewsletter,
  WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import pino from 'pino';
import { env } from '../lib/env';
import { createOrderAgentForRestaurant } from '../lib/agent/order-agent';
import { saveChatMessage, getRestaurant } from '../lib/queries';
import { 
  createRedisAuthState, 
  clearRedisAuthState, 
  updateAuthStatus,
  setConnectedPhone 
} from '../lib/redis/whatsapp-auth';
import { 
  getOrCreateSession, 
  cleanupExpiredSessions, 
  startSessionCleanup,
  checkRateLimit 
} from '../lib/redis/session';

const logger = pino({ level: 'silent' });

// Support multiple restaurants via environment variable or default
const RESTAURANT_IDS = (env.DEFAULT_RESTAURANT_ID || 'burger-joint').split(',').map(s => s.trim());
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

async function startWhatsAppBotForRestaurant(restaurantId: string) {
  console.log(`\n=========================================`);
  console.log(`🍔 DineConnect WhatsApp Bridge Service`);
  console.log(`📍 Restaurant: ${restaurantId}`);
  console.log(`=========================================\n`);

  const restaurant = await getRestaurant(restaurantId);
  console.log(`Configured Restaurant: ${restaurant?.name || restaurantId}`);

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

  // Handle connection events
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await updateAuthStatus(restaurantId, 'qr_ready');
      console.log(`\n📱 [${restaurantId}] WhatsApp QR Code Generated! Scan with WhatsApp > Linked Devices:\n`);
      qrcodeTerminal.generate(qr, { small: true });
      console.log('------------------------------------------------------------\n');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[${restaurantId}] Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        await updateAuthStatus(restaurantId, 'connecting');
        setTimeout(() => startWhatsAppBotForRestaurant(restaurantId), 3000);
      } else {
        await clearRedisAuthState(restaurantId);
        await updateAuthStatus(restaurantId, 'disconnected');
        console.log(
          `❌ [${restaurantId}] Logged out from WhatsApp. Session cleared from Redis.`
        );
      }
    } else if (connection === 'open') {
      await updateAuthStatus(restaurantId, 'connected');
      const rawUser = sock.user?.id || '';
      const connectedPhone = rawUser.split(':')[0] || rawUser;
      await setConnectedPhone(restaurantId, connectedPhone);
      console.log(`🎉 [${restaurantId}] WhatsApp Bridge connected and ready to receive orders! (Phone: ${connectedPhone})`);
    }
  });

  // Save updated credentials
  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async (event) => {
    if (event.type !== 'notify') return;

    for (const msg of event.messages) {
      if (msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || isJidGroup(remoteJid) || isJidBroadcast(remoteJid)) continue;

      const customerPhone = jidNormalizedUser(remoteJid);
      const text = extractMessageText(msg);
      if (!text || text.trim().length === 0) continue;

      console.log(`\n📩 [${restaurantId}] INCOMING from ${customerPhone}: "${text}"`);

      // Rate limiting
      const rateLimit = await checkRateLimit(restaurantId, customerPhone);
      if (!rateLimit.allowed) {
        console.warn(`[RATE LIMIT] ${customerPhone} exceeded limit`);
        continue;
      }

      // 1. Log customer message to DB
      await saveChatMessage(restaurantId, customerPhone, 'customer', text);

      // 2. Set typing presence indicator
      try {
        await sock.sendPresenceUpdate('composing', remoteJid);
      } catch (err) {
        // Ignore presence errors
      }

      // 3. Process via LangChain Order Agent
      const botReply = await handleCustomerMessage(restaurantId, customerPhone, text);

      // 4. Log bot reply to DB
      await saveChatMessage(restaurantId, customerPhone, 'bot', botReply);

      // 5. Send reply via Baileys WhatsApp socket
      try {
        await sock.sendMessage(remoteJid, { text: botReply }, { quoted: msg });
        console.log(`📤 [${restaurantId}] REPLY sent to ${customerPhone}`);
      } catch (sendErr: any) {
        console.error(`❌ [${restaurantId}] Failed to send reply to ${customerPhone}:`, sendErr.message);
      } finally {
        try {
          await sock.sendPresenceUpdate('paused', remoteJid);
        } catch {}
      }
    }
  });

  return sock;
}

function extractMessageText(msg: WAMessage): string | null {
  const message = msg.message;
  if (!message) return null;

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}

async function handleCustomerMessage(
  restaurantId: string,
  customerPhone: string,
  userText: string
): Promise<string> {
  // Get or create session from Redis
  const session = await getOrCreateSession(restaurantId, customerPhone);
  const orderAgent = await createOrderAgentForRestaurant(restaurantId);
  let responseText = '';
  let retryCount = 0;
  const maxRetries = 4;

  while (retryCount <= maxRetries) {
    try {
      responseText = '';
      const result = await orderAgent.invoke(
        { messages: [{ role: 'user', content: userText }] },
        { configurable: { thread_id: session.threadId } },
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
    } catch (error: any) {
      console.warn(`[AGENT ERROR] (attempt ${retryCount + 1}):`, error.message);
      retryCount++;
      if (retryCount <= maxRetries) {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  }

  if (!responseText.trim()) {
    responseText =
      "Welcome! I am your AI Order Assistant. How can I help you today? Feel free to ask for our *menu*!";
  }

  return responseText;
}

// Main entry point - start bots for all configured restaurants
async function main() {
  console.log('🚀 Starting DineConnect WhatsApp Bot Service (VM Mode)');
  console.log(`📋 Configured restaurants: ${RESTAURANT_IDS.join(', ')}`);

  // Start periodic session cleanup
  const cleanupInterval = startSessionCleanup(60000);
  console.log('[SESSION] Periodic cleanup started (every 60s)');

  // Start bot for each restaurant
  const bots = await Promise.all(
    RESTAURANT_IDS.map(restaurantId => startWhatsAppBotForRestaurant(restaurantId))
  );

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down...');
    clearInterval(cleanupInterval);
    for (const sock of bots) {
      if (sock) {
        try { await sock.logout(); } catch {}
        try { sock.end(undefined); } catch {}
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  console.log('\n✅ All bots started. Press Ctrl+C to stop.\n');
}

// Run if executed directly
if (require.main === module || process.argv[1]?.endsWith('whatsapp-bot-vm.ts')) {
  main().catch((err) => {
    console.error('❌ Fatal error starting WhatsApp bot:', err);
    process.exit(1);
  });
}

export { startWhatsAppBotForRestaurant };
