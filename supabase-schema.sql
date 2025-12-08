-- CPC MVP Database Schema for Supabase
-- Run this in the Supabase SQL Editor to set up all required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BUSINESSES TABLE (for onboarding submissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
    id BIGSERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    automations TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'contacted', 'onboarded', 'active'))
);

CREATE INDEX IF NOT EXISTS idx_businesses_email ON businesses(email);
CREATE INDEX IF NOT EXISTS idx_businesses_whatsapp ON businesses(whatsapp);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC);

-- ============================================================
-- USERS TABLE (WhatsApp users interacting with bot)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    wa_id VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(50),
    name VARCHAR(255),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_users_wa_id ON users(wa_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at DESC);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE DEFAULT 'ORD-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'),
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    wa_id VARCHAR(50) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_price INTEGER, -- Price in smallest currency unit (e.g., paisa)
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'placed',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT valid_order_status CHECK (status IN ('placed', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_orders_wa_id ON orders(wa_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================================
-- MENU ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
    id BIGSERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- Price in smallest currency unit
    category VARCHAR(100),
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);

-- Insert sample menu items
INSERT INTO menu_items (item_id, name, description, price, category, sort_order) VALUES
    ('ITEM_ZINGER', 'Zinger Burger', 'Crispy chicken burger with special sauce', 45000, 'Burgers', 1),
    ('ITEM_PIZZA', 'Pizza Slice', 'Fresh baked pizza slice with cheese', 35000, 'Pizza', 2),
    ('ITEM_FRIES', 'Fries', 'Golden crispy french fries', 20000, 'Sides', 3)
ON CONFLICT (item_id) DO NOTHING;

-- ============================================================
-- LEADS TABLE (captured from WhatsApp interactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY,
    wa_id VARCHAR(50) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    source VARCHAR(100) NOT NULL DEFAULT 'whatsapp',
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_interaction TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT valid_lead_status CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_wa_id ON leads(wa_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_captured_at ON leads(captured_at DESC);

-- ============================================================
-- MESSAGE LOGS TABLE (for debugging and analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS message_logs (
    id BIGSERIAL PRIMARY KEY,
    wa_id VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL, -- 'inbound' or 'outbound'
    message_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_logs_wa_id ON message_logs(wa_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_direction ON message_logs(direction);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON message_logs(created_at DESC);

-- Partition by date for better performance (optional for high-volume)
-- Consider adding partitioning if message volume is very high

-- ============================================================
-- PROCESSED MESSAGES TABLE (for deduplication)
-- ============================================================
CREATE TABLE IF NOT EXISTS processed_messages (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    wa_id VARCHAR(50) NOT NULL,
    message_type VARCHAR(50),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_message_id ON processed_messages(message_id);

-- Clean up old processed messages (older than 7 days) - run periodically
-- DELETE FROM processed_messages WHERE processed_at < NOW() - INTERVAL '7 days';

-- ============================================================
-- RATE LIMITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id BIGSERIAL PRIMARY KEY,
    wa_id VARCHAR(50) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    UNIQUE(wa_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_wa_id ON rate_limits(wa_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Clean up old rate limit records (older than 1 hour) - run periodically
-- DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';

-- ============================================================
-- ROW LEVEL SECURITY (Optional but recommended for production)
-- ============================================================
-- Enable RLS on sensitive tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (full access)
CREATE POLICY "Service role has full access to businesses" ON businesses
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to leads" ON leads
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTIONS (for auto-generating order numbers)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'ORD-' || LPAD(nextval('orders_id_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order number generation
DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- VIEWS (for analytics)
-- ============================================================
CREATE OR REPLACE VIEW business_stats AS
SELECT 
    business_type,
    status,
    COUNT(*) as count,
    DATE_TRUNC('day', created_at) as date
FROM businesses
GROUP BY business_type, status, DATE_TRUNC('day', created_at);

CREATE OR REPLACE VIEW daily_orders AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    status,
    COUNT(*) as count,
    SUM(item_price) as total_revenue
FROM orders
GROUP BY DATE_TRUNC('day', created_at), status;

CREATE OR REPLACE VIEW lead_funnel AS
SELECT 
    source,
    status,
    COUNT(*) as count,
    DATE_TRUNC('day', captured_at) as date
FROM leads
GROUP BY source, status, DATE_TRUNC('day', captured_at);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
-- Add any additional composite indexes based on query patterns

-- Example: For querying recent orders by status
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- Example: For querying businesses by type and status
CREATE INDEX IF NOT EXISTS idx_businesses_type_status ON businesses(business_type, status);

COMMENT ON TABLE businesses IS 'Stores business registration submissions from the landing page';
COMMENT ON TABLE users IS 'WhatsApp users who have interacted with the bot';
COMMENT ON TABLE orders IS 'Orders placed through the WhatsApp bot';
COMMENT ON TABLE menu_items IS 'Product catalog items available for ordering';
COMMENT ON TABLE leads IS 'Leads captured from WhatsApp interactions';
COMMENT ON TABLE message_logs IS 'Log of all WhatsApp messages for debugging and analytics';
COMMENT ON TABLE processed_messages IS 'Deduplication table for WhatsApp webhook messages';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking for WhatsApp users';
