import {
  supabaseAdmin,
  findById,
  findMany,
  updateOne,
  deleteOne,
  findByRestaurant,
  insertForRestaurant,
  generateId,
  getNowISO,
} from './db';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// --- Type Definitions ---

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: 'superadmin' | 'restaurant';
  restaurant_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseItem {
  id: string;
  restaurant_id: string;
  title: string;
  category: string;
  content: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currency: string;
  is_active: number;
  subscription_status?: 'paid' | 'due' | 'overdue' | 'suspended';
  monthly_rate?: number;
  subscription_due_date?: string | null;
  last_payment_date?: string | null;
  is_suspended?: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  restaurant_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  phone_number: string;
  name: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  customizations: string | null;
  total_price: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_address: string | null;
  notes: string | null;
  idempotency_key: string | null;
  payment_method?: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  items?: OrderItem[];
}

export interface ChatMessage {
  id: string;
  restaurant_id: string;
  customer_phone: string;
  role: 'customer' | 'bot';
  content: string;
  timestamp: string;
}

export interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  activeConversations: number;
  averageOrder: number;
  currency: string;
  liveFlow: {
    pending: number;
    confirmed: number;
    preparing: number;
    completed: number;
    cancelled: number;
  };
  topItems: Array<{
    name: string;
    category: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  recentOrders: Order[];
}

function normalizeRestaurant(row: Restaurant | null): Restaurant | null {
  return row;
}

function normalizeMenuItem(row: MenuItem | null): MenuItem | null {
  return row;
}

function normalizeKnowledgeBaseItem(row: KnowledgeBaseItem | null): KnowledgeBaseItem | null {
  return row;
}

function normalizeOrder(row: Order | null): Order | null {
  return row;
}

function normalizeOrderItem(row: OrderItem): OrderItem {
  return row;
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const rows = await findMany<Restaurant>('restaurants', {}, { orderBy: 'created_at', ascending: true });
  return rows.map((row) => normalizeRestaurant(row)!);
}

export const getRestaurants = getAllRestaurants;

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  return normalizeRestaurant(await findById<Restaurant>('restaurants', id));
}

export async function createRestaurant(restaurant: {
  id?: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  currency?: string;
  is_active?: number;
}): Promise<Restaurant> {
  const slugId = restaurant.id || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || generateId('rest');
  return upsertRestaurant({
    ...restaurant,
    id: slugId,
  });
}

