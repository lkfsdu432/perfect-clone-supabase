import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Old project credentials
    const oldUrl = Deno.env.get("OLD_SUPABASE_URL");
    const oldKey = Deno.env.get("OLD_SUPABASE_SERVICE_KEY");
    
    // New project credentials
    const newUrl = Deno.env.get("SUPABASE_URL");
    const newKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!oldUrl || !oldKey || !newUrl || !newKey) {
      throw new Error("Missing environment variables");
    }

    const oldSupabase = createClient(oldUrl, oldKey);
    const newSupabase = createClient(newUrl, newKey);

    const results: Record<string, any> = {};

    // 1. Migrate settings
    console.log("Migrating settings...");
    const { data: settings } = await oldSupabase.from("settings").select("*");
    if (settings && settings.length > 0) {
      for (const setting of settings) {
        await newSupabase.from("settings").upsert({
          key: setting.key,
          value: setting.value,
          updated_at: setting.updated_at || new Date().toISOString()
        }, { onConflict: 'key' });
      }
      results.settings = settings.length;
    }

    // 2. Migrate site_settings
    console.log("Migrating site_settings...");
    const { data: siteSettings } = await oldSupabase.from("site_settings").select("*");
    if (siteSettings && siteSettings.length > 0) {
      for (const ss of siteSettings) {
        await newSupabase.from("site_settings").upsert({
          id: ss.id,
          key: ss.key,
          value: ss.value,
          extra_data: ss.extra_data,
          created_at: ss.created_at,
          updated_at: ss.updated_at
        }, { onConflict: 'key' });
      }
      results.site_settings = siteSettings.length;
    }

    // 3. Migrate payment_methods
    console.log("Migrating payment_methods...");
    const { data: paymentMethods } = await oldSupabase.from("payment_methods").select("*");
    if (paymentMethods && paymentMethods.length > 0) {
      for (const pm of paymentMethods) {
        await newSupabase.from("payment_methods").upsert({
          id: pm.id,
          name: pm.name,
          type: pm.type,
          details: pm.details,
          account_number: pm.account_number,
          account_name: pm.account_name,
          account_info: pm.account_info || '',
          instructions: pm.instructions,
          is_active: pm.is_active,
          is_visible: pm.is_visible ?? true,
          display_order: pm.display_order || 0,
          created_at: pm.created_at,
          updated_at: pm.updated_at
        }, { onConflict: 'id' });
      }
      results.payment_methods = paymentMethods.length;
    }

    // 4. Migrate news
    console.log("Migrating news...");
    const { data: news } = await oldSupabase.from("news").select("*");
    if (news && news.length > 0) {
      for (const n of news) {
        await newSupabase.from("news").upsert({
          id: n.id,
          title: n.title,
          content: n.content || '',
          is_active: n.is_active,
          created_at: n.created_at,
          updated_at: n.updated_at || n.created_at
        }, { onConflict: 'id' });
      }
      results.news = news.length;
    }

    // 5. Migrate coupons
    console.log("Migrating coupons...");
    const { data: coupons } = await oldSupabase.from("coupons").select("*");
    if (coupons && coupons.length > 0) {
      for (const c of coupons) {
        await newSupabase.from("coupons").upsert({
          id: c.id,
          code: c.code,
          discount_type: c.discount_type || 'percentage',
          discount_value: c.discount_value || c.discount_percentage || 0,
          is_active: c.is_active,
          max_uses: c.max_uses,
          used_count: c.used_count || c.current_uses || 0,
          min_amount: c.min_amount || 0,
          expires_at: c.expires_at,
          created_at: c.created_at,
          updated_at: c.updated_at || c.created_at
        }, { onConflict: 'id' });
      }
      results.coupons = coupons.length;
    }

    // 6. Migrate products
    console.log("Migrating products...");
    const { data: products } = await oldSupabase.from("products").select("*");
    if (products && products.length > 0) {
      for (const p of products) {
        await newSupabase.from("products").upsert({
          id: p.id,
          name: p.name,
          description: p.description,
          image_url: p.image_url || p.image,
          category: p.category,
          is_active: p.is_active,
          display_order: p.display_order || 0,
          created_at: p.created_at,
          updated_at: p.updated_at || p.created_at
        }, { onConflict: 'id' });
      }
      results.products = products.length;
    }

    // 7. Migrate product_options
    console.log("Migrating product_options...");
    const { data: productOptions } = await oldSupabase.from("product_options").select("*");
    if (productOptions && productOptions.length > 0) {
      for (const po of productOptions) {
        await newSupabase.from("product_options").upsert({
          id: po.id,
          product_id: po.product_id,
          name: po.name,
          price: po.price,
          original_price: po.original_price,
          is_active: po.is_active,
          display_order: po.display_order || 0,
          requires_email: po.type === 'email_password' || po.type === 'email_only',
          requires_password: po.type === 'email_password',
          requires_text_input: !!po.required_text_instructions,
          requires_verification_link: false,
          text_input_label: po.required_text_instructions || po.required_text_info,
          created_at: po.created_at,
          updated_at: po.updated_at || po.created_at
        }, { onConflict: 'id' });
      }
      results.product_options = productOptions.length;
    }

    // 8. Migrate tokens
    console.log("Migrating tokens...");
    const { data: tokens } = await oldSupabase.from("tokens").select("*");
    if (tokens && tokens.length > 0) {
      for (const t of tokens) {
        await newSupabase.from("tokens").upsert({
          id: t.id,
          token: t.token,
          balance: t.balance || 0,
          is_blocked: t.is_blocked || false,
          created_ip: t.created_ip,
          created_at: t.created_at,
          updated_at: t.updated_at || t.created_at
        }, { onConflict: 'id' });
      }
      results.tokens = tokens.length;
    }

    // 9. Migrate orders
    console.log("Migrating orders...");
    const { data: orders } = await oldSupabase.from("orders").select("*");
    if (orders && orders.length > 0) {
      for (const o of orders) {
        await newSupabase.from("orders").upsert({
          id: o.id,
          order_number: o.order_number,
          token_id: o.token_id,
          product_id: o.product_id,
          product_option_id: o.product_option_id,
          quantity: o.quantity || 1,
          amount: o.amount || 0,
          total_price: o.total_price || o.amount || 0,
          discount_amount: o.discount_amount || 0,
          coupon_code: o.coupon_code,
          status: o.status || 'pending',
          response_message: o.response_message,
          stock_content: o.stock_content,
          delivered_email: o.delivered_email || o.email,
          delivered_password: o.delivered_password || o.password,
          delivered_at: o.delivered_at,
          verification_link: o.verification_link,
          text_input: o.text_input,
          device_fingerprint: o.device_fingerprint,
          created_at: o.created_at,
          updated_at: o.updated_at || o.created_at
        }, { onConflict: 'id' });
      }
      results.orders = orders.length;
    }

    // 10. Migrate order_messages
    console.log("Migrating order_messages...");
    const { data: orderMessages } = await oldSupabase.from("order_messages").select("*");
    if (orderMessages && orderMessages.length > 0) {
      for (const om of orderMessages) {
        await newSupabase.from("order_messages").upsert({
          id: om.id,
          order_id: om.order_id,
          message: om.message,
          sender_type: om.sender_type || (om.is_admin ? 'admin' : 'customer'),
          is_read: om.is_read || false,
          created_at: om.created_at
        }, { onConflict: 'id' });
      }
      results.order_messages = orderMessages.length;
    }

    // 11. Migrate stock_items
    console.log("Migrating stock_items...");
    const { data: stockItems } = await oldSupabase.from("stock_items").select("*");
    if (stockItems && stockItems.length > 0) {
      for (const si of stockItems) {
        await newSupabase.from("stock_items").upsert({
          id: si.id,
          product_id: si.product_id,
          product_option_id: si.product_option_id,
          content: si.content,
          is_sold: si.is_sold || false,
          sold_at: si.sold_at,
          sold_to_order_id: si.sold_to_order_id,
          created_at: si.created_at
        }, { onConflict: 'id' });
      }
      results.stock_items = stockItems.length;
    }

    // 12. Migrate recharge_requests
    console.log("Migrating recharge_requests...");
    const { data: rechargeRequests } = await oldSupabase.from("recharge_requests").select("*");
    if (rechargeRequests && rechargeRequests.length > 0) {
      for (const rr of rechargeRequests) {
        await newSupabase.from("recharge_requests").upsert({
          id: rr.id,
          token_id: rr.token_id,
          amount: rr.amount,
          payment_method: rr.payment_method,
          payment_method_id: rr.payment_method_id,
          proof_image_url: rr.proof_image_url || rr.payment_proof_url,
          sender_reference: rr.sender_reference || rr.transaction_reference,
          status: rr.status || 'pending',
          admin_note: rr.admin_note,
          processed_at: rr.processed_at,
          created_at: rr.created_at,
          updated_at: rr.updated_at || rr.created_at
        }, { onConflict: 'id' });
      }
      results.recharge_requests = rechargeRequests.length;
    }

    // 13. Migrate refund_requests
    console.log("Migrating refund_requests...");
    const { data: refundRequests } = await oldSupabase.from("refund_requests").select("*");
    if (refundRequests && refundRequests.length > 0) {
      for (const rf of refundRequests) {
        await newSupabase.from("refund_requests").upsert({
          id: rf.id,
          token_id: rf.token_id,
          order_id: rf.order_id,
          order_number: rf.order_number,
          reason: rf.reason,
          status: rf.status || 'pending',
          admin_notes: rf.admin_notes,
          processed_at: rf.processed_at,
          created_at: rf.created_at,
          updated_at: rf.updated_at || rf.created_at
        }, { onConflict: 'id' });
      }
      results.refund_requests = refundRequests.length;
    }

    // 14. Migrate admin_users
    console.log("Migrating admin_users...");
    const { data: adminUsers } = await oldSupabase.from("admin_users").select("*");
    if (adminUsers && adminUsers.length > 0) {
      for (const au of adminUsers) {
        await newSupabase.from("admin_users").upsert({
          id: au.id,
          username: au.username,
          password: au.password,
          is_active: au.is_active,
          can_manage_orders: au.can_manage_orders || false,
          can_manage_products: au.can_manage_products || false,
          can_manage_tokens: au.can_manage_tokens || false,
          can_manage_refunds: au.can_manage_refunds || false,
          can_manage_stock: au.can_manage_stock || false,
          can_manage_coupons: au.can_manage_coupons || false,
          can_manage_recharges: au.can_manage_recharges || false,
          can_manage_payment_methods: au.can_manage_payment_methods || false,
          can_manage_users: au.can_manage_users || false,
          created_at: au.created_at,
          updated_at: au.updated_at || au.created_at
        }, { onConflict: 'id' });
      }
      results.admin_users = adminUsers.length;
    }

    // 15. Migrate device_purchases
    console.log("Migrating device_purchases...");
    const { data: devicePurchases } = await oldSupabase.from("device_purchases").select("*");
    if (devicePurchases && devicePurchases.length > 0) {
      for (const dp of devicePurchases) {
        await newSupabase.from("device_purchases").upsert({
          id: dp.id,
          device_fingerprint: dp.device_fingerprint,
          product_option_id: dp.product_option_id,
          order_id: dp.order_id,
          quantity: dp.quantity || 1,
          created_at: dp.created_at
        }, { onConflict: 'id' });
      }
      results.device_purchases = devicePurchases.length;
    }

    console.log("Migration completed!", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Migration completed successfully!",
        migrated: results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Migration error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
