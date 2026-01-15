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
    const { tokenValue, orderNumber, reason } = await req.json();

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
      .select('id, is_blocked')
      .eq('token', tokenValue.trim())
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ success: false, error: 'TOKEN_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tokenData.is_blocked) {
      return new Response(
        JSON.stringify({ success: false, error: 'TOKEN_BLOCKED' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the order
    const orderNum = orderNumber.trim();
    const orderNumWithPrefix = orderNum.startsWith('ORD-') ? orderNum : `ORD-${orderNum}`;
    const orderNumWithoutPrefix = orderNum.startsWith('ORD-') ? orderNum.replace('ORD-', '') : orderNum;

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, status, amount, order_number')
      .eq('token_id', tokenData.id)
      .or(`order_number.eq.${orderNum},order_number.eq.${orderNumWithPrefix},order_number.eq.${orderNumWithoutPrefix}`)
      .maybeSingle();

    if (orderError || !orderData) {
      return new Response(
        JSON.stringify({ success: false, error: 'ORDER_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (orderData.status === 'pending' || orderData.status === 'in_progress') {
      return new Response(
        JSON.stringify({ success: false, error: 'ORDER_IN_PROGRESS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if refund already exists
    const { data: existingRefund } = await supabase
      .from('refund_requests')
      .select('id, status')
      .eq('order_number', orderData.order_number)
      .maybeSingle();

    if (existingRefund) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'REFUND_EXISTS',
          status: existingRefund.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create refund request
    const { error: insertError } = await supabase
      .from('refund_requests')
      .insert({
        token_id: tokenData.id,
        order_number: orderData.order_number,
        reason: reason?.trim() || ''
      });

    if (insertError) {
      console.error('Insert refund error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'REFUND_CREATE_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Submit refund error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});