import path from 'path';
import { access, rm } from 'fs/promises';
import makeWASocket, { DisconnectReason, makeCacheableSignalKeyStore, useMultiFileAuthState, jidNormalizedUser, isJidGroup, isJidBroadcast, isJidNewsletter, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import { env } from '../env';
import { createOrderAgentForRestaurant } from '../agent/order-agent';
import { saveChatMessage } from '../queries';

const logger = pino({ level: 'silent' });
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 20;
const isVercel = process.env.VERCEL === '1';
export type BridgeConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'unsupported';

interface RestaurantBridgeState { restaurantId: string; status: BridgeConnectionStatus; qrDataUrl: string | null; connectedPhone: string | null; socket: WASocket | null; }
interface UserSessionState { threadId: string; lastActive: number; }

class WhatsAppBridgeManager {
  private bridges = new Map<string, RestaurantBridgeState>();
  private sessions = new Map<string, UserSessionState>();
  private rateLimits = new Map<string, number[]>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private getOrCreateBridgeState(restaurantId: string) {
    let state = this.bridges.get(restaurantId);
    if (!state) {
      state = { restaurantId, status: 'disconnected', qrDataUrl: null, connectedPhone: null, socket: null };
      this.bridges.set(restaurantId, state);
    }
    return state;
  }

  private authDirectory(restaurantId: string) { return path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.WHATSAPP_AUTH_DIR, restaurantId); }
  private async hasLocalCredentials(restaurantId: string) {
    try { await access(path.join(this.authDirectory(restaurantId), 'creds.json')); return true; } catch { return false; }
  }
  private unsupportedStatus(restaurantId: string) {
    return { restaurantId, status: 'unsupported' as const, connectedPhone: null, qrDataUrl: null, enabled: false, message: 'WhatsApp linking requires a persistent Node process and local filesystem. It is not available on Vercel Functions.' };
  }

  public async getStatus(restaurantId: string) {
    if (isVercel) return this.unsupportedStatus(restaurantId);
    const state = this.getOrCreateBridgeState(restaurantId);
    if (state.socket && state.status === 'connected') return { restaurantId, status: 'connected' as const, connectedPhone: state.connectedPhone, qrDataUrl: null, enabled: env.ENABLE_WHATSAPP === 'true' };
    if (state.status === 'qr_ready' || state.status === 'connecting') return { restaurantId, status: state.status, connectedPhone: null, qrDataUrl: state.qrDataUrl, enabled: env.ENABLE_WHATSAPP === 'true' };
    return { restaurantId, status: 'disconnected' as const, connectedPhone: null, qrDataUrl: null, enabled: env.ENABLE_WHATSAPP === 'true', hasLocalCredentials: await this.hasLocalCredentials(restaurantId) };
  }

  public async startBridge(restaurantId: string): Promise<{ status: BridgeConnectionStatus; qrDataUrl: string | null; message?: string }> {
    if (isVercel) return { status: 'unsupported', qrDataUrl: null, message: this.unsupportedStatus(restaurantId).message };
    if (env.ENABLE_WHATSAPP !== 'true') return { status: 'disconnected', qrDataUrl: null, message: 'WhatsApp is disabled by ENABLE_WHATSAPP.' };
    const bridge = this.getOrCreateBridgeState(restaurantId);
    if (bridge.socket && ['connected', 'connecting', 'qr_ready'].includes(bridge.status)) return { status: bridge.status, qrDataUrl: bridge.qrDataUrl };

    bridge.status = 'connecting';
    const { state, saveCreds } = await useMultiFileAuthState(this.authDirectory(restaurantId));
    const sock = makeWASocket({ logger, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) }, shouldIgnoreJid: (jid) => isJidBroadcast(jid) || isJidNewsletter(jid) });
    bridge.socket = sock;
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) { bridge.status = 'qr_ready'; bridge.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 }); qrcodeTerminal.generate(qr, { small: true }); }
      if (connection === 'open') { bridge.status = 'connected'; bridge.qrDataUrl = null; const rawUser = sock.user?.id || ''; bridge.connectedPhone = rawUser.split(':')[0] || rawUser; }
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        bridge.socket = null; bridge.connectedPhone = null; bridge.qrDataUrl = null; bridge.status = shouldReconnect ? 'connecting' : 'disconnected';
        if (shouldReconnect) setTimeout(() => void this.startBridge(restaurantId), 3000);
      }
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (event) => {
      if (event.type !== 'notify') return;
      for (const msg of event.messages) {
        if (msg.key.fromMe || !msg.key.remoteJid || isJidGroup(msg.key.remoteJid) || isJidBroadcast(msg.key.remoteJid)) continue;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption;
        if (!text?.trim()) continue;
        const phone = jidNormalizedUser(msg.key.remoteJid);
        if (!this.allowMessage(restaurantId, phone)) continue;
        void saveChatMessage(restaurantId, phone, 'customer', text);
        const reply = await this.handleMessageWithAgent(restaurantId, phone, text);
        void saveChatMessage(restaurantId, phone, 'bot', reply);
        await sock.sendMessage(msg.key.remoteJid, { text: reply }, { quoted: msg });
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { status: bridge.status, qrDataUrl: bridge.qrDataUrl };
  }

  public async disconnectBridge(restaurantId: string) {
    const bridge = this.bridges.get(restaurantId);
    if (bridge?.socket) { try { await bridge.socket.logout(); } catch {} try { bridge.socket.end(undefined); } catch {} }
    if (!isVercel) await rm(this.authDirectory(restaurantId), { recursive: true, force: true });
    this.bridges.delete(restaurantId);
    for (const key of this.sessions.keys()) if (key.startsWith(`${restaurantId}:`)) this.sessions.delete(key);
    return true;
  }

  public async sendMessage(restaurantId: string, toPhone: string, text: string) {
    const bridge = this.bridges.get(restaurantId);
    if (!bridge?.socket || bridge.status !== 'connected') return false;
    const phone = toPhone.replace(/[^0-9]/g, '');
    if (!phone) return false;
    await bridge.socket.sendMessage(`${phone}@s.whatsapp.net`, { text });
    return true;
  }

  private getOrCreateSession(restaurantId: string, phone: string) {
    const key = `${restaurantId}:${phone}`, now = Date.now(), current = this.sessions.get(key);
    if (current && now - current.lastActive <= SESSION_TIMEOUT_MS) { current.lastActive = now; return current; }
    const session = { threadId: `${restaurantId}_${phone}_${now}`, lastActive: now }; this.sessions.set(key, session); return session;
  }
  private allowMessage(restaurantId: string, phone: string) {
    const key = `${restaurantId}:${phone}`, now = Date.now();
    const recent = (this.rateLimits.get(key) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX_MESSAGES) return false;
    recent.push(now); this.rateLimits.set(key, recent); return true;
  }
  private async handleMessageWithAgent(restaurantId: string, phone: string, text: string) {
    const agent = await createOrderAgentForRestaurant(restaurantId);
    try {
      const result = await agent.invoke({ messages: [{ role: 'user', content: text }] }, { configurable: { thread_id: this.getOrCreateSession(restaurantId, phone).threadId } });
      const content = result.messages.at(-1)?.content;
      const reply = typeof content === 'string' ? content : Array.isArray(content) ? content.filter((item): item is { type: 'text'; text: string } => typeof item === 'object' && item !== null && item.type === 'text').map((item) => item.text).join('') : '';
      return reply.trim() || 'Welcome! How can I help you today? Feel free to ask for our menu.';
    } catch (error) { console.error(`[WHATSAPP AGENT] ${restaurantId}:`, error); return 'Sorry, I am having trouble processing that right now. Please try again in a moment.'; }
  }
  public startCleanup() {
    if (this.cleanupInterval || isVercel) return;
    this.cleanupInterval = setInterval(() => { const cutoff = Date.now() - SESSION_TIMEOUT_MS; for (const [key, session] of this.sessions) if (session.lastActive < cutoff) this.sessions.delete(key); }, 60_000);
  }
}

const globalForWhatsApp = globalThis as typeof globalThis & { whatsappBridgeManager?: WhatsAppBridgeManager };
export const whatsappManager = globalForWhatsApp.whatsappBridgeManager ?? new WhatsAppBridgeManager();
if (process.env.NODE_ENV !== 'production') globalForWhatsApp.whatsappBridgeManager = whatsappManager;
whatsappManager.startCleanup();
