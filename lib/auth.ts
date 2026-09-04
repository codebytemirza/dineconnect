import crypto from 'crypto';
import { cookies } from 'next/headers';
import { User, getUserByUsername, getUserById } from './queries';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dineconnect_ultra_secure_session_secret_2026';
export const AUTH_COOKIE_NAME = 'dineconnect_session';

export interface SessionPayload {
  userId: string;
  username: string;
  role: 'superadmin' | 'restaurant';
  restaurantId: string | null;
  name: string;
  expiresAt: number;
}

export function createSessionToken(user: User): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    restaurantId: user.restaurant_id,
    name: user.name,
    expiresAt,
  };

  const jsonStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');

  return `${base64Payload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(base64Payload)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const jsonStr = Buffer.from(base64Payload, 'base64url').toString('utf8');
    const payload: SessionPayload = JSON.parse(jsonStr);

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export const getSessionFromCookie = getCurrentUser;
