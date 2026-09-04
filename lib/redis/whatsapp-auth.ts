import {
  AuthenticationCreds,
  SignalKeyStore,
  SignalDataTypeMap,
  initAuthCreds,
} from '@whiskeysockets/baileys';
import { redis, redisKeys, AUTH_STATE_TTL_SECONDS } from './client';

/**
 * Baileys Authentication State Adapter for Upstash Redis
 * Replaces useMultiFileAuthState for serverless/VM deployments
 * 
 * Stores creds and keys in Redis with JSON support
 * Provides atomic updates and automatic expiry
 */

export interface RedisAuthState {
  creds: AuthenticationCreds;
  keys: SignalKeyStore;
}

function createSignalKeyStore(): SignalKeyStore {
  return {
    get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
      const results: Record<string, any> = {};
      for (const id of ids) {
        const key = `${redisKeys.whatsappKeys('')}${type}:${id}`;
        const value = await redis.jsonGet(key);
        if (value) {
          results[id] = value;
        }
      }
      return results;
    },
    set: async (data: Record<string, any>) => {
      const pipeline: Array<[string, ...(string | number)[]]> = [];
      for (const [type, entries] of Object.entries(data)) {
        for (const [id, value] of Object.entries(entries)) {
          const key = `${redisKeys.whatsappKeys('')}${type}:${id}`;
          pipeline.push(['JSON.SET', key, '$', JSON.stringify(value)]);
          pipeline.push(['EXPIRE', key, AUTH_STATE_TTL_SECONDS]);
        }
      }
      if (pipeline.length > 0) {
        await redis.pipeline(pipeline);
      }
    },
    clear: async () => {
      // Note: In production, you might want to track keys per restaurant
      // For now, we'll clear by pattern (requires Redis SCAN which isn't in REST API)
      // This is a limitation of Upstash REST API - consider using Lua script for pattern deletion
    },
  };
}

export async function createRedisAuthState(restaurantId: string): Promise<{
  state: RedisAuthState;
  saveCreds: () => Promise<void>;
}> {
  const credsKey = redisKeys.whatsappCreds(restaurantId);
  const statusKey = redisKeys.whatsappStatus(restaurantId);

  // Load existing creds or initialize new
  let creds = await redis.jsonGet<AuthenticationCreds>(credsKey);
  
  if (!creds) {
    creds = initAuthCreds();
    await redis.jsonSet(credsKey, '$', creds);
    await redis.expire(credsKey, AUTH_STATE_TTL_SECONDS);
  }

  const keys = createSignalKeyStore();

  let saveCredsCalled = false;
  const saveCreds = async () => {
    // Debounce rapid saves
    if (saveCredsCalled) return;
    saveCredsCalled = true;
    
    setImmediate(async () => {
      saveCredsCalled = false;
      try {
        await redis.jsonSet(credsKey, '$', creds);
        await redis.expire(credsKey, AUTH_STATE_TTL_SECONDS);
        await redis.set(statusKey, 'connected', AUTH_STATE_TTL_SECONDS);
      } catch (error) {
        console.error(`[Redis Auth] Failed to save creds for ${restaurantId}:`, error);
      }
    });
  };

  // Load keys from Redis on startup
  try {
    // Keys are loaded lazily via the SignalKeyStore.get method
  } catch (error) {
    console.warn(`[Redis Auth] Could not preload keys for ${restaurantId}:`, error);
  }

  return {
    state: { creds, keys },
    saveCreds,
  };
}

export async function clearRedisAuthState(restaurantId: string): Promise<void> {
  const credsKey = redisKeys.whatsappCreds(restaurantId);
  const statusKey = redisKeys.whatsappStatus(restaurantId);
  
  // Delete creds and status
  await redis.del([credsKey, statusKey]);
  
  // Note: Keys are stored with pattern wa:keys:{restaurantId}:{type}:{id}
  // Upstash REST API doesn't support SCAN/KEYS for pattern deletion
  // In production, use a Lua script or track key names in a set
}

export async function getAuthStatus(restaurantId: string): Promise<{
  hasCreds: boolean;
  status: string;
  connectedPhone: string | null;
}> {
  const credsKey = redisKeys.whatsappCreds(restaurantId);
  const statusKey = redisKeys.whatsappStatus(restaurantId);
  
  const [creds, status] = await Promise.all([
    redis.exists(credsKey),
    redis.get(statusKey),
  ]);
  
  let connectedPhone: string | null = null;
  if (creds) {
    const credData = await redis.jsonGet<AuthenticationCreds>(credsKey);
    if (credData?.me?.id) {
      connectedPhone = credData.me.id.split(':')[0] || credData.me.id;
    }
  }
  
  return {
    hasCreds: creds === 1,
    status: status || (creds === 1 ? 'connected' : 'disconnected'),
    connectedPhone,
  };
}

export async function updateAuthStatus(
  restaurantId: string, 
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
): Promise<void> {
  const statusKey = redisKeys.whatsappStatus(restaurantId);
  await redis.set(statusKey, status, AUTH_STATE_TTL_SECONDS);
}

export async function setConnectedPhone(restaurantId: string, phone: string): Promise<void> {
  const credsKey = redisKeys.whatsappCreds(restaurantId);
  const creds = await redis.jsonGet<AuthenticationCreds>(credsKey);
  
  if (creds) {
    creds.me = { ...creds.me, id: `${phone}@s.whatsapp.net` };
    await redis.jsonSet(credsKey, '$', creds);
    await redis.expire(credsKey, AUTH_STATE_TTL_SECONDS);
  }
}
