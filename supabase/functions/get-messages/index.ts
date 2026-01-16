import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token_value, order_id } = await req.json();

    if (!token_value || !order_id) {
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
      .select('id')
      .eq('token', token_value.trim())
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify order belongs to token
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', order_id)
      .eq('token_id', tokenData.id)
      .maybeSingle();

    if (orderError || !orderData) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('order_messages')
      .select('id, message, sender_type, is_admin, is_read, created_at')
      .eq('order_id', order_id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark customer messages as read (admin messages that customer is reading)
    const unreadAdminMessages = (messages || []).filter(m => 
      (m.sender_type === 'admin' || m.is_admin) && !m.is_read
    );

    if (unreadAdminMessages.length > 0) {
      await supabase
        .from('order_messages')
        .update({ is_read: true })
        .in('id', unreadAdminMessages.map(m => m.id));
    }

    return new Response(
      JSON.stringify({
        messages: messages || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting messages:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
