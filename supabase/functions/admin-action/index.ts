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
        const { data: rechargesRaw } = await supabase
          .from('recharge_requests')
          .select('*')
          .order('created_at', { ascending: false });
        
        // Enrich with token data
        const recharges = [];
        for (const r of rechargesRaw || []) {
          const { data: tokenData } = await supabase
            .from('tokens')
            .select('token, balance')
            .eq('id', r.token_id)
            .maybeSingle();
          recharges.push({
            ...r,
            token_value: tokenData?.token || null,
            token_balance: tokenData?.balance || 0
          });
        }
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

      case 'fetch_news':
        const { data: newsData } = await supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false });
        result = { news: newsData };
        break;

      case 'fetch_products':
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .order('display_order', { ascending: true });
        result = { products: productsData };
        break;

      case 'fetch_product_options':
        const { data: optionsData } = await supabase
          .from('product_options')
          .select('*')
          .order('display_order', { ascending: true });
        result = { product_options: optionsData };
        break;

      case 'fetch_payment_methods':
        const { data: paymentMethodsData } = await supabase
          .from('payment_methods')
          .select('*')
          .order('display_order', { ascending: true });
        result = { payment_methods: paymentMethodsData };
        break;

      case 'fetch_coupons':
        const { data: couponsData } = await supabase
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });
        result = { coupons: couponsData };
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

      case 'delete_order':
        if (!adminUser.can_manage_orders) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: deleteOrderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', payload.order_id);
        if (deleteOrderError) throw deleteOrderError;
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

      case 'add_token':
        if (!adminUser.can_manage_tokens) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: newToken, error: addTokenError } = await supabase
          .from('tokens')
          .insert(payload.data)
          .select()
          .single();
        if (addTokenError) throw addTokenError;
        result = { success: true, token: newToken };
        break;

      case 'delete_token':
        if (!adminUser.can_manage_tokens) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: deleteTokenError } = await supabase
          .from('tokens')
          .delete()
          .eq('id', payload.token_id);
        if (deleteTokenError) throw deleteTokenError;
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

      // ========== NEWS ACTIONS ==========
      case 'add_news':
        const { error: addNewsError } = await supabase
          .from('news')
          .insert({ title: payload.title, content: payload.content, is_active: true });
        if (addNewsError) throw addNewsError;
        result = { success: true };
        break;

      case 'update_news':
        const { error: updateNewsError } = await supabase
          .from('news')
          .update(payload.data)
          .eq('id', payload.news_id);
        if (updateNewsError) throw updateNewsError;
        result = { success: true };
        break;

      case 'delete_news':
        const { error: deleteNewsError } = await supabase
          .from('news')
          .delete()
          .eq('id', payload.news_id);
        if (deleteNewsError) throw deleteNewsError;
        result = { success: true };
        break;

      // ========== PRODUCTS ACTIONS ==========
      case 'add_product':
        if (!adminUser.can_manage_products) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: newProduct, error: addProductError } = await supabase
          .from('products')
          .insert(payload.data)
          .select()
          .single();
        if (addProductError) throw addProductError;
        result = { success: true, product: newProduct };
        break;

      case 'update_product':
        if (!adminUser.can_manage_products) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: updateProductError } = await supabase
          .from('products')
          .update(payload.data)
          .eq('id', payload.product_id);
        if (updateProductError) throw updateProductError;
        result = { success: true };
        break;

      case 'delete_product':
        if (!adminUser.can_manage_products) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Try hard-delete first; if constrained by existing orders, soft-delete (deactivate)
        {
          const { error: deleteProductError } = await supabase
            .from('products')
            .delete()
            .eq('id', payload.product_id);

          if (deleteProductError) {
            const code = (deleteProductError as any)?.code;
            if (code === '23503') {
              const { error: softDeleteError } = await supabase
                .from('products')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', payload.product_id);

              if (softDeleteError) throw softDeleteError;
              result = { success: true, soft_deleted: true };
              break;
            }

            throw deleteProductError;
          }

          result = { success: true, deleted: true };
        }
        break;

      // ========== PRODUCT OPTIONS ACTIONS ==========
      case 'add_product_option':
        if (!adminUser.can_manage_products) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: newOption, error: addOptionError } = await supabase
          .from('product_options')
          .insert(payload.data)
          .select()
          .single();
        if (addOptionError) throw addOptionError;
        result = { success: true, option: newOption };
        break;

      case 'update_product_option':
        if (!adminUser.can_manage_products) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: updateOptionError } = await supabase
          .from('product_options')
          .update(payload.data)
          .eq('id', payload.option_id);
        if (updateOptionError) throw updateOptionError;
        result = { success: true };
        break;

      case 'delete_product_option':
        if (!adminUser.can_manage_products) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Try hard-delete first; if constrained by existing orders/stock, soft-delete (deactivate)
        {
          const { error: deleteOptionError } = await supabase
            .from('product_options')
            .delete()
            .eq('id', payload.option_id);

          if (deleteOptionError) {
            const code = (deleteOptionError as any)?.code;
            if (code === '23503') {
              const { error: softDeleteError } = await supabase
                .from('product_options')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', payload.option_id);

              if (softDeleteError) throw softDeleteError;
              result = { success: true, soft_deleted: true };
              break;
            }

            throw deleteOptionError;
          }

          result = { success: true, deleted: true };
        }
        break;

      // ========== PAYMENT METHODS ACTIONS ==========
      case 'add_payment_method':
        if (!adminUser.can_manage_payment_methods) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: newPayment, error: addPaymentError } = await supabase
          .from('payment_methods')
          .insert(payload.data)
          .select()
          .single();
        if (addPaymentError) throw addPaymentError;
        result = { success: true, payment_method: newPayment };
        break;

      case 'update_payment_method':
        if (!adminUser.can_manage_payment_methods) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: updatePaymentError } = await supabase
          .from('payment_methods')
          .update(payload.data)
          .eq('id', payload.payment_method_id);
        if (updatePaymentError) throw updatePaymentError;
        result = { success: true };
        break;

      case 'delete_payment_method':
        if (!adminUser.can_manage_payment_methods) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: deletePaymentError } = await supabase
          .from('payment_methods')
          .delete()
          .eq('id', payload.payment_method_id);
        if (deletePaymentError) throw deletePaymentError;
        result = { success: true };
        break;

      // ========== COUPONS ACTIONS ==========
      case 'add_coupon':
        if (!adminUser.can_manage_coupons) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: newCoupon, error: addCouponError } = await supabase
          .from('coupons')
          .insert(payload.data)
          .select()
          .single();
        if (addCouponError) throw addCouponError;
        result = { success: true, coupon: newCoupon };
        break;

      case 'update_coupon':
        if (!adminUser.can_manage_coupons) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: updateCouponError } = await supabase
          .from('coupons')
          .update(payload.data)
          .eq('id', payload.coupon_id);
        if (updateCouponError) throw updateCouponError;
        result = { success: true };
        break;

      case 'delete_coupon':
        if (!adminUser.can_manage_coupons) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: deleteCouponError } = await supabase
          .from('coupons')
          .delete()
          .eq('id', payload.coupon_id);
        if (deleteCouponError) throw deleteCouponError;
        result = { success: true };
        break;

      // ========== SETTINGS ACTIONS ==========
      case 'fetch_settings':
        const { data: settingsData } = await supabase
          .from('settings')
          .select('*');
        result = { settings: settingsData };
        break;

      case 'update_setting':
        const { error: updateSettingError } = await supabase
          .from('settings')
          .upsert({ key: payload.key, value: payload.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (updateSettingError) throw updateSettingError;
        result = { success: true };
        break;

      // ========== ADMIN USERS ACTIONS ==========  
      case 'add_admin_user':
        if (!adminUser.can_manage_users) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: newAdmin, error: addAdminError } = await supabase
          .from('admin_users')
          .insert(payload.data)
          .select()
          .single();
        if (addAdminError) throw addAdminError;
        result = { success: true, admin: newAdmin };
        break;

      case 'update_admin_user':
        if (!adminUser.can_manage_users) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: updateAdminError } = await supabase
          .from('admin_users')
          .update(payload.data)
          .eq('id', payload.admin_user_id);
        if (updateAdminError) throw updateAdminError;
        result = { success: true };
        break;

      case 'delete_admin_user':
        if (!adminUser.can_manage_users) {
          return new Response(
            JSON.stringify({ error: 'Permission denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Prevent deleting self
        if (payload.admin_user_id === admin_id) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete yourself' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { error: deleteAdminError } = await supabase
          .from('admin_users')
          .delete()
          .eq('id', payload.admin_user_id);
        if (deleteAdminError) throw deleteAdminError;
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
