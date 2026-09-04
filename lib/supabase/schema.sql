-- DineConnect Supabase PostgreSQL Schema
-- Migrated from SQLite with PostgreSQL optimizations
-- Run this in Supabase SQL Editor or via `supabase db query`

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- RESTAURANTS (Multi-tenant core)
-- ============================================
CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    currency TEXT NOT NULL DEFAULT 'PKR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    subscription_status TEXT DEFAULT 'paid' CHECK (subscription_status IN ('paid', 'due', 'overdue', 'suspended')),
    monthly_rate NUMERIC DEFAULT 5000,
    subscription_due_date TIMESTAMPTZ,
    last_payment_date TIMESTAMPTZ,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_restaurants_subscription ON restaurants(subscription_status);

-- ============================================
-- MENU ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_category ON menu_items(restaurant_id, category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(restaurant_id, is_available) WHERE is_available = TRUE;

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    name TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_phone ON customers(restaurant_id, phone_number);

-- ============================================
-- ORDERS
-- ============================================
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status order_status NOT NULL DEFAULT 'pending',
    total_amount NUMERIC NOT NULL,
    delivery_address TEXT,
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    payment_method TEXT DEFAULT 'Cash on Delivery',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    customizations TEXT,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant ON order_items(restaurant_id);

-- ============================================
-- USERS (Admin + Restaurant staff)
-- ============================================
CREATE TYPE user_role AS ENUM ('superadmin', 'restaurant');

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_restaurant ON users(restaurant_id);

-- ============================================
-- KNOWLEDGE BASE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_restaurant ON knowledge_base(restaurant_id, category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON knowledge_base(restaurant_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- CHAT MESSAGES (WhatsApp conversation history)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('customer', 'bot')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_phone ON chat_messages(restaurant_id, customer_phone, timestamp DESC);

-- ============================================
-- SUBSCRIPTION PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_payments (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 5000,
    payment_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_restaurant ON subscription_payments(restaurant_id, payment_date DESC);

-- ============================================
-- WHATSAPP AUTH STATE
-- Baileys credentials intentionally stay on the local bot host; this table only
-- records connection metadata for operational reporting.
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_auth_state (
    restaurant_id TEXT PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
    creds_json JSONB NOT NULL,
    keys_json JSONB,
    last_synced TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    connected_phone TEXT,
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'qr_ready', 'connected'))
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_auth_updated_at ON whatsapp_auth_state;
CREATE TRIGGER update_whatsapp_auth_updated_at BEFORE UPDATE ON whatsapp_auth_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_auth_state ENABLE ROW LEVEL SECURITY;

-- Superadmin can do everything (using service_role key bypasses RLS)
-- For anon/authenticated roles, we use JWT claims for restaurant isolation

-- Restaurants: superadmin sees all, restaurant users see only their own
CREATE POLICY "superadmin_all_restaurants" ON restaurants FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "restaurant_own_restaurant" ON restaurants FOR SELECT USING (id = (auth.jwt() ->> 'restaurant_id'));

-- Menu items
CREATE POLICY "superadmin_all_menu" ON menu_items FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "restaurant_own_menu" ON menu_items FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id'));

-- Customers
CREATE POLICY "superadmin_all_customers" ON customers FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "restaurant_own_customers" ON customers FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id'));

-- Orders
CREATE POLICY "superadmin_all_orders" ON orders FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "restaurant_own_orders" ON orders FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id'));

-- Order items
CREATE POLICY "superadmin_all_order_items" ON order_items FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "restaurant_own_order_items" ON order_items FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id'));

-- Users
CREATE POLICY "superadmin_all_users" ON users FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "restaurant_own_users" ON users FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id'));

-- Knowledge base
CREATE POLICY "superadmin_all_kb" ON knowledge_base FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "restaurant_own_kb" ON knowledge_base FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id'));

-- Chat messages
CREATE POLICY "superadmin_all_chat" ON chat_messages FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "restaurant_own_chat" ON chat_messages FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id'));

-- Subscription payments (superadmin only)
CREATE POLICY "superadmin_all_subscriptions" ON subscription_payments FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

-- WhatsApp auth (superadmin + restaurant owner)
CREATE POLICY "superadmin_all_wa_auth" ON whatsapp_auth_state FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');
CREATE POLICY "restaurant_own_wa_auth" ON whatsapp_auth_state FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id'));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate UUID-like IDs compatible with existing format
CREATE OR REPLACE FUNCTION gen_restaurant_id(base TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(base, '[^a-z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gen_prefixed_id(prefix TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN prefix || '_' || lower(substring(gen_random_uuid()::text FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEW FOR DASHBOARD STATS (Optimized)
-- ============================================
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    r.id AS restaurant_id,
    r.name AS restaurant_name,
    r.currency,
    COALESCE(today.orders_count, 0) AS orders_today,
    COALESCE(today.revenue_sum, 0) AS revenue_today,
    COALESCE(today.average_amount, 0) AS average_order,
    COALESCE(active_conv.count, 0) AS active_conversations,
    jsonb_build_object(
        'pending', COALESCE(status_agg.pending, 0),
        'confirmed', COALESCE(status_agg.confirmed, 0),
        'preparing', COALESCE(status_agg.preparing, 0),
        'completed', COALESCE(status_agg.completed, 0),
        'cancelled', COALESCE(status_agg.cancelled, 0)
    ) AS live_flow,
    top_items.items AS top_items,
    recent_orders.orders AS recent_orders
FROM restaurants r
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS orders_count,
        COALESCE(SUM(CASE WHEN status IN ('confirmed', 'preparing', 'completed') THEN total_amount ELSE 0 END), 0) AS revenue_sum,
        COALESCE(AVG(CASE WHEN status IN ('confirmed', 'preparing', 'completed') THEN total_amount END), 0) AS average_amount
    FROM orders
    WHERE restaurant_id = r.id
      AND created_at >= date_trunc('day', NOW()) AT TIME ZONE 'UTC'
) today ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(DISTINCT customer_phone) AS count
    FROM chat_messages
    WHERE restaurant_id = r.id
      AND timestamp >= NOW() - INTERVAL '24 hours'
) active_conv ON TRUE
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
        COUNT(*) FILTER (WHERE status = 'preparing') AS preparing,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
    FROM orders
    WHERE restaurant_id = r.id
) status_agg ON TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
        'name', item_name,
        'category', COALESCE(mi.category, 'Menu Item'),
        'totalQuantity', total_qty,
        'totalRevenue', total_rev
    ) ORDER BY total_qty DESC LIMIT 5) AS items
    FROM (
        SELECT
            oi.item_name,
            SUM(oi.quantity) AS total_qty,
            SUM(oi.total_price) AS total_rev
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.restaurant_id = r.id
          AND o.status IN ('confirmed', 'preparing', 'completed')
        GROUP BY oi.item_name
    ) sub
) top_items ON TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'customer_name', c.name,
        'customer_phone', c.phone_number,
        'status', o.status,
        'total_amount', o.total_amount,
        'created_at', o.created_at,
        'items', items_json
    ) ORDER BY o.created_at DESC LIMIT 10) AS orders
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'customizations', oi.customizations,
            'total_price', oi.total_price
        )) AS items_json
        FROM order_items oi
        WHERE oi.order_id = o.id
    ) items ON TRUE
    WHERE o.restaurant_id = r.id
) recent_orders ON TRUE
WHERE r.is_active = TRUE;
