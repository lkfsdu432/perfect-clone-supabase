import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, tokenId } = await req.json();

    if (!orderId || !tokenId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing orderId or tokenId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the order to verify it exists and is pending
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, amount, total_price, token_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token ownership
    if (order.token_id !== tokenId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order is already cancelled
    if (order.status === 'cancelled') {
      return new Response(
        JSON.stringify({ success: false, error: 'ORDER_ALREADY_CANCELLED', message: 'تم إلغاء الطلب بالفعل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order is in_progress (cannot cancel)
    if (order.status === 'in_progress') {
      return new Response(
        JSON.stringify({ success: false, error: 'ORDER_IN_PROGRESS', message: 'لا يمكن إلغاء الطلب لأنه قيد التنفيذ' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow cancellation of pending orders
    if (order.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: 'ORDER_NOT_PENDING', message: 'لا يمكن إلغاء هذا الطلب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refundAmount = Number(order.amount ?? order.total_price ?? 0);

    // Update order status to cancelled
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .eq('status', 'pending'); // Extra safety: only update if still pending

    if (updateError) {
      console.error('Update order error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to cancel order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch current token balance
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('balance')
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      console.error('Token fetch error:', tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Token not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refund the balance
    const newBalance = Number(token.balance) + refundAmount;
    const { error: refundError } = await supabase
      .from('tokens')
      .update({ balance: newBalance })
      .eq('id', tokenId);

    if (refundError) {
      console.error('Refund error:', refundError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to refund balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundAmount,
        newBalance,
        message: `تم إلغاء الطلب وإرجاع $${refundAmount.toFixed(2)} إلى رصيدك`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cancel order error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
