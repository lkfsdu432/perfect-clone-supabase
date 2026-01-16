import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token_value } = await req.json();

    if (!token_value || typeof token_value !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Token value is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('id, token, balance, is_blocked, created_at')
      .eq('token', token_value.trim())
      .maybeSingle();

    if (tokenError) {
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      return new Response(
        JSON.stringify({ error: 'Token not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get orders (hide sensitive admin data)
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id, order_number, product_id, product_option_id, quantity,
        amount, total_price, status, created_at, updated_at,
        response_message, stock_content, delivered_email, 
        delivered_password, delivered_at, coupon_code, discount_amount
      `)
      .eq('token_id', tokenData.id)
      .order('created_at', { ascending: false });

    // Get recharge requests (hide sensitive data)
    const { data: recharges } = await supabase
      .from('recharge_requests')
      .select(`
        id, amount, payment_method, status, created_at,
        processed_at, admin_note
      `)
      .eq('token_id', tokenData.id)
      .order('created_at', { ascending: false });

    // Get refund requests
    const { data: refunds } = await supabase
      .from('refund_requests')
      .select(`
        id, order_number, reason, status, created_at,
        processed_at, admin_notes
      `)
      .eq('token_id', tokenData.id)
      .order('created_at', { ascending: false });

    return new Response(
      JSON.stringify({
        token: tokenData,
        orders: orders || [],
        recharges: recharges || [],
        refunds: refunds || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
