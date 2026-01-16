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
    const { 
      token_value, 
      product_id, 
      product_option_id, 
      quantity = 1,
      email,
      password,
      verification_link,
      text_input,
      coupon_code,
      device_fingerprint
    } = await req.json();

    if (!token_value || !product_id || !product_option_id) {
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
      .select('id, balance, is_blocked')
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

    // Check for existing pending order
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('token_id', tokenData.id)
      .in('status', ['pending', 'in_progress'])
      .limit(1);

    if (pendingOrders && pendingOrders.length > 0) {
      return new Response(
        JSON.stringify({ error: 'You have a pending order', order_number: pendingOrders[0].order_number }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product option
    const { data: optionData, error: optionError } = await supabase
      .from('product_options')
      .select('id, product_id, name, price, is_active, type, requires_email, requires_password, requires_verification_link, requires_text_input')
      .eq('id', product_option_id)
      .eq('product_id', product_id)
      .maybeSingle();

    if (optionError || !optionData || !optionData.is_active) {
      console.error('Product option error:', optionError, 'Data:', optionData);
      return new Response(
        JSON.stringify({ error: 'Invalid product option' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Determine option type - use type field primarily, fallback to requires_* flags
    // Types: 'auto' = auto delivery from stock, 'email_password' = manual, 'none' = no requirements (auto), etc.
    const optionType = optionData.type || 'email_password';
    const isAutoDelivery = optionType === 'auto' || optionType === 'none';

    let basePrice = Number(optionData.price) * (isAutoDelivery ? quantity : 1);
    let discountAmount = 0;
    let appliedCouponCode = null;

    // Apply coupon if provided
    if (coupon_code) {
      const { data: couponData } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (couponData) {
        // Check product restriction
        if (!couponData.product_id || couponData.product_id === product_id) {
          // Check expiry
          if (!couponData.expires_at || new Date(couponData.expires_at) >= new Date()) {
            // Check max uses
            if (!couponData.max_uses || (couponData.used_count || 0) < couponData.max_uses) {
              appliedCouponCode = couponData.code;
              if (couponData.discount_type === 'percentage') {
                discountAmount = (basePrice * Number(couponData.discount_value)) / 100;
              } else {
                discountAmount = Math.min(Number(couponData.discount_value), basePrice);
              }
            }
          }
        }
      }
    }

    const totalPrice = basePrice - discountAmount;

    // Check balance
    if (Number(tokenData.balance) < totalPrice) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance', balance: tokenData.balance, required: totalPrice }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For auto-delivery, get stock items
    let stockContent = null;
    let stockIds: string[] = [];

    if (isAutoDelivery) {
      const { data: stockItems, error: stockError } = await supabase
        .from('stock_items')
        .select('id, content')
        .eq('product_option_id', product_option_id)
        .eq('is_sold', false)
        .limit(quantity);

      if (stockError || !stockItems || stockItems.length < quantity) {
        return new Response(
          JSON.stringify({ error: 'Not enough stock', available: stockItems?.length || 0 }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      stockContent = stockItems.map(s => s.content).join('\n---\n');
      stockIds = stockItems.map(s => s.id);
    }

    // Create order
    const orderData: Record<string, unknown> = {
      token_id: tokenData.id,
      product_id: product_id,
      product_option_id: product_option_id,
      quantity: isAutoDelivery ? quantity : 1,
      amount: totalPrice,
      total_price: totalPrice,
      discount_amount: discountAmount,
      coupon_code: appliedCouponCode,
      status: isAutoDelivery ? 'completed' : 'pending',
      device_fingerprint: device_fingerprint || null,
    };

    if (isAutoDelivery) {
      orderData.response_message = stockContent;
      orderData.stock_content = stockContent;
    } else if (optionData.requires_email && optionData.requires_password) {
      orderData.delivered_email = email;
      orderData.delivered_password = password;
    } else if (optionData.requires_verification_link) {
      orderData.verification_link = verification_link;
    } else if (optionData.requires_text_input) {
      orderData.text_input = text_input;
    }

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id, order_number, status, amount, response_message')
      .single();

    if (orderError || !newOrder) {
      console.error('Order creation error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark stock as sold
    if (stockIds.length > 0) {
      await supabase
        .from('stock_items')
        .update({
          is_sold: true,
          sold_at: new Date().toISOString(),
          sold_to_order_id: newOrder.id
        })
        .in('id', stockIds);
    }

    // Update coupon usage
    if (appliedCouponCode) {
      const { data: couponData } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('code', appliedCouponCode)
        .single();

      if (couponData) {
        await supabase
          .from('coupons')
          .update({ used_count: (couponData.used_count || 0) + 1 })
          .eq('code', appliedCouponCode);
      }
    }

    // Deduct balance
    const newBalance = Number(tokenData.balance) - totalPrice;
    await supabase
      .from('tokens')
      .update({ balance: newBalance })
      .eq('id', tokenData.id);

    // Record device purchase for tracking
    if (device_fingerprint) {
      await supabase.from('device_purchases').insert({
        device_fingerprint: device_fingerprint,
        product_option_id: product_option_id,
        order_id: newOrder.id,
        quantity: quantity
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: newOrder.id,
          order_number: newOrder.order_number,
          status: newOrder.status,
          amount: newOrder.amount,
          response_message: newOrder.response_message
        },
        new_balance: newBalance
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});