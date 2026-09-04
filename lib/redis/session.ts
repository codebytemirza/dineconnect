import { redis, redisKeys, SESSION_TTL_SECONDS, SESSION_TTL_MS } from './client';

export interface CustomerSession {
  threadId: string;
  lastActive: number;
  restaurantId: string;
  customerPhone: string;
  language?: string;
  cart?: Array<{
    itemName: string;
    quantity: number;
    customizations?: string;
  }>;
}

const SESSION_TIMEOUT_MS = SESSION_TTL_MS;

export async function getOrCreateSession(
  restaurantId: string,
  customerPhone: string
): Promise<CustomerSession> {
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const sessionKey = redisKeys.customerSession(restaurantId, cleanPhone);
  const now = Date.now();

  // Try to get existing session
  const existing = await redis.jsonGet<CustomerSession>(sessionKey);
  
  if (existing && (now - existing.lastActive <= SESSION_TIMEOUT_MS)) {
    // Update last active
    existing.lastActive = now;
    await redis.jsonSet(sessionKey, '$', existing);
    await redis.expire(sessionKey, SESSION_TTL_SECONDS);
    
    // Update expiry tracking
    await redis.zadd(redisKeys.sessionExpiry, now + SESSION_TIMEOUT_MS, sessionKey);
    
    return existing;
  }

  // Create new session
  const threadId = `thread_${restaurantId}_${cleanPhone}_${now}`;
  const session: CustomerSession = {
    threadId,
    lastActive: now,
    restaurantId,
    customerPhone: cleanPhone,
    cart: [],
  };

  await redis.jsonSet(sessionKey, '$', session);
  await redis.expire(sessionKey, SESSION_TTL_SECONDS);
  await redis.zadd(redisKeys.sessionExpiry, now + SESSION_TIMEOUT_MS, sessionKey);

  console.log(`[SESSION] Created new thread ${threadId} for ${customerPhone} at ${restaurantId}`);
  return session;
}

export async function updateSession(
  restaurantId: string,
  customerPhone: string,
  updates: Partial<CustomerSession>
): Promise<CustomerSession | null> {
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const sessionKey = redisKeys.customerSession(restaurantId, cleanPhone);
  const now = Date.now();

  const existing = await redis.jsonGet<CustomerSession>(sessionKey);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    lastActive: now,
  };

  await redis.jsonSet(sessionKey, '$', updated);
  await redis.expire(sessionKey, SESSION_TTL_SECONDS);
  await redis.zadd(redisKeys.sessionExpiry, now + SESSION_TTL_SECONDS, sessionKey);

  return updated;
}

export async function getSession(
  restaurantId: string,
  customerPhone: string
): Promise<CustomerSession | null> {
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const sessionKey = redisKeys.customerSession(restaurantId, cleanPhone);
  
  const session = await redis.jsonGet<CustomerSession>(sessionKey);
  if (!session) return null;

  // Check if expired
  const now = Date.now();
  if (now - session.lastActive > SESSION_TIMEOUT_MS) {
    await deleteSession(restaurantId, customerPhone);
    return null;
  }

  return session;
}

export async function deleteSession(
  restaurantId: string,
  customerPhone: string
): Promise<boolean> {
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const sessionKey = redisKeys.customerSession(restaurantId, cleanPhone);
  
  const result = await redis.del(sessionKey);
  await redis.zrem(redisKeys.sessionExpiry, sessionKey);
  
  return result > 0;
}

export async function cleanupExpiredSessions(): Promise<number> {
  const now = Date.now();
  const expiredKeys = await redis.zrangebyscore(
    redisKeys.sessionExpiry,
    0,
    now
  );

  if (expiredKeys.length === 0) return 0;

  // Delete expired sessions
  await redis.del(expiredKeys);
  await redis.zrem(redisKeys.sessionExpiry, ...expiredKeys);

  console.log(`[SESSION] Cleaned up ${expiredKeys.length} expired sessions`);
  return expiredKeys.length;
}

// Periodic cleanup - run every minute
export function startSessionCleanup(intervalMs: number = 60000): NodeJS.Timeout {
  return setInterval(() => {
    cleanupExpiredSessions().catch(console.error);
  }, intervalMs);
}

export async function getActiveSessionCount(restaurantId?: string): Promise<number> {
  // This is approximate - counts all sessions in expiry set
  // For per-restaurant count, we'd need a separate sorted set per restaurant
  const allKeys = await redis.zrangebyscore(
    redisKeys.sessionExpiry,
    Date.now(),
    '+inf'
  );
  
  if (!restaurantId) return allKeys.length;
  
  // Filter by restaurant prefix
  const prefix = `session:${restaurantId}:`;
  return allKeys.filter(k => k.startsWith(prefix)).length;
}

// Rate limiting for incoming messages
export async function checkRateLimit(
  restaurantId: string,
  customerPhone: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const key = redisKeys.rateLimit(restaurantId, cleanPhone);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - 60; // 1 minute window

  // Use a sorted set for sliding window rate limiting
  const rateLimitKey = `${key}:window`;
  
  // Remove old entries
  await redis.zrem(rateLimitKey, ...(await redis.zrangebyscore(rateLimitKey, 0, windowStart)) || []);
  
  // Count current requests
  const currentCount = await redis.zrangebyscore(rateLimitKey, windowStart, '+inf');
  const count = currentCount.length;

  const allowed = count < 30; // 30 requests per minute
  const remaining = Math.max(0, 30 - count - 1);
  const resetAt = now + 60;

  if (allowed) {
    // Add current request
    await redis.zadd(rateLimitKey, now, `${now}:${Math.random()}`);
    await redis.expire(rateLimitKey, 120);
  }

  return { allowed, remaining, resetAt };
}