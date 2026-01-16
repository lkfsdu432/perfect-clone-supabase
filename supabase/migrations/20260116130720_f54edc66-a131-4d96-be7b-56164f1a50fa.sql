-- ADMIN USERS table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  can_manage_orders BOOLEAN NOT NULL DEFAULT false,
  can_manage_products BOOLEAN NOT NULL DEFAULT false,
  can_manage_tokens BOOLEAN NOT NULL DEFAULT false,
  can_manage_refunds BOOLEAN NOT NULL DEFAULT false,
  can_manage_stock BOOLEAN NOT NULL DEFAULT false,
  can_manage_coupons BOOLEAN NOT NULL DEFAULT false,
  can_manage_recharges BOOLEAN NOT NULL DEFAULT false,
  can_manage_payment_methods BOOLEAN NOT NULL DEFAULT false,
  can_manage_users BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct select admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "No direct insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "No direct update admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "No direct delete admin_users" ON public.admin_users;
CREATE POLICY "No direct select admin_users" ON public.admin_users FOR SELECT USING (false);
CREATE POLICY "No direct insert admin_users" ON public.admin_users FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update admin_users" ON public.admin_users FOR UPDATE USING (false);
CREATE POLICY "No direct delete admin_users" ON public.admin_users FOR DELETE USING (false);