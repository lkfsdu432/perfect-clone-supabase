-- Core tables for recharge + token verification

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- TOKENS
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON public.tokens (token);

DROP TRIGGER IF EXISTS update_tokens_updated_at ON public.tokens;
CREATE TRIGGER update_tokens_updated_at
BEFORE UPDATE ON public.tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct select tokens" ON public.tokens;
DROP POLICY IF EXISTS "No direct insert tokens" ON public.tokens;
DROP POLICY IF EXISTS "No direct update tokens" ON public.tokens;
DROP POLICY IF EXISTS "No direct delete tokens" ON public.tokens;
CREATE POLICY "No direct select tokens" ON public.tokens FOR SELECT USING (false);
CREATE POLICY "No direct insert tokens" ON public.tokens FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update tokens" ON public.tokens FOR UPDATE USING (false);
CREATE POLICY "No direct delete tokens" ON public.tokens FOR DELETE USING (false);

-- SETTINGS (public read)
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read settings" ON public.settings;
DROP POLICY IF EXISTS "No direct write settings" ON public.settings;
DROP POLICY IF EXISTS "No direct update settings" ON public.settings;
DROP POLICY IF EXISTS "No direct delete settings" ON public.settings;
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "No direct write settings" ON public.settings FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update settings" ON public.settings FOR UPDATE USING (false);
CREATE POLICY "No direct delete settings" ON public.settings FOR DELETE USING (false);

-- PAYMENT METHODS (public read)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  account_number TEXT,
  account_name TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_display_order ON public.payment_methods (display_order);

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "No direct write payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "No direct update payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "No direct delete payment methods" ON public.payment_methods;
CREATE POLICY "Public read payment methods" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "No direct write payment methods" ON public.payment_methods FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update payment methods" ON public.payment_methods FOR UPDATE USING (false);
CREATE POLICY "No direct delete payment methods" ON public.payment_methods FOR DELETE USING (false);

-- RECHARGE REQUESTS
CREATE TABLE IF NOT EXISTS public.recharge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_method_id UUID,
  proof_image_url TEXT,
  sender_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recharge_requests_token_id ON public.recharge_requests (token_id);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON public.recharge_requests (status);

DROP TRIGGER IF EXISTS update_recharge_requests_updated_at ON public.recharge_requests;
CREATE TRIGGER update_recharge_requests_updated_at
BEFORE UPDATE ON public.recharge_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.recharge_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct select recharge requests" ON public.recharge_requests;
DROP POLICY IF EXISTS "No direct insert recharge requests" ON public.recharge_requests;
DROP POLICY IF EXISTS "No direct update recharge requests" ON public.recharge_requests;
DROP POLICY IF EXISTS "No direct delete recharge requests" ON public.recharge_requests;
CREATE POLICY "No direct select recharge requests" ON public.recharge_requests FOR SELECT USING (false);
CREATE POLICY "No direct insert recharge requests" ON public.recharge_requests FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update recharge requests" ON public.recharge_requests FOR UPDATE USING (false);
CREATE POLICY "No direct delete recharge requests" ON public.recharge_requests FOR DELETE USING (false);

-- STORAGE: payment proofs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (without IF NOT EXISTS)
DROP POLICY IF EXISTS "Public read payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public upload payment proofs" ON storage.objects;

CREATE POLICY "Public read payment proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Public upload payment proofs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs');