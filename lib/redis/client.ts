import { env } from '../env';

const REDIS_URL = env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in environment');
}

interface RedisResponse<T = any> {
  result: T;
}

async function redisRequest<T>(body: unknown, endpoint = ''): Promise<T> {
  const response = await fetch(`${REDIS_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Redis request failed: ${response.status} ${error}`);
  }

  const data: RedisResponse<T> = await response.json();
  return data.result;
}

export const redis = {
  // String operations
  async get(key: string): Promise<string | null> {
    return redisRequest<string>(['GET', key]);
  },

  async set(key: string, value: string, exSeconds?: number): Promise<'OK'> {
    if (exSeconds) {
      return redisRequest(['SET', key, value, 'EX', exSeconds]);
    }
    return redisRequest(['SET', key, value]);
  },

  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    return redisRequest(['DEL', ...keys]);
  },

  async exists(key: string): Promise<number> {
    return redisRequest(['EXISTS', key]);
  },

  async expire(key: string, seconds: number): Promise<number> {
    return redisRequest(['EXPIRE', key, seconds]);
  },

  async ttl(key: string): Promise<number> {
    return redisRequest(['TTL', key]);
  },

  // Hash operations (for session data)
  async hget(key: string, field: string): Promise<string | null> {
    return redisRequest(['HGET', key, field]);
  },

  async hset(key: string, field: string, value: string): Promise<number> {
    return redisRequest(['HSET', key, field, value]);
  },

  async hsetnx(key: string, field: string, value: string): Promise<number> {
    return redisRequest(['HSETNX', key, field, value]);
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    return redisRequest(['HGETALL', key]);
  },

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return redisRequest(['HDEL', key, ...fields]);
  },

  async hexists(key: string, field: string): Promise<number> {
    return redisRequest(['HEXISTS', key, field]);
  },

  // List operations (for message queues if needed)
  async lpush(key: string, ...values: string[]): Promise<number> {
    return redisRequest(['LPUSH', key, ...values]);
  },

  async rpop(key: string): Promise<string | null> {
    return redisRequest(['RPOP', key]);
  },

  async llen(key: string): Promise<number> {
    return redisRequest(['LLEN', key]);
  },

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return redisRequest(['LRANGE', key, start, stop]);
  },

  // Sorted sets (for session expiry tracking)
  async zadd(key: string, score: number, member: string): Promise<number> {
    return redisRequest(['ZADD', key, score, member]);
  },

  async zrem(key: string, ...members: string[]): Promise<number> {
    return redisRequest(['ZREM', key, ...members]);
  },

  async zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]> {
    return redisRequest(['ZRANGEBYSCORE', key, min, max]);
  },

  // JSON operations (for complex objects)
  async jsonSet(key: string, path: string, value: unknown): Promise<'OK'> {
    return redisRequest(['JSON.SET', key, path, JSON.stringify(value)]);
  },

  async jsonGet<T>(key: string, path: string = '$'): Promise<T | null> {
    return redisRequest(['JSON.GET', key, path]);
  },

  async jsonDel(key: string, path: string = '$'): Promise<number> {
    return redisRequest(['JSON.DEL', key, path]);
  },

  // Atomic operations
  async eval(script: string, numKeys: number, ...keysAndArgs: (string | number)[]): Promise<any> {
    return redisRequest(['EVAL', script, numKeys, ...keysAndArgs]);
  },

  // Pipeline for batch operations
  async pipeline(commands: Array<[string, ...(string | number)[]]>): Promise<any[]> {
    return redisRequest(commands, '/pipeline');
  },
};

// Key generators for consistent naming
export const redisKeys = {
  // WhatsApp auth state per restaurant
  whatsappCreds: (restaurantId: string) => `wa:creds:${restaurantId}`,
  whatsappKeys: (restaurantId: string) => `wa:keys:${restaurantId}`,
  whatsappStatus: (restaurantId: string) => `wa:status:${restaurantId}`,

  // Session management
  customerSession: (restaurantId: string, phone: string) => `session:${restaurantId}:${phone.replace(/[^0-9]/g, '')}`,
  sessionExpiry: 'sessions:expiry',

  // Rate limiting
  rateLimit: (restaurantId: string, phone: string) => `ratelimit:${restaurantId}:${phone.replace(/[^0-9]/g, '')}`,

  // Message queue (if needed for offline messages)
  messageQueue: (restaurantId: string) => `queue:messages:${restaurantId}`,

  // Bot health/heartbeat
  botHeartbeat: (restaurantId: string) => `bot:heartbeat:${restaurantId}`,
};

// Session TTL constants
export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes in seconds
export const AUTH_STATE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute
export const HEARTBEAT_TTL_SECONDS = 120; // 2 minutes
