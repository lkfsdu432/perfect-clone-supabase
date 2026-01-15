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
    const { tokenValue, orderNumber } = await req.json();

    if (!tokenValue || !orderNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('id')
      .eq('token', tokenValue.trim())
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ success: false, error: 'TOKEN_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the order
    const orderNum = orderNumber.trim();
    const orderNumWithPrefix = orderNum.startsWith('ORD-') ? orderNum : `ORD-${orderNum}`;
    const orderNumWithoutPrefix = orderNum.startsWith('ORD-') ? orderNum.replace('ORD-', '') : orderNum;

    const { data: orderData } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('token_id', tokenData.id)
      .or(`order_number.eq.${orderNum},order_number.eq.${orderNumWithPrefix},order_number.eq.${orderNumWithoutPrefix}`)
      .maybeSingle();

    if (!orderData) {
      return new Response(
        JSON.stringify({ success: false, error: 'ORDER_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get refund status
    const { data: refundData } = await supabase
      .from('refund_requests')
      .select('status, reason, admin_notes, created_at, processed_at')
      .eq('order_number', orderData.order_number)
      .maybeSingle();

    if (!refundData) {
      return new Response(
        JSON.stringify({ success: false, error: 'REFUND_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          status: refundData.status,
          reason: refundData.reason,
          admin_notes: refundData.admin_notes,
          created_at: refundData.created_at,
          processed_at: refundData.processed_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get refund status error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});