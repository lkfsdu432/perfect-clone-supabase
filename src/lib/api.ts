const SUPABASE_URL = "https://ymcabvghfecbbbugkpow.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yCJbSd21pHp6YsfEGdP4fg_eFqvd9im";
const EDGE_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
} as const;


export interface TokenData {
  id: string;
  balance: number;
  is_blocked: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  product_id: string | null;
  product_option_id: string | null;
  quantity: number;
  amount: number;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string | null;
  response_message: string | null;
  stock_content: string | null;
  delivered_email: string | null;
  delivered_password: string | null;
  delivered_at: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  verification_link?: string | null;
}

export interface RechargeRequest {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  admin_note: string | null;
}

export interface RefundRequest {
  id: string;
  order_number: string;
  reason: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  admin_notes: string | null;
}

export interface TokenFullData {
  token: TokenData & { token: string; created_at: string };
  orders: Order[];
  recharges: RechargeRequest[];
  refunds: RefundRequest[];
}

export interface Message {
  id: string;
  order_id?: string;
  message: string;
  sender_type: string;
  is_admin: boolean;
  is_read: boolean;
  created_at: string;
}

export interface CreateOrderParams {
  token_value: string;
  product_id: string;
  product_option_id: string;
  quantity?: number;
  email?: string;
  password?: string;
  verification_link?: string;
  text_input?: string;
  coupon_code?: string;
  device_fingerprint?: string;
}

export interface CreateOrderResult {
  success: boolean;
  order?: {
    id: string;
    order_number: string;
    status: string;
    amount: number;
    response_message: string | null;
  };
  new_balance?: number;
  error?: string;
}

// Verify token and get basic info
export async function verifyToken(tokenValue: string): Promise<TokenData | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-token`, {
      method: 'POST',
      headers: EDGE_HEADERS,
      body: JSON.stringify({ token_value: tokenValue }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.found) return null;

    return {
      id: data.id,
      balance: data.balance,
      is_blocked: data.is_blocked,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// Get all token data (orders, recharges, refunds)
export async function getTokenData(tokenValue: string): Promise<TokenFullData | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-token-data`, {
      method: 'POST',
      headers: EDGE_HEADERS,
      body: JSON.stringify({ token_value: tokenValue }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error getting token data:', error);
    return null;
  }
}

// Get order status (with token verification)
export async function getOrderStatus(orderId: string, tokenValue: string): Promise<Order | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-order-status`, {
      method: 'POST',
      headers: EDGE_HEADERS,
      body: JSON.stringify({ order_id: orderId, token_value: tokenValue }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error('Error getting order status:', error);
    return null;
  }
}

// Create order (secure via Edge Function)
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-order`, {
      method: 'POST',
      headers: EDGE_HEADERS,
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create order' };
    }

    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: 'Network error' };
  }
}

// Create recharge request
export async function createRecharge(params: {
  token_value?: string;
  create_new_token?: boolean;
  amount: number;
  payment_method_id: string;
  proof_image_url?: string;
  sender_reference?: string;
  user_ip?: string;
}): Promise<{ success: boolean; recharge_id?: string; new_token?: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-recharge`, {
      method: 'POST',
      headers: EDGE_HEADERS,
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create recharge' };
    }

    return data;
  } catch (error) {
    console.error('Error creating recharge:', error);
    return { success: false, error: 'Network error' };
  }
}

// Create refund request
export async function createRefund(params: {
  token_value: string;
  order_number: string;
  reason?: string;
}): Promise<{ success: boolean; refund_id?: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-refund`, {
      method: 'POST',
      headers: EDGE_HEADERS,
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create refund' };
    }

    return data;
  } catch (error) {
    console.error('Error creating refund:', error);
    return { success: false, error: 'Network error' };
  }
}

// Send message
export async function sendMessage(params: {
  token_value: string;
  order_id: string;
  message: string;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-message`, {
      method: 'POST',
      headers: EDGE_HEADERS,
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send message' };
    }

    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: 'Network error' };
  }
}

// Get messages
export async function getMessages(params: {
  token_value: string;
  order_id: string;
}): Promise<{ messages: Message[] } | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-messages`, {
      method: 'POST',
      headers: EDGE_HEADERS,
      body: JSON.stringify(params),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error getting messages:', error);
    return null;
  }
}

// Cancel order
export async function cancelOrder(params: {
  order_id: string;
  token_value: string;
}): Promise<{ success: boolean; new_balance?: number; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/cancel-order`, {
      method: 'POST',
      headers: EDGE_HEADERS,
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to cancel order' };
    }

    return data;
  } catch (error) {
    console.error('Error cancelling order:', error);
    return { success: false, error: 'Network error' };
  }
}
