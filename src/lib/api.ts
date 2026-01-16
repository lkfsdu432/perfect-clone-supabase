import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = "https://ymcabvghfecbbbugkpow.supabase.co";

interface TokenData {
  id: string;
  balance: number;
  is_blocked: boolean;
}

interface Order {
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

interface RechargeRequest {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  admin_note: string | null;
}

interface RefundRequest {
  id: string;
  order_number: string;
  reason: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  admin_notes: string | null;
}

interface TokenFullData {
  token: TokenData & { token: string; created_at: string };
  orders: Order[];
  recharges: RechargeRequest[];
  refunds: RefundRequest[];
}

// Verify token and get basic info
export async function verifyToken(tokenValue: string): Promise<TokenData | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token_value: tokenValue }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.found) {
      return null;
    }

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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token_value: tokenValue }),
    });

    if (!response.ok) {
      return null;
    }

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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_id: orderId, token_value: tokenValue }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error('Error getting order status:', error);
    return null;
  }
}
