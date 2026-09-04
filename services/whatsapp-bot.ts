import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  isJidGroup,
  isJidBroadcast,
  isJidNewsletter,
  WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { createOrderAgentForRestaurant } from '../lib/agent/order-agent';
import { saveChatMessage, getRestaurant } from '../lib/queries';
import { env } from '../lib/env';

const logger = pino({ level: 'silent' });
const restaurantId = env.DEFAULT_RESTAURANT_ID || 'burger-joint';
const APP_NAME = 'dineconnect_whatsapp';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout

// Session tracker for active customer conversations
interface UserSessionState {
  threadId: string;
  lastActive: number;
}

const activeSessions = new Map<string, UserSessionState>();

// Periodic session cleanup
setInterval(() => {
  const now = Date.now();
  for (const [phone, session] of activeSessions.entries()) {
    if (now - session.lastActive > SESSION_TIMEOUT_MS) {
      console.log(`[SESSION] Expired inactive session for customer ${phone}`);
      activeSessions.delete(phone);
    }
  }
}, 60 * 1000);

async function getOrCreateUserSession(customerPhone: string): Promise<UserSessionState> {
  const now = Date.now();
  let session = activeSessions.get(customerPhone);

  if (!session || (now - session.lastActive > SESSION_TIMEOUT_MS)) {
    session = {
      threadId: `thread_${customerPhone.replace(/[^0-9]/g, '')}_${now}`,
      lastActive: now,
    };
    activeSessions.set(customerPhone, session);
    console.log(`[SESSION] Initialized new thread ${session.threadId} for ${customerPhone}`);
  } else {
    session.lastActive = now;
  }

  return session;
}

// Extract message text from WAMessage
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

// Process customer message through the LangChain Order Agent
async function handleCustomerMessage(
  customerPhone: string,
  userText: string
): Promise<string> {
  const session = await getOrCreateUserSession(customerPhone);
  let responseText = '';
  let retryCount = 0;
  const maxRetries = 4;

  while (retryCount <= maxRetries) {
    try {
      responseText = '';
      const orderAgent = await createOrderAgentForRestaurant(restaurantId);
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

export async function startWhatsAppBot() {
  console.log('\n=========================================');
  console.log('🍔 DineConnect WhatsApp Bridge Service');
  console.log('=========================================');

  const restaurant = await getRestaurant(restaurantId);
  console.log(`Configured Restaurant: ${restaurant?.name || restaurantId}`);

  // Auth directory
  const authDir = path.resolve(process.cwd(), 'data', 'whatsapp-auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    // Ignore broadcasts & newsletters
    shouldIgnoreJid: (jid) => isJidBroadcast(jid) || isJidNewsletter(jid),
  });

  // Handle connection events
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 WhatsApp QR Code Generated! Scan with WhatsApp > Linked Devices:\n');
      qrcode.generate(qr, { small: true });
      console.log('------------------------------------------------------------\n');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[WHATSAPP] Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        setTimeout(() => startWhatsAppBot(), 3000);
      } else {
        console.log(
          '❌ Logged out from WhatsApp. Remove ./data/whatsapp-auth and restart to re-scan QR.'
        );
      }
    } else if (connection === 'open') {
      console.log('🎉 WhatsApp Bridge connected and ready to receive orders!');
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

      console.log(`\n📩 [INCOMING] From ${customerPhone}: "${text}"`);

      // 1. Log customer message to DB
      await saveChatMessage(restaurantId, customerPhone, 'customer', text);

      // 2. Set typing presence indicator
      try {
        await sock.sendPresenceUpdate('composing', remoteJid);
      } catch (err) {
        // Ignore presence errors
      }

      // 3. Process via LangChain Order Agent
      const botReply = await handleCustomerMessage(customerPhone, text);

      // 4. Log bot reply to DB
      await saveChatMessage(restaurantId, customerPhone, 'bot', botReply);

      // 5. Send reply via Baileys WhatsApp socket
      try {
        await sock.sendMessage(remoteJid, { text: botReply }, { quoted: msg });
        console.log(`📤 [REPLY] Sent response to ${customerPhone}`);
      } catch (sendErr: any) {
        console.error(`❌ Failed to send reply to ${customerPhone}:`, sendErr.message);
      } finally {
        try {
          await sock.sendPresenceUpdate('paused', remoteJid);
        } catch {}
      }
    }
  });

  return sock;
}

// Start standalone bot process
if (require.main === module || process.argv[1]?.endsWith('whatsapp-bot.ts')) {
  startWhatsAppBot().catch((err) => {
    console.error('❌ Fatal error starting WhatsApp bot:', err);
    process.exit(1);
  });
}
