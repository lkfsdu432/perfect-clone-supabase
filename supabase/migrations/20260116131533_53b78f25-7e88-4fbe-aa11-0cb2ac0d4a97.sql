-- Fix news table: drop policy first then column
DROP POLICY IF EXISTS "Public read news" ON public.news;
ALTER TABLE public.news DROP COLUMN IF EXISTS is_visible;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
CREATE POLICY "Public read news" ON public.news FOR SELECT USING (is_active = true);

-- Rename stock to stock_items
ALTER TABLE public.stock RENAME TO stock_items;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id);
ALTER TABLE public.stock_items RENAME COLUMN is_used TO is_sold;
ALTER TABLE public.stock_items RENAME COLUMN used_at TO sold_at;
ALTER TABLE public.stock_items RENAME COLUMN order_id TO sold_to_order_id;

-- Fix stock_items policies
DROP POLICY IF EXISTS "No direct select stock" ON public.stock_items;
DROP POLICY IF EXISTS "No direct insert stock" ON public.stock_items;
CREATE POLICY "No direct select stock_items" ON public.stock_items FOR SELECT USING (false);
CREATE POLICY "No direct insert stock_items" ON public.stock_items FOR INSERT WITH CHECK (false);

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  extra_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "No direct write site_settings" ON public.site_settings FOR INSERT WITH CHECK (false);

-- Create device_purchases table
CREATE TABLE IF NOT EXISTS public.device_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT NOT NULL,
  product_option_id UUID REFERENCES public.product_options(id),
  order_id UUID REFERENCES public.orders(id),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_purchases_fingerprint ON public.device_purchases (device_fingerprint);

ALTER TABLE public.device_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct select device_purchases" ON public.device_purchases FOR SELECT USING (false);
CREATE POLICY "No direct insert device_purchases" ON public.device_purchases FOR INSERT WITH CHECK (false);

-- Create admin_auth table
CREATE TABLE IF NOT EXISTS public.admin_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_super_admin BOOLEAN DEFAULT false,
  can_manage_orders BOOLEAN DEFAULT false,
  can_manage_products BOOLEAN DEFAULT false,
  can_manage_tokens BOOLEAN DEFAULT false,
  can_manage_refunds BOOLEAN DEFAULT false,
  can_manage_stock BOOLEAN DEFAULT false,
  can_manage_coupons BOOLEAN DEFAULT false,
  can_manage_recharges BOOLEAN DEFAULT false,
  can_manage_payment_methods BOOLEAN DEFAULT false,
  can_manage_users BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_auth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct select admin_auth" ON public.admin_auth FOR SELECT USING (false);
CREATE POLICY "No direct insert admin_auth" ON public.admin_auth FOR INSERT WITH CHECK (false);

-- visits: adjust columns
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS visited_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS page TEXT;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- payment_methods: add missing columns
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS account_info TEXT DEFAULT '';