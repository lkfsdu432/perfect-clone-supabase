import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ActionType = 'approve' | 'reject';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, action, adminNote } = (await req.json()) as {
      requestId?: string;
      action?: ActionType;
      adminNote?: string | null;
    };

    if (!requestId || !action || (action !== 'approve' && action !== 'reject')) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_INPUT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Verify caller is a logged-in admin (using the JWT from request headers)
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!jwt) {
      return new Response(
        JSON.stringify({ success: false, error: 'MISSING_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'INVALID_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // 2) Use service role for DB operations (bypass RLS) but only after admin check
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminRow, error: adminError } = await supabase
      .from('admin_auth')
      .select('is_super_admin, can_manage_recharges')
      .eq('user_id', userId)
      .maybeSingle();

    if (adminError || !adminRow || (!adminRow.is_super_admin && !adminRow.can_manage_recharges)) {
      return new Response(
        JSON.stringify({ success: false, error: 'FORBIDDEN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3) Fetch request
    const { data: reqRow, error: reqError } = await supabase
      .from('recharge_requests')
      .select('id, token_id, amount, status')
      .eq('id', requestId)
      .maybeSingle();

    if (reqError || !reqRow) {
      return new Response(
        JSON.stringify({ success: false, error: 'REQUEST_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (reqRow.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: 'ALREADY_PROCESSED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4) If approve => add balance
    let newBalance: number | null = null;
    if (action === 'approve') {
      if (!reqRow.token_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'MISSING_TOKEN_ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: tokenRow, error: tokenError } = await supabase
        .from('tokens')
        .select('id, balance')
        .eq('id', reqRow.token_id)
        .maybeSingle();

      if (tokenError || !tokenRow) {
        return new Response(
          JSON.stringify({ success: false, error: 'TOKEN_NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      newBalance = Number(tokenRow.balance || 0) + Number(reqRow.amount || 0);

      const { error: updTokenError } = await supabase
        .from('tokens')
        .update({ balance: newBalance })
        .eq('id', tokenRow.id);

      if (updTokenError) {
        return new Response(
          JSON.stringify({ success: false, error: 'TOKEN_UPDATE_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5) Update request status
    const { error: updReqError } = await supabase
      .from('recharge_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_note: adminNote || null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'pending');

    if (updReqError) {
      return new Response(
        JSON.stringify({ success: false, error: 'REQUEST_UPDATE_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        requestId,
        newBalance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('process-recharge error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
