/*
# Restaurant POS System - Complete Database Schema

Creates the full schema for a restaurant Point-of-Sale system covering dine-in, takeaway, and delivery channels, with menu management, modifiers, table management, customer/driver records, shift/cash reconciliation, printer configuration, staff users, and Z-report data.

## New Tables
1. `categories` - Menu categories
2. `menu_items` - Individual menu items with price, availability, category
3. `modifiers` - Add-on options for menu items (paid additions or free notes)
4. `restaurant_tables` - Physical tables for dine-in with status
5. `delivery_zones` - Delivery areas with fees
6. `customers` - Delivery/takeaway customer records
7. `drivers` - Delivery drivers
8. `staff` - Staff users with roles (waiter, cashier, manager)
9. `shifts` - Work shifts with opening/closing cash reconciliation
10. `orders` - Main order record (dine-in/takeaway/delivery) with lifecycle status
11. `order_items` - Individual line items in an order
12. `printers` - Hardware printer configuration
13. `settings` - General restaurant settings
14. `voided_items` - Audit trail for voided/cancelled order items

## Security
- RLS enabled on all tables.
- Single-tenant app (no Supabase auth) - policies use `TO anon, authenticated` with `USING (true)` since all data is intentionally shared within the restaurant.
*/

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_categories" ON categories;
CREATE POLICY "anon_crud_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE TO anon, authenticated USING (true);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  station text DEFAULT 'kitchen',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_menu_items" ON menu_items;
CREATE POLICY "anon_crud_menu_items" ON menu_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_menu_items" ON menu_items;
CREATE POLICY "anon_insert_menu_items" ON menu_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_menu_items" ON menu_items;
CREATE POLICY "anon_update_menu_items" ON menu_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_menu_items" ON menu_items;
CREATE POLICY "anon_delete_menu_items" ON menu_items FOR DELETE TO anon, authenticated USING (true);

-- Modifiers
CREATE TABLE IF NOT EXISTS modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_note boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_modifiers" ON modifiers;
CREATE POLICY "anon_crud_modifiers" ON modifiers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_modifiers" ON modifiers;
CREATE POLICY "anon_insert_modifiers" ON modifiers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_modifiers" ON modifiers;
CREATE POLICY "anon_update_modifiers" ON modifiers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_modifiers" ON modifiers;
CREATE POLICY "anon_delete_modifiers" ON modifiers FOR DELETE TO anon, authenticated USING (true);

-- Restaurant Tables
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  seats int NOT NULL DEFAULT 4,
  zone text,
  status text NOT NULL DEFAULT 'free',
  current_order_id uuid,
  occupied_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_tables" ON restaurant_tables;
CREATE POLICY "anon_crud_tables" ON restaurant_tables FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tables" ON restaurant_tables;
CREATE POLICY "anon_insert_tables" ON restaurant_tables FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tables" ON restaurant_tables;
CREATE POLICY "anon_update_tables" ON restaurant_tables FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tables" ON restaurant_tables;
CREATE POLICY "anon_delete_tables" ON restaurant_tables FOR DELETE TO anon, authenticated USING (true);

-- Delivery Zones
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_zones" ON delivery_zones;
CREATE POLICY "anon_crud_zones" ON delivery_zones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_zones" ON delivery_zones;
CREATE POLICY "anon_insert_zones" ON delivery_zones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_zones" ON delivery_zones;
CREATE POLICY "anon_update_zones" ON delivery_zones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_zones" ON delivery_zones;
CREATE POLICY "anon_delete_zones" ON delivery_zones FOR DELETE TO anon, authenticated USING (true);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  address text,
  zone_id uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,
  total_orders int NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_customers" ON customers;
CREATE POLICY "anon_crud_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_drivers" ON drivers;
CREATE POLICY "anon_crud_drivers" ON drivers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_drivers" ON drivers;
CREATE POLICY "anon_insert_drivers" ON drivers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_drivers" ON drivers;
CREATE POLICY "anon_update_drivers" ON drivers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_drivers" ON drivers;
CREATE POLICY "anon_delete_drivers" ON drivers FOR DELETE TO anon, authenticated USING (true);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'waiter',
  pin text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_staff" ON staff;
