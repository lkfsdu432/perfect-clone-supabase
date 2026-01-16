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
    const { admin_id, action, payload } = await req.json();

    if (!admin_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Admin ID and action required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin exists and is active
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', admin_id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    let result: any = null;

    switch (action) {
      // ========== FETCH DATA ==========
      case 'fetch_orders':
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        result = { orders };
        break;

      case 'fetch_tokens':
        const { data: tokens } = await supabase
          .from('tokens')
          .select('*')
          .order('created_at', { ascending: false });
        result = { tokens };
        break;

      case 'fetch_recharges':
        const { data: recharges } = await supabase
          .from('recharge_requests')
          .select('*')
          .order('created_at', { ascending: false });
        result = { recharges };
        break;

      case 'fetch_refunds':
        const { data: refunds } = await supabase
          .from('refund_requests')
          .select('*')
          .order('created_at', { ascending: false });
        result = { refunds };
        break;

      case 'fetch_stock':
        const { data: stock } = await supabase
          .from('stock_items')
          .select('*')
          .order('created_at', { ascending: false });
        result = { stock };
        break;

      case 'fetch_messages':
        if (!payload?.order_id) {
          return new Response(
            JSON.stringify({ error: 'Order ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: messages } = await supabase
          .from('order_messages')
          .select('*')
          .eq('order_id', payload.order_id)
          .order('created_at', { ascending: true });
        result = { messages };
        break;

      case 'fetch_admin_users':
        if (!adminUser.can_manage_users) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: adminUsers } = await supabase
          .from('admin_users')
          .select('id, username, is_active, can_manage_orders, can_manage_products, can_manage_tokens, can_manage_refunds, can_manage_stock, can_manage_coupons, can_manage_recharges, can_manage_payment_methods, can_manage_users, created_at')
          .order('created_at', { ascending: false });
        result = { admin_users: adminUsers };
        break;

      // ========== UPDATE ACTIONS ==========
      case 'update_order':
        if (!adminUser.can_manage_orders) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: orderError } = await supabase
          .from('orders')
          .update(payload.data)
          .eq('id', payload.order_id);
        if (orderError) throw orderError;
        result = { success: true };
        break;

      case 'update_token':
        if (!adminUser.can_manage_tokens) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: tokenError } = await supabase
          .from('tokens')
          .update(payload.data)
          .eq('id', payload.token_id);
        if (tokenError) throw tokenError;
        result = { success: true };
        break;

      case 'update_recharge':
        if (!adminUser.can_manage_recharges) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: rechargeError } = await supabase
          .from('recharge_requests')
          .update(payload.data)
          .eq('id', payload.recharge_id);
        if (rechargeError) throw rechargeError;
        result = { success: true };
        break;

      case 'update_refund':
        if (!adminUser.can_manage_refunds) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: refundError } = await supabase
          .from('refund_requests')
          .update(payload.data)
          .eq('id', payload.refund_id);
        if (refundError) throw refundError;
        result = { success: true };
        break;

      case 'send_message':
        if (!adminUser.can_manage_orders) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: msgError } = await supabase
          .from('order_messages')
          .insert({
            order_id: payload.order_id,
            sender_type: 'admin',
            is_admin: true,
            message: payload.message
          });
        if (msgError) throw msgError;
        result = { success: true };
        break;

      case 'add_stock':
        if (!adminUser.can_manage_stock) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: stockError } = await supabase
          .from('stock_items')
          .insert(payload.items);
        if (stockError) throw stockError;
        result = { success: true };
        break;

      case 'delete_stock':
        if (!adminUser.can_manage_stock) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: delStockError } = await supabase
          .from('stock_items')
          .delete()
          .in('id', payload.ids);
        if (delStockError) throw delStockError;
        result = { success: true };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin action error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
