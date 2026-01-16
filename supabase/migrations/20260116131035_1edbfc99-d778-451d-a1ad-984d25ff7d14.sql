-- NEWS table
CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_news_updated_at ON public.news;
CREATE TRIGGER update_news_updated_at
BEFORE UPDATE ON public.news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read news" ON public.news;
CREATE POLICY "Public read news" ON public.news FOR SELECT USING (is_visible = true);
-- Allow service role full access (admin via edge functions)
DROP POLICY IF EXISTS "Service insert news" ON public.news;
DROP POLICY IF EXISTS "Service update news" ON public.news;
DROP POLICY IF EXISTS "Service delete news" ON public.news;

-- PRODUCTS table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON public.products (display_order);

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (is_active = true);

-- PRODUCT OPTIONS table
CREATE TABLE IF NOT EXISTS public.product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_email BOOLEAN NOT NULL DEFAULT false,
  requires_password BOOLEAN NOT NULL DEFAULT false,
  requires_verification_link BOOLEAN NOT NULL DEFAULT false,
  requires_text_input BOOLEAN NOT NULL DEFAULT false,
  text_input_label TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_options_product_id ON public.product_options (product_id);

DROP TRIGGER IF EXISTS update_product_options_updated_at ON public.product_options;
CREATE TRIGGER update_product_options_updated_at
BEFORE UPDATE ON public.product_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read product_options" ON public.product_options;
CREATE POLICY "Public read product_options" ON public.product_options FOR SELECT USING (is_active = true);

-- ORDERS table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  token_id UUID NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_option_id UUID REFERENCES public.product_options(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  response_message TEXT,
  stock_content TEXT,
  delivered_email TEXT,
  delivered_password TEXT,
  delivered_at TIMESTAMPTZ,
  coupon_code TEXT,
  discount_amount NUMERIC DEFAULT 0,
  verification_link TEXT,
  text_input TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_token_id ON public.orders (token_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct select orders" ON public.orders;
DROP POLICY IF EXISTS "No direct insert orders" ON public.orders;
DROP POLICY IF EXISTS "No direct update orders" ON public.orders;
DROP POLICY IF EXISTS "No direct delete orders" ON public.orders;
CREATE POLICY "No direct select orders" ON public.orders FOR SELECT USING (false);
CREATE POLICY "No direct insert orders" ON public.orders FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update orders" ON public.orders FOR UPDATE USING (false);
CREATE POLICY "No direct delete orders" ON public.orders FOR DELETE USING (false);

-- ORDER MESSAGES table
CREATE TABLE IF NOT EXISTS public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'customer',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages (order_id);

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct select order_messages" ON public.order_messages;
DROP POLICY IF EXISTS "No direct insert order_messages" ON public.order_messages;
CREATE POLICY "No direct select order_messages" ON public.order_messages FOR SELECT USING (false);
CREATE POLICY "No direct insert order_messages" ON public.order_messages FOR INSERT WITH CHECK (false);

-- REFUND REQUESTS table
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_token_id ON public.refund_requests (token_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests (status);

DROP TRIGGER IF EXISTS update_refund_requests_updated_at ON public.refund_requests;
CREATE TRIGGER update_refund_requests_updated_at
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct select refund_requests" ON public.refund_requests;
DROP POLICY IF EXISTS "No direct insert refund_requests" ON public.refund_requests;
CREATE POLICY "No direct select refund_requests" ON public.refund_requests FOR SELECT USING (false);
CREATE POLICY "No direct insert refund_requests" ON public.refund_requests FOR INSERT WITH CHECK (false);

-- COUPONS table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  min_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);

DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read coupons" ON public.coupons;
CREATE POLICY "Public read coupons" ON public.coupons FOR SELECT USING (is_active = true);

-- STOCK table
CREATE TABLE IF NOT EXISTS public.stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_option_id UUID NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_product_option_id ON public.stock (product_option_id);
CREATE INDEX IF NOT EXISTS idx_stock_is_used ON public.stock (is_used);

ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct select stock" ON public.stock;
DROP POLICY IF EXISTS "No direct insert stock" ON public.stock;
CREATE POLICY "No direct select stock" ON public.stock FOR SELECT USING (false);
CREATE POLICY "No direct insert stock" ON public.stock FOR INSERT WITH CHECK (false);

-- VISITS table (for analytics)
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert visits" ON public.visits;
CREATE POLICY "Public insert visits" ON public.visits FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "No direct select visits" ON public.visits;
CREATE POLICY "No direct select visits" ON public.visits FOR SELECT USING (false);