-- Fix visits table policy - restrict insert to prevent abuse
DROP POLICY IF EXISTS "Public insert visits" ON public.visits;
CREATE POLICY "Restrict visits insert" ON public.visits FOR INSERT WITH CHECK (false);