CREATE POLICY "anon_crud_staff" ON staff FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_staff" ON staff;
CREATE POLICY "anon_insert_staff" ON staff FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_staff" ON staff;
CREATE POLICY "anon_update_staff" ON staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_staff" ON staff;
CREATE POLICY "anon_delete_staff" ON staff FOR DELETE TO anon, authenticated USING (true);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_number int NOT NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name text,
  opening_cash numeric(12,2) NOT NULL DEFAULT 0,
  closing_cash numeric(12,2) NOT NULL DEFAULT 0,
  expected_cash numeric(12,2) NOT NULL DEFAULT 0,
  cash_difference numeric(12,2) NOT NULL DEFAULT 0,
  total_sales numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz
);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_shifts" ON shifts;
CREATE POLICY "anon_crud_shifts" ON shifts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_shifts" ON shifts;
CREATE POLICY "anon_insert_shifts" ON shifts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_shifts" ON shifts;
CREATE POLICY "anon_update_shifts" ON shifts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_shifts" ON shifts;
CREATE POLICY "anon_delete_shifts" ON shifts FOR DELETE TO anon, authenticated USING (true);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number int NOT NULL,
  channel text NOT NULL DEFAULT 'dine_in',
  status text NOT NULL DEFAULT 'open',
  table_id uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  table_label text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  customer_address text,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  driver_name text,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'unpaid',
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  sent_to_kitchen_at timestamptz,
  paid_at timestamptz,
  eta_minutes int,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_orders" ON orders;
CREATE POLICY "anon_crud_orders" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE TO anon, authenticated USING (true);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_fr text NOT NULL,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  modifiers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  printed boolean NOT NULL DEFAULT false,
  voided boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_order_items" ON order_items;
CREATE POLICY "anon_crud_order_items" ON order_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
CREATE POLICY "anon_update_order_items" ON order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
CREATE POLICY "anon_delete_order_items" ON order_items FOR DELETE TO anon, authenticated USING (true);

-- Printers
CREATE TABLE IF NOT EXISTS printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  connection_type text NOT NULL DEFAULT 'network',
  ip_address text,
  port int DEFAULT 9100,
  usb_vendor_id text,
  usb_product_id text,
  bluetooth_id text,
  paper_width int NOT NULL DEFAULT 80,
  auto_cutter boolean NOT NULL DEFAULT true,
  station text NOT NULL DEFAULT 'cashier',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_printers" ON printers;
CREATE POLICY "anon_crud_printers" ON printers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_printers" ON printers;
CREATE POLICY "anon_insert_printers" ON printers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_printers" ON printers;
CREATE POLICY "anon_update_printers" ON printers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_printers" ON printers;
CREATE POLICY "anon_delete_printers" ON printers FOR DELETE TO anon, authenticated USING (true);

-- Settings (single row)
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1,
  restaurant_name text NOT NULL DEFAULT 'My Restaurant',
  logo_url text,
  currency text NOT NULL DEFAULT 'DZD',
  currency_symbol text NOT NULL DEFAULT 'دج',
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  language text NOT NULL DEFAULT 'ar',
  phone text,
  address text,
  footer_receipt text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_settings" ON settings;
CREATE POLICY "anon_crud_settings" ON settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Voided items audit
CREATE TABLE IF NOT EXISTS voided_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id uuid,
  name_ar text,
  reason text,
  voided_by text,
  voided_at timestamptz DEFAULT now()
);
ALTER TABLE voided_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_voided" ON voided_items;
CREATE POLICY "anon_crud_voided" ON voided_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_voided" ON voided_items;
CREATE POLICY "anon_insert_voided" ON voided_items FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- Seed default settings
INSERT INTO settings (id, restaurant_name, currency, currency_symbol, tax_rate, language)
VALUES (1, 'مطعمي', 'DZD', 'دج', 0, 'ar')
ON CONFLICT (id) DO NOTHING;

-- Seed default categories
INSERT INTO categories (name_ar, name_fr, sort_order) VALUES
('برغر', 'Burgers', 1),
('بيتزا', 'Pizza', 2),
('مشروبات', 'Boissons', 3),
('حلويات', 'Desserts', 4),
('أطباق جانبية', 'Accompagnements', 5)
ON CONFLICT DO NOTHING;