export async function upsertRestaurant(restaurant: {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  currency?: string;
  is_active?: number;
}): Promise<Restaurant> {
  const now = getNowISO();
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .upsert({
      id: restaurant.id,
      name: restaurant.name,
      phone: restaurant.phone ?? null,
      address: restaurant.address ?? null,
      currency: restaurant.currency ?? 'PKR',
      is_active: restaurant.is_active ?? true,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return normalizeRestaurant(data as Restaurant)!;
}

// --- Menu Item Queries ---

export async function getMenuItems(restaurantId: string, options?: { category?: string; availableOnly?: boolean }): Promise<MenuItem[]> {
  const filters: Record<string, any> = {};
  if (options?.availableOnly) filters.is_available = true;
  if (options?.category) filters.category = options.category;

  const items = await findByRestaurant<MenuItem>('menu_items', restaurantId, filters, { orderBy: 'category', ascending: true });
  return items.map((item) => normalizeMenuItem(item)!);
}

export async function getMenuItemById(id: string): Promise<MenuItem | null> {
  return normalizeMenuItem(await findById<MenuItem>('menu_items', id));
}

export async function createMenuItem(item: {
  id?: string;
  restaurant_id: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  is_available?: number;
}): Promise<MenuItem> {
  const now = getNowISO();
  const record = await insertForRestaurant<MenuItem>('menu_items', item.restaurant_id, {
    id: item.id || generateId('item'),
    name: item.name,
    description: item.description ?? null,
    price: item.price,
    category: item.category,
    is_available: (item.is_available ?? true) as unknown as number,
    created_at: now,
    updated_at: now,
  });
  return normalizeMenuItem(record)!;
}

export async function updateMenuItem(
  id: string,
  updates: Partial<Pick<MenuItem, 'name' | 'description' | 'price' | 'category' | 'is_available'>>
): Promise<MenuItem | null> {
  const updatePayload: Record<string, any> = { updated_at: getNowISO() };
  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.description !== undefined) updatePayload.description = updates.description;
  if (updates.price !== undefined) updatePayload.price = updates.price;
  if (updates.category !== undefined) updatePayload.category = updates.category;
  if (updates.is_available !== undefined) updatePayload.is_available = updates.is_available;

  return normalizeMenuItem(await updateOne<MenuItem>('menu_items', id, updatePayload as Partial<MenuItem>));
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const current = await getMenuItemById(id);
  if (!current) return false;
  return deleteOne('menu_items', id);
}

// --- Customer Queries ---

export async function getOrCreateCustomer(
  restaurantId: string,
  phoneNumber: string,
  name?: string | null,
  address?: string | null
): Promise<Customer> {
  const normalizedPhone = phoneNumber.replace(/[^0-9+]/g, '');
  const now = getNowISO();
  const existingRows = await findByRestaurant<Customer>('customers', restaurantId, { phone_number: normalizedPhone }, { limit: 1 });
  const existing = existingRows[0] || null;

  if (existing) {
    if ((name && name !== existing.name) || (address && address !== existing.address)) {
      return (await updateOne<Customer>('customers', existing.id, {
        name: name ?? existing.name,
        address: address ?? existing.address,
        updated_at: now,
      }))!;
    }
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .upsert({
      id: generateId('cust'),
      restaurant_id: restaurantId,
      phone_number: normalizedPhone,
      name: name ?? null,
      address: address ?? null,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'restaurant_id,phone_number' })
    .select()
    .single();

  if (error) throw error;
  return data as Customer;
}

// --- Order Queries ---

export interface CreateOrderParams {
  id?: string;
  restaurant_id: string;
  customer_id: string;
  status?: OrderStatus;
  total_amount: number;
  delivery_address?: string | null;
  notes?: string | null;
  idempotency_key?: string | null;
  payment_method?: string | null;
  items: Array<{
    menu_item_id?: string | null;
    item_name: string;
    quantity: number;
    unit_price: number;
    customizations?: string | null;
    total_price: number;
  }>;
}

export async function createOrder(params: CreateOrderParams): Promise<Order> {
  if (params.idempotency_key) {
    const existingRows = await findMany<Order>('orders', { idempotency_key: params.idempotency_key }, { limit: 1 });
    if (existingRows[0]) {
      return (await getOrderById(existingRows[0].id))!;
    }
  }

  const orderId = params.id || generateId('ord');
  const now = getNowISO();
  await insertForRestaurant<Order>('orders', params.restaurant_id, {
    id: orderId,
    customer_id: params.customer_id,
    status: params.status ?? 'pending',
    total_amount: params.total_amount,
    delivery_address: params.delivery_address ?? null,
    notes: params.notes ?? null,
    idempotency_key: params.idempotency_key ?? null,
    payment_method: params.payment_method ?? 'Cash on Delivery',
    created_at: now,
    updated_at: now,
  });

  await Promise.all(params.items.map((item) => insertForRestaurant<OrderItem>('order_items', params.restaurant_id, {
    id: generateId('oi'),
    order_id: orderId,
    menu_item_id: item.menu_item_id ?? null,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    customizations: item.customizations ?? null,
    total_price: item.total_price,
  })));

  return (await getOrderById(orderId))!;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, customers(name, phone_number)')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const order = normalizeOrder({
    ...(data as any),
    customer_name: (data as any).customers?.name ?? null,
    customer_phone: (data as any).customers?.phone_number ?? null,
  } as Order)!;
  const items = await findMany<OrderItem>('order_items', { order_id: orderId }, { orderBy: 'created_at', ascending: true });
  order.items = items.map(normalizeOrderItem);
  return order;
}

