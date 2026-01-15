import { createClient } from 'npm:@supabase/supabase-js@2.90.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('=== create-order function called ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log('Processing POST request...');
    const body = await req.json();
    const {
      tokenValue,
      productId,
      productOptionId,
      quantity,
      email,
      password,
      verificationLink,
      couponCode,
      deviceFingerprint
    } = body;

    if (!tokenValue || !productId || !productOptionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'SERVER_MISCONFIGURED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token (case-insensitive)
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

    if (tokenData.is_blocked) {
      return new Response(
        JSON.stringify({ success: false, error: 'TOKEN_BLOCKED' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for pending orders
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('token_id', tokenData.id)
      .in('status', ['pending', 'in_progress'])
      .limit(1);

    if (pendingOrders && pendingOrders.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'HAS_PENDING_ORDER',
          message: `لديك طلب قيد التنفيذ #${pendingOrders[0].order_number}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch product option
    const { data: option, error: optionError } = await supabase
      .from('product_options')
      .select('*')
      .eq('id', productOptionId)
      .maybeSingle();

    if (optionError || !option) {
      return new Response(
        JSON.stringify({ success: false, error: 'OPTION_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAutoDelivery = option.type === 'none' || !option.type;
    const isChatType = option.type === 'chat';
    const orderQuantity = isAutoDelivery ? (quantity || 1) : (isChatType ? (quantity || 1) : 1);
    
    // Calculate price
    let basePrice = Number(option.price) * orderQuantity;
    let discountAmount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          discountAmount = (basePrice * coupon.discount_value) / 100;
        } else {
          discountAmount = Math.min(coupon.discount_value, basePrice);
        }
      }
    }

    const totalPrice = basePrice - discountAmount;

    // Check balance
    if (tokenData.balance < totalPrice) {
      return new Response(
        JSON.stringify({ success: false, error: 'INSUFFICIENT_BALANCE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check purchase limit
    if (option.purchase_limit && option.purchase_limit > 0 && deviceFingerprint) {
      const { data: purchaseData } = await supabase
        .from('device_purchases')
        .select('quantity')
        .eq('device_fingerprint', deviceFingerprint)
        .eq('product_option_id', productOptionId);

      const totalPurchased = purchaseData?.reduce((sum, record) => sum + (record.quantity || 1), 0) || 0;

      if (totalPurchased + orderQuantity > option.purchase_limit) {
        return new Response(
          JSON.stringify({ success: false, error: 'PURCHASE_LIMIT_REACHED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // For auto-delivery, check stock
    let stockItems: any[] = [];
    if (isAutoDelivery) {
      const { data: stock, error: stockError } = await supabase
        .from('stock_items')
        .select('id, content')
        .eq('product_option_id', productOptionId)
        .eq('is_sold', false)
        .limit(orderQuantity);

      if (stockError || !stock || stock.length < orderQuantity) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'INSUFFICIENT_STOCK',
            available: stock?.length || 0
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      stockItems = stock;
    }

    // Create order
    const orderStatus = isAutoDelivery ? 'completed' : 'pending';
    const combinedContent = isAutoDelivery ? stockItems.map(item => item.content).join('\n') : null;

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        token_id: tokenData.id,
        product_id: productId,
        product_option_id: productOptionId,
        quantity: orderQuantity,
        email: option.type === 'email_password' ? email : null,
        password: option.type === 'email_password' ? password : null,
        verification_link: option.type === 'link' ? verificationLink : (option.type === 'text' ? verificationLink : null),
        amount: totalPrice,
        total_price: totalPrice,
        discount_amount: discountAmount,
        coupon_code: couponCode || null,
        status: orderStatus,
        response_message: combinedContent,
        stock_content: combinedContent
      })
      .select('id, order_number')
      .single();

    if (orderError || !orderData) {
      console.error('Create order error:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'ORDER_CREATE_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct balance (must succeed)
    const newBalance = Number(tokenData.balance) - Number(totalPrice);
    const { error: balanceError } = await supabase
      .from('tokens')
      .update({ balance: newBalance })
      .eq('id', tokenData.id);

    if (balanceError) {
      console.error('Balance deduction failed:', balanceError);
      // best-effort rollback: delete order so we don't deliver without charging
      await supabase.from('orders').delete().eq('id', orderData.id);

      return new Response(
        JSON.stringify({ success: false, error: 'BALANCE_DEDUCT_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark stock as sold
    if (isAutoDelivery && stockItems.length > 0) {
      const stockIds = stockItems.map(item => item.id);
      const { error: stockUpdError } = await supabase
        .from('stock_items')
        .update({
          is_sold: true,
          sold_at: new Date().toISOString(),
          sold_to_order_id: orderData.id
        })
        .in('id', stockIds);

      if (stockUpdError) {
        console.error('Stock update failed:', stockUpdError);
      }
    }

    // Update coupon usage
    if (couponCode) {
      const { data: couponData } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('code', couponCode.toUpperCase().trim())
        .single();

      if (couponData) {
        const { error: couponUpdError } = await supabase
          .from('coupons')
          .update({ used_count: (couponData.used_count || 0) + 1 })
          .eq('code', couponCode.toUpperCase().trim());

        if (couponUpdError) {
          console.error('Coupon usage update failed:', couponUpdError);
        }
      }
    }

    // Record device purchase
    if (deviceFingerprint && option.purchase_limit && option.purchase_limit > 0) {
      const { error: devicePurchaseError } = await supabase.from('device_purchases').insert({
        device_fingerprint: deviceFingerprint,
        product_option_id: productOptionId,
        order_id: orderData.id,
        quantity: orderQuantity
      });

      if (devicePurchaseError) {
        console.error('Device purchase insert failed:', devicePurchaseError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: orderData.id,
          order_number: orderData.order_number,
          status: orderStatus,
          response_message: combinedContent
        },
        newBalance,
        isAutoDelivery
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== CRITICAL ERROR in create-order ===');
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error message:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('Error stack:', error.stack);
    }
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'INTERNAL_ERROR',
        message: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});