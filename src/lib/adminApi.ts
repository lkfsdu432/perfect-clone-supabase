const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EDGE_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
} as const;

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
      headers: EDGE_HEADERS,
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
      headers: EDGE_HEADERS,
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

// ========== NEWS ==========
export async function fetchNews() {
  return adminAction<{ news: any[] }>('fetch_news');
}

export async function addNews(title: string, content: string) {
  return adminAction('add_news', { title, content });
}

export async function updateNews(newsId: string, data: any) {
  return adminAction('update_news', { news_id: newsId, data });
}

export async function deleteNews(newsId: string) {
  return adminAction('delete_news', { news_id: newsId });
}

// ========== PRODUCTS ==========
export async function fetchProducts() {
  return adminAction<{ products: any[] }>('fetch_products');
}

export async function fetchProductOptions() {
  return adminAction<{ product_options: any[] }>('fetch_product_options');
}

export async function addProduct(data: any) {
  return adminAction('add_product', { data });
}

export async function updateProduct(productId: string, data: any) {
  return adminAction('update_product', { product_id: productId, data });
}

export async function deleteProduct(productId: string) {
  return adminAction('delete_product', { product_id: productId });
}

export async function addProductOption(data: any) {
  return adminAction('add_product_option', { data });
}

export async function updateProductOption(optionId: string, data: any) {
  return adminAction('update_product_option', { option_id: optionId, data });
}

export async function deleteProductOption(optionId: string) {
  return adminAction('delete_product_option', { option_id: optionId });
}

// ========== PAYMENT METHODS ==========
export async function fetchPaymentMethods() {
  return adminAction<{ payment_methods: any[] }>('fetch_payment_methods');
}

export async function addPaymentMethod(data: any) {
  return adminAction('add_payment_method', { data });
}

export async function updatePaymentMethod(paymentMethodId: string, data: any) {
  return adminAction('update_payment_method', { payment_method_id: paymentMethodId, data });
}

export async function deletePaymentMethod(paymentMethodId: string) {
  return adminAction('delete_payment_method', { payment_method_id: paymentMethodId });
}

// ========== COUPONS ==========
export async function fetchCoupons() {
  return adminAction<{ coupons: any[] }>('fetch_coupons');
}

export async function addCoupon(data: any) {
  return adminAction('add_coupon', { data });
}

export async function updateCoupon(couponId: string, data: any) {
  return adminAction('update_coupon', { coupon_id: couponId, data });
}

export async function deleteCoupon(couponId: string) {
  return adminAction('delete_coupon', { coupon_id: couponId });
}

// ========== SETTINGS ==========
export async function fetchSettings() {
  return adminAction<{ settings: any[] }>('fetch_settings');
}

export async function updateSetting(key: string, value: string) {
  return adminAction('update_setting', { key, value });
}

// ========== ADMIN USERS ==========
export async function addAdminUser(data: any) {
  return adminAction('add_admin_user', { data });
}

export async function updateAdminUser(adminUserId: string, data: any) {
  return adminAction('update_admin_user', { admin_user_id: adminUserId, data });
}

export async function deleteAdminUser(adminUserId: string) {
  return adminAction('delete_admin_user', { admin_user_id: adminUserId });
}