export async function getOrders(restaurantId: string, options?: { status?: OrderStatus; limit?: number }): Promise<Order[]> {
  let query = supabaseAdmin
    .from('orders')
    .select('*, customers(name, phone_number)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (options?.status) query = query.eq('status', options.status);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;

  const orders = ((data || []) as any[]).map((row) => normalizeOrder({
    ...row,
    customer_name: row.customers?.name ?? null,
    customer_phone: row.customers?.phone_number ?? null,
  } as Order)!);

  await Promise.all(orders.map(async (order) => {
    const items = await findMany<OrderItem>('order_items', { order_id: order.id }, { orderBy: 'created_at', ascending: true });
    order.items = items.map(normalizeOrderItem);
  }));

  return orders;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
  await updateOne<Order>('orders', orderId, { status, updated_at: getNowISO() });
  return getOrderById(orderId);
}

export async function getLatestOrderByCustomerPhone(restaurantId: string, phone: string): Promise<Order | null> {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const suffix = cleanPhone.slice(-8);
  const customers = await findByRestaurant<Customer>('customers', restaurantId);
  const customerIds = customers
    .filter((customer) =>
      customer.phone_number === cleanPhone ||
      customer.phone_number.includes(suffix) ||
      cleanPhone.includes(customer.phone_number)
    )
    .map((customer) => customer.id);

  if (customerIds.length === 0) return null;

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ? getOrderById(data.id) : null;
}

export async function updateOrderDetails(params: {
  orderId: string;
  delivery_address?: string;
  customer_phone?: string;
  payment_method?: 'Cash on Delivery' | 'Online Payment';
  status?: OrderStatus;
  notes?: string;
}): Promise<Order | null> {
  const existing = await getOrderById(params.orderId);
  if (!existing) return null;

  const updates: Partial<Order> = { updated_at: getNowISO() };
  if (params.delivery_address !== undefined) updates.delivery_address = params.delivery_address;
  if (params.payment_method !== undefined) updates.payment_method = params.payment_method;
  if (params.status !== undefined) updates.status = params.status;
  if (params.notes !== undefined) updates.notes = params.notes;

  await updateOne<Order>('orders', params.orderId, updates);

  if (params.customer_phone) {
    const cleanPhone = params.customer_phone.trim();
    const newCust = await getOrCreateCustomer(existing.restaurant_id, cleanPhone, existing.customer_name);
    await updateOne<Order>('orders', params.orderId, { customer_id: newCust.id, updated_at: getNowISO() });
  }

  return getOrderById(params.orderId);
}

// --- Dashboard & Analytics Queries ---

export async function getDashboardStats(restaurantId: string): Promise<DashboardStats> {
  const restaurant = await getRestaurant(restaurantId);
  const currency = restaurant?.currency ?? 'PKR';
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartStr = todayStart.toISOString();
  const activeSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: todayOrders, error: todayErr }, activeConversations, allOrders, orderItems, menuItems] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('status,total_amount')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', todayStartStr),
    countDistinctChatCustomers(restaurantId, activeSince),
    findByRestaurant<Order>('orders', restaurantId),
    findByRestaurant<OrderItem>('order_items', restaurantId),
    findByRestaurant<MenuItem>('menu_items', restaurantId),
  ]);

  if (todayErr) throw todayErr;

  const revenueStatuses = new Set<OrderStatus>(['confirmed', 'preparing', 'completed']);
  const revenueOrders = ((todayOrders || []) as Array<{ status: OrderStatus; total_amount: number }>)
    .filter((order) => revenueStatuses.has(order.status));
  const revenueToday = revenueOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);

  const liveFlow = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const order of allOrders) {
    if (order.status in liveFlow) liveFlow[order.status] += 1;
  }

  const menuById = new Map(menuItems.map((item) => [item.id, normalizeMenuItem(item)!]));
  const orderStatusById = new Map(allOrders.map((order) => [order.id, order.status]));
  const topByName = new Map<string, { name: string; category: string; totalQuantity: number; totalRevenue: number }>();

  for (const item of orderItems.map(normalizeOrderItem)) {
    if (!revenueStatuses.has(orderStatusById.get(item.order_id) as OrderStatus)) continue;
    const category = item.menu_item_id ? menuById.get(item.menu_item_id)?.category : undefined;
    const current = topByName.get(item.item_name) || {
      name: item.item_name,
      category: category || 'Menu Item',
      totalQuantity: 0,
      totalRevenue: 0,
    };
    current.totalQuantity += item.quantity;
    current.totalRevenue += item.total_price;
    topByName.set(item.item_name, current);
  }

  const topItems = Array.from(topByName.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 5)
    .map((item) => ({ ...item, totalRevenue: Number(item.totalRevenue.toFixed(2)) }));

  const recentOrders = await getOrders(restaurantId, { limit: 10 });

  return {
    ordersToday: todayOrders?.length ?? 0,
    revenueToday: Number(revenueToday.toFixed(2)),
    activeConversations,
    averageOrder: Number((revenueOrders.length ? revenueToday / revenueOrders.length : 0).toFixed(2)),
    currency,
    liveFlow,
    topItems,
    recentOrders,
  };
}

