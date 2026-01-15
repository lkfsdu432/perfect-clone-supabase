import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokenValue } = await req.json();

    if (!tokenValue || typeof tokenValue !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing tokenValue' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the token - case-insensitive
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('id, balance, is_blocked')
      .ilike('token', tokenValue.trim())
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ success: false, error: 'TOKEN_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch orders for this token
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, product_id, product_option_id, amount, total_price, status, created_at, response_message, delivered_email, delivered_password, admin_notes, delivered_at')
      .eq('token_id', tokenData.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Fetch orders error:', ordersError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recharge requests for this token
    const { data: recharges, error: rechargesError } = await supabase
      .from('recharge_requests')
      .select('id, amount, status, created_at, payment_method, admin_note')
      .eq('token_id', tokenData.id)
      .order('created_at', { ascending: false });

    if (rechargesError) {
      console.error('Fetch recharges error:', rechargesError);
    }

    // Fetch refund requests for this token's orders
    const orderNumbers = (orders || []).map(o => o.order_number);
    let refunds: any[] = [];
    if (orderNumbers.length > 0) {
      const { data: refundsData } = await supabase
        .from('refund_requests')
        .select('id, order_number, status, reason, admin_notes, created_at, processed_at')
        .in('order_number', orderNumbers)
        .order('created_at', { ascending: false });
      refunds = refundsData || [];
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: {
          id: tokenData.id,
          balance: tokenData.balance,
          is_blocked: tokenData.is_blocked
        },
        orders: orders || [],
        recharges: recharges || [],
        refunds
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get token orders error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});