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
    const { token_value, order_number, reason } = await req.json();

    if (!token_value || !order_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('id, is_blocked')
      .eq('token', token_value.trim())
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.is_blocked) {
      return new Response(
        JSON.stringify({ error: 'Token is blocked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize order number
    const orderNum = order_number.trim();
    const orderNumWithPrefix = orderNum.startsWith('ORD-') ? orderNum : 'ORD-' + orderNum;
    const orderNumWithoutPrefix = orderNum.startsWith('ORD-') ? orderNum.replace('ORD-', '') : orderNum;

    // Verify order belongs to token
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, status, amount, order_number')
      .eq('token_id', tokenData.id)
      .or(`order_number.eq.${orderNum},order_number.eq.${orderNumWithPrefix},order_number.eq.${orderNumWithoutPrefix}`)
      .maybeSingle();

    if (orderError || !orderData) {
      return new Response(
        JSON.stringify({ error: 'Order not found or does not belong to this token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actualOrderNumber = orderData.order_number;

    // Check for existing refund
    const { data: existingRefund } = await supabase
      .from('refund_requests')
      .select('id, status')
      .eq('order_number', actualOrderNumber)
      .maybeSingle();

    if (existingRefund) {
      const message = existingRefund.status === 'pending' 
        ? 'A refund request is already pending for this order'
        : 'A refund request already exists for this order';
      return new Response(
        JSON.stringify({ error: message, existing_status: existingRefund.status }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create refund request
    const { data: refundData, error: refundError } = await supabase
      .from('refund_requests')
      .insert({
        token_id: tokenData.id,
        order_number: actualOrderNumber,
        reason: reason?.trim() || ''
      })
      .select('id')
      .single();

    if (refundError || !refundData) {
      return new Response(
        JSON.stringify({ error: 'Failed to create refund request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund_id: refundData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating refund:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