async function countDistinctChatCustomers(restaurantId: string, since: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('customer_phone')
    .eq('restaurant_id', restaurantId)
    .gte('timestamp', since);

  if (error) throw error;
  return new Set((data || []).map((row) => row.customer_phone)).size;
}

// --- Chat Messages Queries ---

export async function saveChatMessage(
  restaurantId: string,
  customerPhone: string,
  role: 'customer' | 'bot',
  content: string
): Promise<ChatMessage> {
  const timestamp = getNowISO();
  return insertForRestaurant<ChatMessage>('chat_messages', restaurantId, {
    id: generateId('msg'),
    customer_phone: customerPhone,
    role,
    content,
    timestamp,
  });
}

export async function getChatHistory(restaurantId: string, customerPhone: string, limit = 50): Promise<ChatMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('customer_phone', customerPhone)
    .order('timestamp', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ChatMessage[];
}

export async function getRecentConversations(restaurantId: string, limit = 20): Promise<Array<{
  customer_phone: string;
  customer_name: string | null;
  last_message: string;
  last_timestamp: string;
  message_count: number;
}>> {
  const [messages, customers] = await Promise.all([
    findByRestaurant<ChatMessage>('chat_messages', restaurantId, {}, { orderBy: 'timestamp', ascending: false }),
    findByRestaurant<Customer>('customers', restaurantId),
  ]);
  const customerNameByPhone = new Map(customers.map((customer) => [customer.phone_number, customer.name]));
  const grouped = new Map<string, {
    customer_phone: string;
    customer_name: string | null;
    last_message: string;
    last_timestamp: string;
    message_count: number;
  }>();

  for (const message of messages) {
    const current = grouped.get(message.customer_phone);
    if (!current) {
      grouped.set(message.customer_phone, {
        customer_phone: message.customer_phone,
        customer_name: customerNameByPhone.get(message.customer_phone) ?? null,
        last_message: message.content,
        last_timestamp: message.timestamp,
        message_count: 1,
      });
    } else {
      current.message_count += 1;
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.last_timestamp.localeCompare(a.last_timestamp))
    .slice(0, limit);
}

// --- Password & Authentication Helpers ---

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    // Fail-safe for plain text fallback if needed during dev/test
    return password === storedHash;
  }
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const testKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return testKey === key;
}

// --- User Management Queries ---

export async function getUserByUsername(username: string): Promise<User | null> {
  const normalized = username.trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .ilike('username', normalized)
    .maybeSingle();

  if (error) throw error;
  return data as User | null;
}

export async function getUserById(id: string): Promise<User | null> {
  return findById<User>('users', id);
}

