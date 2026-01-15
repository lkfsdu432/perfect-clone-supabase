import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const baseCorsHeaders = {
  // NOTE: origin is set per-request inside the handler
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Origin',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
} as const;

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '*';
  const corsHeaders = { ...baseCorsHeaders, 'Access-Control-Allow-Origin': origin };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'dollar_rate')
      .maybeSingle();

    if (error) {
      console.error('get-dollar-rate error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rate = data?.value ? Number(data.value) : null;

    return new Response(
      JSON.stringify({ success: true, rate }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('get-dollar-rate internal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
