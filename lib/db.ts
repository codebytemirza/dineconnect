import { supabaseAdmin, TABLES, handleSupabaseError } from './supabase/client';
import crypto from 'crypto';

export { supabaseAdmin };

// Re-export types from queries for compatibility
export * from './queries';

// Initialize Supabase connection and verify
export async function initDb(): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from(TABLES.RESTAURANTS)
      .select('id')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase connection established');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    throw error;
  }
}

// Helper functions for common operations
export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function getNowISO(): string {
  return new Date().toISOString();
}

// Generic CRUD helpers
export async function findById<T>(table: string, id: string): Promise<T | null> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    handleSupabaseError(error);
  }
  return data as T;
}

export async function findMany<T>(
  table: string,
  filters: Record<string, any> = {},
  options: {
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<T[]> {
  let query = supabaseAdmin.from(table).select('*');
  
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? false });
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }
  
  const { data, error } = await query;
  if (error) handleSupabaseError(error);
  return (data || []) as T[];
}

export async function insertOne<T>(table: string, record: Partial<T>): Promise<T> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .insert(record as any)
    .select()
    .single();
  
  if (error) handleSupabaseError(error);
  return data as T;
}

export async function updateOne<T>(
  table: string,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    handleSupabaseError(error);
  }
  return data as T;
}

export async function deleteOne(table: string, id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq('id', id);
  
  if (error) handleSupabaseError(error);
  return true;
}

export async function countRecords(table: string, filters: Record<string, any> = {}): Promise<number> {
  let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  
  const { count, error } = await query;
  if (error) handleSupabaseError(error);
  return count || 0;
}

// Restaurant-scoped helpers
export async function findByRestaurant<T>(
  table: string,
  restaurantId: string,
  additionalFilters: Record<string, any> = {},
  options: {
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
  } = {}
): Promise<T[]> {
  return findMany<T>(table, { restaurant_id: restaurantId, ...additionalFilters }, options);
}

export async function insertForRestaurant<T>(
  table: string,
  restaurantId: string,
  record: Omit<Partial<T>, 'restaurant_id'>
): Promise<T> {
  return insertOne<T>(table, { ...record, restaurant_id: restaurantId } as unknown as Partial<T>);
}

export async function updateForRestaurant<T>(
  table: string,
  restaurantId: string,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  return updateOne<T>(table, id, { ...updates, restaurant_id: restaurantId } as Partial<T>);
}

export async function deleteForRestaurant(table: string, restaurantId: string, id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId);
  
  if (error) handleSupabaseError(error);
  return true;
}