export async function createUser(user: {
  id?: string;
  username: string;
  password: string;
  role: 'superadmin' | 'restaurant';
  restaurant_id?: string | null;
  name: string;
}): Promise<User> {
  const now = getNowISO();
  const normalizedUsername = user.username.trim().toLowerCase();
  const password_hash = hashPassword(user.password);
  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert({
      id: user.id || generateId('usr'),
      username: normalizedUsername,
      password_hash,
      role: user.role,
      restaurant_id: user.restaurant_id ?? null,
      name: user.name,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'username' })
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function getRestaurantUsers(restaurantId: string): Promise<User[]> {
  return findByRestaurant<User>('users', restaurantId, {}, { orderBy: 'created_at', ascending: true });
}

export async function getAllUsers(): Promise<User[]> {
  return findMany<User>('users', {}, { orderBy: 'created_at', ascending: true });
}

export async function deleteUser(id: string): Promise<boolean> {
  const current = await getUserById(id);
  if (!current) return false;
  return deleteOne('users', id);
}

// --- Menu Categories Queries ---

export async function getRestaurantCategories(restaurantId: string): Promise<string[]> {
  const rows = await findByRestaurant<MenuItem>('menu_items', restaurantId, {}, { orderBy: 'category', ascending: true });
  const existing = rows.map((row) => row.category).filter(Boolean);
  const standard = ['Burgers', 'Sides', 'Drinks', 'Desserts'];
  const set = new Set([...existing]);
  if (set.size === 0) standard.forEach((category) => set.add(category));
  return Array.from(set);
}

// --- Knowledge Base Queries ---

export async function getKnowledgeBaseItems(
  restaurantId: string,
  options?: { category?: string; activeOnly?: boolean }
): Promise<KnowledgeBaseItem[]> {
  const filters: Record<string, any> = {};
  if (options?.activeOnly) filters.is_active = true;
  if (options?.category && options.category !== 'all') filters.category = options.category;
  const items = await findByRestaurant<KnowledgeBaseItem>('knowledge_base', restaurantId, filters, { orderBy: 'created_at', ascending: false });
  return items.map((item) => normalizeKnowledgeBaseItem(item)!);
}

export async function getKnowledgeBaseItemById(id: string): Promise<KnowledgeBaseItem | null> {
  return normalizeKnowledgeBaseItem(await findById<KnowledgeBaseItem>('knowledge_base', id));
}

export async function createKnowledgeBaseItem(item: {
  id?: string;
  restaurant_id: string;
  title: string;
  category: string;
  content: string;
  is_active?: number;
}): Promise<KnowledgeBaseItem> {
  const now = getNowISO();
  const record = await insertForRestaurant<KnowledgeBaseItem>('knowledge_base', item.restaurant_id, {
    id: item.id || generateId('kb'),
    title: item.title,
    category: item.category,
    content: item.content,
    is_active: (item.is_active ?? true) as unknown as number,
    created_at: now,
    updated_at: now,
  });
  return normalizeKnowledgeBaseItem(record)!;
}

export async function updateKnowledgeBaseItem(
  id: string,
  updates: Partial<Pick<KnowledgeBaseItem, 'title' | 'category' | 'content' | 'is_active'>>
): Promise<KnowledgeBaseItem | null> {
  const updatePayload: Record<string, any> = { updated_at: getNowISO() };
  if (updates.title !== undefined) updatePayload.title = updates.title;
  if (updates.category !== undefined) updatePayload.category = updates.category;
  if (updates.content !== undefined) updatePayload.content = updates.content;
  if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;
  return normalizeKnowledgeBaseItem(await updateOne<KnowledgeBaseItem>('knowledge_base', id, updatePayload as Partial<KnowledgeBaseItem>));
}

export async function deleteKnowledgeBaseItem(id: string): Promise<boolean> {
  const current = await getKnowledgeBaseItemById(id);
  if (!current) return false;
  return deleteOne('knowledge_base', id);
}

// --- Complete Restaurant Wipe / Deletion ---

export async function deleteRestaurantCompletely(restaurantId: string): Promise<boolean> {
  try {
    const authDir = path.join(process.cwd(), 'data', 'whatsapp-auth', restaurantId);
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  } catch (fsErr) {
    console.error(`Failed to remove whatsapp auth dir for ${restaurantId}:`, fsErr);
  }

  // Delete dependent rows before their parent rows so this also works against
  // deployments where foreign-key cascades have not yet been applied.
  await deleteRestaurantRows('order_items', restaurantId);
  await deleteRestaurantRows('orders', restaurantId);
  await deleteRestaurantRows('chat_messages', restaurantId);
  await deleteRestaurantRows('subscription_payments', restaurantId);
  await deleteRestaurantRows('whatsapp_auth_state', restaurantId);
  await deleteRestaurantRows('customers', restaurantId);
  await deleteRestaurantRows('menu_items', restaurantId);
  await deleteRestaurantRows('knowledge_base', restaurantId);
  await deleteRestaurantRows('users', restaurantId);
  await deleteOne('restaurants', restaurantId);
  return true;
}

async function deleteRestaurantRows(table: string, restaurantId: string): Promise<void> {
  const { error } = await supabaseAdmin.from(table).delete().eq('restaurant_id', restaurantId);
  if (error) throw error;
}

// --- SaaS Subscription & Billing Management ---

export interface SubscriptionStatusInfo {
  status: 'paid' | 'due' | 'overdue' | 'suspended';
  dueDate: string;
  daysRemaining: number;
  daysOverdue: number;
  isSuspended: boolean;
  monthlyRate: number;
  lastPaymentDate: string | null;
  reminderNotice: string | null;
}

export async function checkAndUpdateRestaurantSubscription(restaurantId: string): Promise<SubscriptionStatusInfo> {
  const restaurant = await getRestaurant(restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  const now = new Date();
  const nowMs = now.getTime();
  const monthlyRate = restaurant.monthly_rate || 5000;

  let dueDateMs: number;
  if (!restaurant.subscription_due_date) {
    const createdAtMs = new Date(restaurant.created_at).getTime();
    dueDateMs = createdAtMs + 30 * 24 * 60 * 60 * 1000;
    await updateOne<Restaurant>('restaurants', restaurantId, {
      subscription_due_date: new Date(dueDateMs).toISOString(),
      monthly_rate: monthlyRate,
    });
  } else {
    dueDateMs = new Date(restaurant.subscription_due_date).getTime();
  }

  const diffMs = dueDateMs - nowMs;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let status: 'paid' | 'due' | 'overdue' | 'suspended' = 'paid';
  let isSuspended = false;
  let reminderNotice: string | null = null;

  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    const overdueDays = Math.floor(overdueHours / 24);

    if (overdueDays >= 2) {
      status = 'suspended';
      isSuspended = true;
      reminderNotice = `Your account is suspended because payment is overdue by ${overdueDays} days. WhatsApp bot and kitchen desk are locked. Please settle payment to restore operations.`;
    } else {
      status = 'overdue';
      reminderNotice = `Urgent: Monthly subscription payment is overdue. You have ${2 - overdueDays} day(s) before automated service suspension.`;
    }
  } else if (diffDays <= 2) {
    status = 'due';
    reminderNotice = diffDays === 0
      ? `Reminder: Monthly subscription (PKR ${monthlyRate.toLocaleString()}) is due today! Please complete payment to avoid interruption.`
      : `Reminder: Monthly subscription (PKR ${monthlyRate.toLocaleString()}) is due in ${diffDays} day${diffDays > 1 ? 's' : ''}. Please renew on time!`;
  }

  await updateOne<Restaurant>('restaurants', restaurantId, {
    subscription_status: status,
    is_suspended: isSuspended as any,
    updated_at: now.toISOString(),
  });

  return {
    status,
    dueDate: new Date(dueDateMs).toISOString(),
    daysRemaining: Math.max(0, diffDays),
    daysOverdue: diffMs < 0 ? Math.floor(Math.abs(diffHours) / 24) : 0,
    isSuspended,
    monthlyRate,
    lastPaymentDate: restaurant.last_payment_date || null,
    reminderNotice,
  };
}

export async function recordSubscriptionPayment(params: {
  restaurantId: string;
  amount?: number;
  notes?: string;
  paymentDate?: string;
}): Promise<boolean> {
  const restaurant = await getRestaurant(params.restaurantId);
  if (!restaurant) return false;

  const payDateObj = params.paymentDate ? new Date(params.paymentDate) : new Date();
  const paymentDateStr = payDateObj.toISOString();
  const amount = params.amount || restaurant.monthly_rate || 5000;

  let baseDate = payDateObj.getTime();
  if (restaurant.subscription_due_date) {
    const currDue = new Date(restaurant.subscription_due_date).getTime();
    if (currDue > baseDate) baseDate = currDue;
  }
  const nextDueDate = new Date(baseDate + 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = getNowISO();

  await insertForRestaurant<SubscriptionPayment>('subscription_payments', params.restaurantId, {
    id: generateId('sub'),
    amount,
    payment_date: paymentDateStr,
    notes: params.notes || 'Monthly Subscription Payment (5,000 PKR)',
    created_at: now,
  });

  await updateOne<Restaurant>('restaurants', params.restaurantId, {
    subscription_status: 'paid',
    subscription_due_date: nextDueDate,
    last_payment_date: paymentDateStr,
    is_suspended: false as any,
    updated_at: now,
  });

  return true;
}

export async function setRestaurantSubscriptionSuspension(restaurantId: string, suspend: boolean): Promise<boolean> {
  await updateOne<Restaurant>('restaurants', restaurantId, {
    is_suspended: suspend as any,
    subscription_status: suspend ? 'suspended' : 'paid',
    updated_at: getNowISO(),
  });
  return true;
}

export async function getSaaSRevenueStats() {
  const [payments, restaurants] = await Promise.all([
    findMany<SubscriptionPayment>('subscription_payments'),
    getRestaurants(),
  ]);
  let paidCount = 0;
  let dueCount = 0;
  let overdueCount = 0;
  let suspendedCount = 0;
  let mrr = 0;

  for (const r of restaurants) {
    const sub = await checkAndUpdateRestaurantSubscription(r.id);
    mrr += sub.monthlyRate;
    if (sub.isSuspended) suspendedCount++;
    else if (sub.status === 'overdue') overdueCount++;
    else if (sub.status === 'due') dueCount++;
    else paidCount++;
  }

  return {
    totalRevenue: payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    monthlyRecurringRevenue: mrr,
    totalRestaurants: restaurants.length,
    paidCount,
    dueCount,
    overdueCount,
    suspendedCount,
  };
}
