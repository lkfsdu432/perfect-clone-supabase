import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token, action, amount } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify token exists and get balance
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('id, balance, is_blocked')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (tokenData.is_blocked) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token is blocked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different actions
    if (action === 'verify') {
      // Just verify and return balance
      return new Response(
        JSON.stringify({ 
          valid: true, 
          token_id: tokenData.id,
          balance: tokenData.balance 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'deduct' && amount) {
      // Check if enough balance
      if (tokenData.balance < amount) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Insufficient balance' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Deduct balance
      const newBalance = tokenData.balance - amount
      const { error: updateError } = await supabase
        .from('tokens')
        .update({ balance: newBalance })
        .eq('id', tokenData.id)

      if (updateError) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Failed to update balance' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          valid: true, 
          token_id: tokenData.id,
          balance: newBalance,
          deducted: amount
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'add' && amount) {
      // Add balance
      const newBalance = tokenData.balance + amount
      const { error: updateError } = await supabase
        .from('tokens')
        .update({ balance: newBalance })
        .eq('id', tokenData.id)

      if (updateError) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Failed to update balance' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          valid: true, 
          token_id: tokenData.id,
          balance: newBalance,
          added: amount
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default: just return validation
    return new Response(
      JSON.stringify({ 
        valid: true, 
        token_id: tokenData.id,
        balance: tokenData.balance 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
