const SUPABASE_URL = "https://ymcabvghfecbbbugkpow.supabase.co";

export interface AdminPermissions {
  is_super_admin: boolean;
  can_manage_orders: boolean;
  can_manage_products: boolean;
  can_manage_tokens: boolean;
  can_manage_refunds: boolean;
  can_manage_stock: boolean;
  can_manage_coupons: boolean;
  can_manage_recharges: boolean;
  can_manage_payment_methods: boolean;
  can_manage_users: boolean;
}

export interface AdminData {
  id: string;
  username: string;
  permissions: AdminPermissions;
}

const ADMIN_STORAGE_KEY = 'admin_session';

// Login admin
export async function adminLogin(username: string, password: string): Promise<{ success: boolean; admin?: AdminData; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'فشل تسجيل الدخول' };
    }

    // Store admin session
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data.admin));

    return { success: true, admin: data.admin };
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, error: 'خطأ في الاتصال' };
  }
}

// Get stored admin session
export function getAdminSession(): AdminData | null {
  try {
    const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading admin session:', e);
  }
  return null;
}

// Logout admin
export function adminLogout(): void {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
}

// Admin action (fetch/update data)
export async function adminAction<T = any>(
  action: string, 
  payload?: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  const admin = getAdminSession();
  
  if (!admin) {
    return { success: false, error: 'غير مصرح' };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        admin_id: admin.id, 
        action, 
        payload 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If unauthorized, clear session
      if (response.status === 401) {
        adminLogout();
      }
      return { success: false, error: data.error || 'فشل في تنفيذ العملية' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Admin action error:', error);
    return { success: false, error: 'خطأ في الاتصال' };
  }
}

// Fetch orders
export async function fetchOrders() {
  return adminAction<{ orders: any[] }>('fetch_orders');
}

// Fetch tokens
export async function fetchTokens() {
  return adminAction<{ tokens: any[] }>('fetch_tokens');
}

// Fetch recharges
export async function fetchRecharges() {
  return adminAction<{ recharges: any[] }>('fetch_recharges');
}

// Fetch refunds
export async function fetchRefunds() {
  return adminAction<{ refunds: any[] }>('fetch_refunds');
}

// Fetch stock
export async function fetchStock() {
  return adminAction<{ stock: any[] }>('fetch_stock');
}

// Fetch messages for order
export async function fetchMessages(orderId: string) {
  return adminAction<{ messages: any[] }>('fetch_messages', { order_id: orderId });
}

// Fetch admin users
export async function fetchAdminUsers() {
  return adminAction<{ admin_users: any[] }>('fetch_admin_users');
}

// Update order
export async function updateOrder(orderId: string, data: any) {
  return adminAction('update_order', { order_id: orderId, data });
}

// Update token
export async function updateToken(tokenId: string, data: any) {
  return adminAction('update_token', { token_id: tokenId, data });
}

// Update recharge
export async function updateRecharge(rechargeId: string, data: any) {
  return adminAction('update_recharge', { recharge_id: rechargeId, data });
}

// Update refund
export async function updateRefund(refundId: string, data: any) {
  return adminAction('update_refund', { refund_id: refundId, data });
}

// Send message
export async function sendAdminMessage(orderId: string, message: string) {
  return adminAction('send_message', { order_id: orderId, message });
}

// Add stock
export async function addStock(items: any[]) {
  return adminAction('add_stock', { items });
}

// Delete stock
export async function deleteStock(ids: string[]) {
  return adminAction('delete_stock', { ids });
}
