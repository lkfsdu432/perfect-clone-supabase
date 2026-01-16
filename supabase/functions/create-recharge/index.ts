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
      create_new_token,
      amount,
      payment_method_id,
      proof_image_url,
      sender_reference,
      user_ip
    } = await req.json();

    if (!amount || !payment_method_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let tokenId: string;
    let newTokenValue: string | null = null;

    if (create_new_token) {
      // Generate new token
      newTokenValue = 'TK-' + Math.random().toString(36).substring(2, 8).toUpperCase() + 
                      '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .insert({ 
          token: newTokenValue, 
          balance: 0,
          created_ip: user_ip || null
        })
        .select('id')
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: 'Failed to create token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      tokenId = tokenData.id;
    } else {
      if (!token_value) {
        return new Response(
          JSON.stringify({ error: 'Token value required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      tokenId = tokenData.id;
    }

    // Get payment method name
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('name')
      .eq('id', payment_method_id)
      .single();

    // Create recharge request
    const { data: rechargeData, error: rechargeError } = await supabase
      .from('recharge_requests')
      .insert({
        token_id: tokenId,
        amount: amount,
        payment_method: paymentMethod?.name || 'Unknown',
        payment_method_id: payment_method_id,
        proof_image_url: proof_image_url || null,
        sender_reference: sender_reference || null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (rechargeError || !rechargeData) {
      return new Response(
        JSON.stringify({ error: 'Failed to create recharge request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        recharge_id: rechargeData.id,
        new_token: newTokenValue
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating recharge:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
