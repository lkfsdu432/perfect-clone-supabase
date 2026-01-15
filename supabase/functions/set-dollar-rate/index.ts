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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');

    const { rate } = await req.json().catch(() => ({ rate: null }));
    const parsedRate = Number(rate);

    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_RATE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    // Verify JWT using anon client
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(jwt);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check admin permission + update setting using service role
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminRow, error: adminError } = await supabase
      .from('admin_auth')
      .select('is_super_admin, can_manage_payment_methods')
      .eq('user_id', userId)
      .maybeSingle();

    if (adminError) {
      console.error('set-dollar-rate admin check error:', adminError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAllowed = !!adminRow && (adminRow.is_super_admin || adminRow.can_manage_payment_methods);
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'dollar_rate')
      .maybeSingle();

    if (existingError) {
      console.error('set-dollar-rate existing check error:', existingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('settings')
        .update({ value: String(parsedRate), updated_at: new Date().toISOString() })
        .eq('key', 'dollar_rate');

      if (updateError) {
        console.error('set-dollar-rate update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from('settings')
        .insert({ key: 'dollar_rate', value: String(parsedRate) });

      if (insertError) {
        console.error('set-dollar-rate insert error:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('set-dollar-rate internal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
