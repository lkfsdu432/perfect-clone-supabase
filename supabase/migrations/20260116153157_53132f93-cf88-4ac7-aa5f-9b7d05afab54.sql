-- Add missing columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration text,
ADD COLUMN IF NOT EXISTS available integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS instant_delivery boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS image text;

-- Add missing columns to product_options table
ALTER TABLE public.product_options 
ADD COLUMN IF NOT EXISTS duration text,
ADD COLUMN IF NOT EXISTS available integer,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'email_password',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS estimated_time text,
ADD COLUMN IF NOT EXISTS purchase_limit integer,
ADD COLUMN IF NOT EXISTS max_quantity_per_order integer,
ADD COLUMN IF NOT EXISTS required_text_instructions text,
ADD COLUMN IF NOT EXISTS required_text_info text;

-- Add missing columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_proof_url text,
ADD COLUMN IF NOT EXISTS coupon_id uuid,
ADD COLUMN IF NOT EXISTS token text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS password text,
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add missing columns to coupons table
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS discount_percentage numeric,
ADD COLUMN IF NOT EXISTS current_uses integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_id uuid;

-- Add missing columns to news table
ALTER TABLE public.news 
DROP COLUMN IF EXISTS updated_at;

-- Add missing columns to order_messages table
ALTER TABLE public.order_messages 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Add missing columns to recharge_requests table
ALTER TABLE public.recharge_requests 
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS sender_name text,
ADD COLUMN IF NOT EXISTS sender_phone text,
ADD COLUMN IF NOT EXISTS transaction_reference text;

-- Add missing columns to tokens table
ALTER TABLE public.tokens 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;