-- Seed sample menu items
INSERT INTO menu_items (category_id, name_ar, name_fr, price, available, sort_order, station)
SELECT c.id, 'برغر لحم كلاسيكي', 'Classic Beef Burger', 450.00, true, 1, 'kitchen' FROM categories c WHERE c.name_ar = 'برغر'
ON CONFLICT DO NOTHING;
INSERT INTO menu_items (category_id, name_ar, name_fr, price, available, sort_order, station)
SELECT c.id, 'برغر دجاج', 'Chicken Burger', 400.00, true, 2, 'kitchen' FROM categories c WHERE c.name_ar = 'برغر'
ON CONFLICT DO NOTHING;
INSERT INTO menu_items (category_id, name_ar, name_fr, price, available, sort_order, station)
SELECT c.id, 'بيتزا مارغريتا', 'Pizza Margherita', 600.00, true, 1, 'kitchen' FROM categories c WHERE c.name_ar = 'بيتزا'
ON CONFLICT DO NOTHING;
INSERT INTO menu_items (category_id, name_ar, name_fr, price, available, sort_order, station)
SELECT c.id, 'بيتزا خضروات', 'Pizza Végétarienne', 650.00, true, 2, 'kitchen' FROM categories c WHERE c.name_ar = 'بيتزا'
ON CONFLICT DO NOTHING;
INSERT INTO menu_items (category_id, name_ar, name_fr, price, available, sort_order, station)
SELECT c.id, 'كوكا كولا', 'Coca-Cola', 100.00, true, 1, 'bar' FROM categories c WHERE c.name_ar = 'مشروبات'
ON CONFLICT DO NOTHING;
INSERT INTO menu_items (category_id, name_ar, name_fr, price, available, sort_order, station)
SELECT c.id, 'عصير برتقال', 'Jus d''Orange', 150.00, true, 2, 'bar' FROM categories c WHERE c.name_ar = 'مشروبات'
ON CONFLICT DO NOTHING;
INSERT INTO menu_items (category_id, name_ar, name_fr, price, available, sort_order, station)
SELECT c.id, 'تيراميسو', 'Tiramisu', 200.00, true, 1, 'bar' FROM categories c WHERE c.name_ar = 'حلويات'
ON CONFLICT DO NOTHING;
INSERT INTO menu_items (category_id, name_ar, name_fr, price, available, sort_order, station)
SELECT c.id, 'بطاطس مقلية', 'Frites', 120.00, true, 1, 'kitchen' FROM categories c WHERE c.name_ar = 'أطباق جانبية'
ON CONFLICT DO NOTHING;

-- Seed sample tables
INSERT INTO restaurant_tables (label, seats, zone, status, sort_order) VALUES
('T1', 4, 'صالة داخلية', 'free', 1),
('T2', 4, 'صالة داخلية', 'free', 2),
('T3', 6, 'صالة داخلية', 'free', 3),
('T4', 2, 'تراس', 'free', 4),
('T5', 8, 'صالة داخلية', 'free', 5),
('T6', 4, 'تراس', 'free', 6)
ON CONFLICT DO NOTHING;

-- Seed sample drivers
INSERT INTO drivers (name, phone, active) VALUES
('أحمد', '0555123456', true),
('محمد', '0661234567', true)
ON CONFLICT DO NOTHING;

-- Seed sample staff
INSERT INTO staff (name, role, pin, active) VALUES
('المدير', 'manager', '1234', true),
('كاشير 1', 'cashier', '1111', true),
('نادل 1', 'waiter', '2222', true)
ON CONFLICT DO NOTHING;

-- Seed default printers
INSERT INTO printers (name, connection_type, ip_address, port, paper_width, auto_cutter, station, active) VALUES
('طابعة الكاشير', 'network', '192.168.1.200', 9100, 80, true, 'cashier', true),
('طابعة المطبخ', 'network', '192.168.1.201', 9100, 80, true, 'kitchen', true),
('طابعة البار', 'network', '192.168.1.202', 9100, 58, false, 'bar', true)
ON CONFLICT DO NOTHING;

-- Seed delivery zones
INSERT INTO delivery_zones (name_ar, name_fr, delivery_fee) VALUES
('وسط المدينة', 'Centre-ville', 200.00),
('الضواحي', 'Banlieue', 400.00)
ON CONFLICT DO NOTHING;