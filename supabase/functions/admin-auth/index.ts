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
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin credentials
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username.trim())
      .eq('is_active', true)
      .maybeSingle();

    if (adminError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple password check (in production, use bcrypt)
    if (adminUser.password !== password) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return admin data with permissions
    return new Response(
      JSON.stringify({
        success: true,
        admin: {
          id: adminUser.id,
          username: adminUser.username,
          permissions: {
            is_super_admin: false,
            can_manage_orders: adminUser.can_manage_orders,
            can_manage_products: adminUser.can_manage_products,
            can_manage_tokens: adminUser.can_manage_tokens,
            can_manage_refunds: adminUser.can_manage_refunds,
            can_manage_stock: adminUser.can_manage_stock,
            can_manage_coupons: adminUser.can_manage_coupons,
            can_manage_recharges: adminUser.can_manage_recharges,
            can_manage_payment_methods: adminUser.can_manage_payment_methods,
            can_manage_users: adminUser.can_manage_users,
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
