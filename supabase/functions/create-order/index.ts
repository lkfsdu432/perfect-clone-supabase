import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('id, balance, is_blocked')
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

    // Mark stock as sold
    if (isAutoDelivery && stockItems.length > 0) {
      const stockIds = stockItems.map(item => item.id);
      await supabase
        .from('stock_items')
        .update({
          is_sold: true,
          sold_at: new Date().toISOString(),
          sold_to_order_id: orderData.id
        })
        .in('id', stockIds);
    }

    // Update coupon usage
    if (couponCode) {
      const { data: couponData } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('code', couponCode.toUpperCase().trim())
        .single();

      if (couponData) {
        await supabase
          .from('coupons')
          .update({ used_count: (couponData.used_count || 0) + 1 })
          .eq('code', couponCode.toUpperCase().trim());
      }
    }

    // Deduct balance
    const newBalance = tokenData.balance - totalPrice;
    await supabase
      .from('tokens')
      .update({ balance: newBalance })
      .eq('id', tokenData.id);

    // Record device purchase
    if (deviceFingerprint && option.purchase_limit && option.purchase_limit > 0) {
      await supabase.from('device_purchases').insert({
        device_fingerprint: deviceFingerprint,
        product_option_id: productOptionId,
        order_id: orderData.id,
        quantity: orderQuantity
      });
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
    console.error('Create order error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});