import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const baseCorsHeaders = {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      token_id, 
      new_token, 
      amount, 
      payment_method, 
      payment_method_id, 
      proof_image_url, 
      sender_reference,
      user_ip
    } = await req.json();

    let finalTokenId = token_id;
    let createdToken: string | null = null;

    // إذا مفيش token_id يبقى لازم ننشئ توكن جديد
    if (!token_id && new_token) {
      // إنشاء توكن جديد
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .insert({ 
          token: new_token, 
          balance: 0,
          created_ip: user_ip || null
        })
        .select('id')
        .single();

      if (tokenError) {
        console.error('Token creation error:', tokenError);
        return new Response(
          JSON.stringify({ success: false, error: 'فشل إنشاء التوكن' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      finalTokenId = tokenData.id;
      createdToken = new_token;
    }

    if (!finalTokenId) {
      return new Response(
        JSON.stringify({ success: false, error: 'لازم token_id أو new_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // إنشاء طلب الشحن
    const { error: insertError } = await supabase
      .from('recharge_requests')
      .insert({
        token_id: finalTokenId,
        amount,
        payment_method,
        payment_method_id,
        proof_image_url,
        sender_reference: sender_reference || null,
        status: 'pending'
      });

    if (insertError) {
      console.error('Recharge request error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'فشل إرسال طلب الشحن' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        token_id: finalTokenId,
        created_token: createdToken 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'حدث خطأ' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
