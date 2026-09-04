import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Client-side client with anon key (respects RLS)
export const supabaseClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

// For API routes - create client with user's JWT
export function createSupabaseServerClient(accessToken?: string): SupabaseClient {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Type-safe table names
export const TABLES = {
  RESTAURANTS: 'restaurants',
  MENU_ITEMS: 'menu_items',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  USERS: 'users',
  KNOWLEDGE_BASE: 'knowledge_base',
  CHAT_MESSAGES: 'chat_messages',
  SUBSCRIPTION_PAYMENTS: 'subscription_payments',
  WHATSAPP_AUTH_STATE: 'whatsapp_auth_state',
} as const;

// Helper to get restaurant-scoped query
export function withRestaurantId<T extends { restaurant_id?: string }>(
  client: SupabaseClient,
  table: string,
  restaurantId: string
) {
  return client.from(table).select('*').eq('restaurant_id', restaurantId);
}

// Transaction helper (Supabase doesn't have native transactions via REST)
// Use RPC functions for complex transactions
export async function executeTransaction(
  client: SupabaseClient,
  queries: Array<() => Promise<any>>
): Promise<any[]> {
  // Note: Supabase REST API doesn't support transactions
  // For true transactions, create a PostgreSQL function and call via RPC
  // This is a sequential fallback
  const results = [];
  for (const query of queries) {
    results.push(await query());
  }
  return results;
}

// Pagination helper
export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
}

export function applyPagination(
  query: any,
  params: PaginationParams
) {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const orderBy = params.orderBy ?? 'created_at';
  const ascending = params.ascending ?? false;

  return query
    .order(orderBy, { ascending })
    .range((page - 1) * limit, page * limit - 1);
}

// Error handling
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string,
    public hint?: string
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export function handleSupabaseError(error: any): never {
  if (error?.code) {
    throw new SupabaseError(
      error.message || 'Database error',
      error.code,
      error.details,
      error.hint
    );
  }
  throw error;
}
