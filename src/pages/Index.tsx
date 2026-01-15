import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import NewsSection from '@/components/NewsSection';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Search, CheckCircle, AlertCircle, Loader2, Clock, XCircle, CheckCircle2, Copy, MessageCircle, Ticket, Ban, CreditCard, RotateCcw, Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import OrderChat from '@/components/OrderChat';
import useDeviceFingerprint from '@/hooks/useDeviceFingerprint';
import useDevToolsProtection from '@/hooks/useDevToolsProtection';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  duration: string | null;
  available: number | null;
}

interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  price: number;
  duration: string | null;
  available: number | null;
  type: string | null;
  description: string | null;
  estimated_time: string | null;
  is_active: boolean;
  purchase_limit: number | null;
  max_quantity_per_order: number | null;
  required_text_info: string | null;
}

interface Order {
  id: string;
  order_number: string;
  product_id: string | null;
  product_option_id: string | null;
  amount: number;
  status: string;
  created_at: string;
  response_message: string | null;
}

interface RechargeRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method: string;
  admin_note: string | null;
}

interface ActiveOrder {
  id: string;
  order_number: string;
  status: string;
  response_message: string | null;
  product_id: string | null;
  product_option_id: string | null;
  amount: number;
  verification_link?: string | null;
    delivered_email: string | null;
  delivered_password: string | null;
  admin_notes: string | null;
  delivered_at: string | null;
}

interface RefundRequest {
  id: string;
  order_number: string;
  status: string;
  reason: string | null;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

const ACTIVE_ORDER_KEY = 'active_order';

const Index = () => {
  // Enable DevTools protection
  useDevToolsProtection();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [token, setToken] = useState('');
  const [verificationLink, setVerificationLink] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [textInput, setTextInput] = useState('');
  const [step, setStep] = useState<'initial' | 'details' | 'waiting' | 'result'>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenData, setTokenData] = useState<{ id: string; balance: number } | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('pending');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [tokenOrders, setTokenOrders] = useState<Order[]>([]);
  const [tokenRecharges, setTokenRecharges] = useState<RechargeRequest[]>([]);
  const [tokenRefunds, setTokenRefunds] = useState<RefundRequest[]>([]);
  const [optionStockCounts, setOptionStockCounts] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [chatAccountsCount, setChatAccountsCount] = useState(1); // عدد الحسابات للشات
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [checkingActiveOrder, setCheckingActiveOrder] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: 'percentage' | 'fixed'; discount_value: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [purchaseLimitError, setPurchaseLimitError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { fingerprint, getFingerprint } = useDeviceFingerprint();
  const product = products.find(p => p.id === selectedProductId);
  const options = productOptions.filter(o => o.product_id === selectedProductId);
  const selectedOption = productOptions.find(o => o.id === selectedOptionId);

  // Check for active order on mount
  useEffect(() => {
    const checkActiveOrder = async () => {
      const stored = localStorage.getItem(ACTIVE_ORDER_KEY);
      if (stored) {
        const { orderId, tokenValue, productId, optionId } = JSON.parse(stored);

        // Fetch order status from database
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, order_number, status, response_message, product_id, product_option_id, amount, total_price')
          .eq('id', orderId)
          .maybeSingle();

        if (orderData) {
          // If order is still pending or in_progress, show it
          if (orderData.status === 'pending' || orderData.status === 'in_progress') {
            setActiveOrder({
              ...orderData,
              amount: orderData.amount || orderData.total_price,
              delivered_email: (orderData as any).delivered_email || null,
              delivered_password: (orderData as any).delivered_password || null,
              admin_notes: (orderData as any).admin_notes || null,
              delivered_at: (orderData as any).delivered_at || null
            });
            setToken(tokenValue);
            
            // استعادة المنتج والخيار المحددين
            if (orderData.product_id) {
              setSelectedProductId(orderData.product_id);
            }
            if (orderData.product_option_id) {
              setSelectedOptionId(orderData.product_option_id);
            }

            // Fetch token data
            const tokenDataResult = await verifyToken(tokenValue);
            if (tokenDataResult) {
              setTokenData(tokenDataResult);
              setTokenBalance(Number(tokenDataResult.balance));
              // الانتقال إلى صفحة التفاصيل لعرض الطلب النشط
              setStep('details');
            }
          } else {
            // Order is completed or rejected, clear storage
            localStorage.removeItem(ACTIVE_ORDER_KEY);
          }
        } else {
          localStorage.removeItem(ACTIVE_ORDER_KEY);
        }
      }
      setCheckingActiveOrder(false);
    };

    checkActiveOrder();
    fetchProducts();
  }, []);

  // Subscribe to active order updates
  useEffect(() => {
    if (!activeOrder) return;

    const applyActiveOrderUpdate = async (updated: ActiveOrder) => {
      if (updated.status === 'completed' || updated.status === 'rejected') {
        // لا نقوم بردّ الرصيد من هنا لتفادي التكرار (الرد يتم من لوحة الأدمن)
        if (updated.status === 'rejected' && tokenData) {
          const { data: currentToken } = await supabase
            .from('tokens')
            .select('balance')
            .eq('id', tokenData.id)
            .maybeSingle();

          if (currentToken) {
            setTokenBalance(Number(currentToken.balance));
          }
        }

        // Clear active order
        localStorage.removeItem(ACTIVE_ORDER_KEY);
        setActiveOrder(null);
        setResponseMessage(updated.response_message);
        setResult(updated.status === 'completed' ? 'success' : 'error');
        setStep('result');
        return;
      }

      if (updated.status === 'cancelled') {
        // Order cancelled (by customer/admin)
        localStorage.removeItem(ACTIVE_ORDER_KEY);
        setActiveOrder(null);
        setCurrentOrderId(null);
        setOrderStatus('pending');
        setResponseMessage(null);
        setResult(null);
        setStep('initial');

        // تحديث الرصيد من قاعدة البيانات (في حالة تم ردّ المبلغ من الأدمن)
        if (tokenData) {
          const { data: currentToken } = await supabase
            .from('tokens')
            .select('balance')
            .eq('id', tokenData.id)
            .maybeSingle();

          if (currentToken) {
            setTokenBalance(Number(currentToken.balance));
          }
        }

        toast({ title: 'تم إلغاء الطلب', description: 'تم إلغاء الطلب' });
        return;
      }

      setActiveOrder(updated);
    };

    const channel = supabase
      .channel(`active-order-${activeOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrder.id}`,
        },
        async (payload) => {
          await applyActiveOrderUpdate(payload.new as ActiveOrder);
        }
      )
      .subscribe();

    // Fallback polling (لو الريل-تايم اتأخر/مش شغال، نزامن الحالة كل 2.5 ثانية)
    const interval = window.setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, response_message, product_id, product_option_id, amount, total_price')
        .eq('id', activeOrder.id)
        .maybeSingle();

      if (!data) return;

      const synced: ActiveOrder = {
        ...data,
        amount: (data as any).amount ?? (data as any).total_price ?? activeOrder.amount,
        delivered_email: (data as any).delivered_email || null,
        delivered_password: (data as any).delivered_password || null,
        admin_notes: (data as any).admin_notes || null,
        delivered_at: (data as any).delivered_at || null
      };

      // قلل الـ rerenders
      if (
        synced.status !== activeOrder.status ||
        synced.response_message !== activeOrder.response_message
      ) {
        await applyActiveOrderUpdate(synced);
      }
    }, 2500);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id, activeOrder?.status, activeOrder?.response_message, tokenData?.id]);

  const fetchProducts = async () => {
    const { data: productsData } = await supabase.from('products').select('*').eq('is_active', true).order('name');
    const { data: optionsData } = await supabase.from('product_options').select('*').eq('is_active', true);

    // Fetch stock counts using secure view
    const { data: stockData } = await supabase
      .from('stock_availability')
      .select('product_option_id, available_count');

    // Build counts from view data
    const counts: Record<string, number> = {};
    stockData?.forEach(item => {
      if (item.product_option_id) {
        counts[item.product_option_id] = item.available_count || 0;
      }
    });

    setProducts(productsData || []);
    setProductOptions((optionsData || []).map(opt => ({
      ...opt,
      is_active: opt.is_active ?? true
    })));
    setOptionStockCounts(counts);
  };

  const verifyToken = async (tokenValue: string) => {
    const normalized = tokenValue.trim();
    if (!normalized) return null;

    // 1) Prefer DB RPC (works even when tokens table SELECT is blocked)
    try {
      const { data, error } = await supabase.rpc('verify_token_public', {
        token_value: normalized,
      });

      if (!error && data && (data as any).id) {
        return data as any;
      }

      if (error) {
        console.warn('verify_token_public rpc error:', error);
      }
    } catch (err) {
      console.warn('verify_token_public rpc exception:', err);
    }

    // 2) Fallback to Edge Function (if deployed)
    try {
      const { data, error } = await supabase.functions.invoke('verify-token', {
        body: { token: normalized },
      });

      if (!error && data?.success && data?.token?.id) {
        return data.token;
      }

      console.warn('verify-token function failed:', {
        error,
        response: data,
      });
    } catch (err) {
      console.warn('verify-token function exception:', err);
    }

    // 3) Last resort: direct DB SELECT (works only if RLS allows it)
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('id, balance, is_blocked')
        .ilike('token', normalized)
        .maybeSingle();

      if (!error && data?.id) {
        return data as any;
      }

      if (error) {
        console.warn('tokens direct select error:', error);
      }
    } catch (err) {
      console.warn('tokens direct select exception:', err);
    }

    return null;
  };

  const handleBuySubmit = async () => {
    if (!token.trim() || !product || !selectedOption) return;

    setIsLoading(true);
    const data = await verifyToken(token);

    if (!data) {
      setIsLoading(false);
      toast({
        title: 'خطأ',
        description: 'التوكن غير صالح',
        variant: 'destructive',
      });
      return;
    }

    if (data.is_blocked) {
      setIsLoading(false);
      toast({
        title: 'خطأ',
        description: 'هذا التوكن محظور ولا يمكن استخدامه للشراء',
        variant: 'destructive',
      });
      return;
    }

    // التحقق من وجود طلب نشط - يتم التحقق عبر Edge Function عند إنشاء الطلب
    // لا حاجة للتحقق هنا - سيتم التحقق في handleOrderSubmit

    setIsLoading(false);
    setTokenData(data);
    setTokenBalance(Number(data.balance));
    setStep('details');
  };

  const applyCoupon = async () => {
  if (!couponCode.trim()) return;

  setCouponLoading(true);
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', couponCode.toUpperCase().trim())
    .eq('is_active', true)
    .maybeSingle();

  setCouponLoading(false);

  if (error || !data) {
    toast({
      title: 'خطأ',
      description: 'كود الكوبون غير صالح',
      variant: 'destructive',
    });
    return;
  }

  // Check if coupon is for specific product
  if (data.product_id && product && data.product_id !== product.id) {
    toast({
      title: 'خطأ',
      description: 'هذا الكوبون غير صالح لهذا المنتج',
      variant: 'destructive',
    });
    return;
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    toast({
      title: 'خطأ',
      description: 'كود الكوبون منتهي الصلاحية',
      variant: 'destructive',
    });
    return;
  }

  // Check max uses
  if (data.max_uses && data.used_count >= data.max_uses) {
    toast({
      title: 'خطأ',
      description: 'تم استخدام الكوبون الحد الأقصى للمرات',
      variant: 'destructive',
    });
    return;
  }

  setAppliedCoupon({
    code: data.code,
    discount_type: data.discount_type as 'percentage' | 'fixed',
    discount_value: Number(data.discount_value)
  });


    toast({
      title: 'تم',
      description: `تم تطبيق كوبون خصم ${data.discount_value}${data.discount_type === 'percentage' ? '%' : '$'}`,
    });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const calculateDiscount = (price: number) => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return (price * appliedCoupon.discount_value) / 100;
    }
    return Math.min(appliedCoupon.discount_value, price);
  };

  const handleOrderSubmit = async () => {
    if (!selectedOption || !tokenData || !product) return;

    if (selectedOption.type === 'link' && !verificationLink.trim()) return;
    if (selectedOption.type === 'email_password' && (!email.trim() || !password.trim())) return;
    if (selectedOption.type === 'text' && !textInput.trim()) return;

    const isAutoDelivery = selectedOption.type === 'none' || !selectedOption.type;
    const basePrice = isAutoDelivery ? Number(selectedOption.price) * quantity : Number(selectedOption.price);
    const discountAmount = calculateDiscount(basePrice);
    const totalPrice = basePrice - discountAmount;

    // Debug logging
    console.log('Order calculation:', {
      isAutoDelivery,
      optionPrice: selectedOption.price,
      quantity,
      basePrice,
      discountAmount,
      totalPrice,
      currentBalance: tokenBalance
    });

    if (tokenBalance === null || tokenBalance < totalPrice) {
      setResult('error');
      setStep('result');
      return;
    }

    setIsLoading(true);
    setPurchaseLimitError(null);

    // Check purchase limit for this device
const deviceFingerprint = getFingerprint();
if (selectedOption.purchase_limit && selectedOption.purchase_limit > 0 && deviceFingerprint) {
  const { data: purchaseData, error: countError } = await supabase
    .from('device_purchases')
    .select('quantity')
    .eq('device_fingerprint', deviceFingerprint)
    .eq('product_option_id', selectedOption.id);

  const totalPurchased = purchaseData?.reduce((sum, record) => sum + (record.quantity || 1), 0) || 0;

  if (!countError && totalPurchased + quantity > selectedOption.purchase_limit) {
    setPurchaseLimitError(`لقد وصلت للحد الأقصى للشراء (${selectedOption.purchase_limit}) لهذا المنتج من هذا الجهاز`);
    toast({
      title: 'تم الوصول للحد الأقصى',
      description: `لا يمكنك شراء أكثر من ${selectedOption.purchase_limit} من هذا المنتج`,
      variant: 'destructive',
    });
    setIsLoading(false);
    return;
  }
}

    // Create order via Edge Function (handles stock + coupons + balance deduction server-side)
    const requestedQuantity = isAutoDelivery
      ? quantity
      : selectedOption.type === 'chat'
        ? chatAccountsCount
        : 1;

    const effectiveBasePrice = Number(selectedOption.price) * requestedQuantity;
    const effectiveDiscountAmount = calculateDiscount(effectiveBasePrice);
    const effectiveTotalPrice = effectiveBasePrice - effectiveDiscountAmount;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-order', {
        body: {
          tokenValue: token.trim(),
          productId: product.id,
          productOptionId: selectedOption.id,
          quantity: requestedQuantity,
          email: selectedOption.type === 'email_password' ? email : null,
          password: selectedOption.type === 'email_password' ? password : null,
          verificationLink:
            selectedOption.type === 'link'
              ? verificationLink
              : selectedOption.type === 'text'
                ? textInput
                : null,
          couponCode: appliedCoupon?.code || null,
          deviceFingerprint,
        },
      });

      if (fnError || !data?.success) {
        const errorCode = data?.error || 'UNKNOWN';
        let description = 'فشل في إرسال الطلب';

        if (errorCode === 'INSUFFICIENT_BALANCE') description = 'الرصيد غير كافي';
        if (errorCode === 'HAS_PENDING_ORDER') description = data?.message || 'لديك طلب قيد التنفيذ';
        if (errorCode === 'PURCHASE_LIMIT_REACHED') description = 'لقد وصلت للحد الأقصى للشراء لهذا المنتج من هذا الجهاز';
        if (errorCode === 'INSUFFICIENT_STOCK') description = `المخزون غير كافي. متوفر فقط ${data?.available ?? 0} قطعة`;
        if (errorCode === 'BALANCE_DEDUCT_FAILED') description = 'حدث خطأ أثناء خصم الرصيد (راجع إعدادات قاعدة البيانات)';

        toast({
          title: 'خطأ',
          description,
          variant: 'destructive',
        });

        setIsLoading(false);
        return;
      }

      // Keep UI in sync with the backend balance (deducted server-side)
      const newBalance = Number(data.newBalance);
      setTokenBalance(newBalance);

      if (data.isAutoDelivery) {
        // Update local stock count (UI only)
        setOptionStockCounts((prev) => ({
          ...prev,
          [selectedOption.id]: (prev[selectedOption.id] || 0) - requestedQuantity,
        }));

        setResponseMessage(data.order?.response_message || null);
        setResult('success');
        setIsLoading(false);
        setStep('result');
        setAppliedCoupon(null);
        setCouponCode('');
        return;
      }

      // Manual / chat orders: store active order and wait for processing
      localStorage.setItem(
        ACTIVE_ORDER_KEY,
        JSON.stringify({
          orderId: data.order.id,
          tokenValue: token,
        })
      );

      setActiveOrder({
        id: data.order.id,
        order_number: data.order.order_number,
        status: 'pending',
        response_message: null,
        product_id: product.id,
        product_option_id: selectedOption.id,
        amount: effectiveTotalPrice,
        delivered_email: null,
        delivered_password: null,
        admin_notes: null,
        delivered_at: null,
      });

      setCurrentOrderId(data.order.id);
      setOrderStatus('pending');
      setResponseMessage(null);
      setIsLoading(false);
      setAppliedCoupon(null);
      setCouponCode('');
      // Stay on same page - don't change step
    } catch (e) {
      console.error('create-order invoke failed:', e);
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال الطلب',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
  };

  const handleReset = () => {
    localStorage.removeItem(ACTIVE_ORDER_KEY);
    setActiveOrder(null);
    setToken('');
    setVerificationLink('');
    setEmail('');
    setPassword('');
    setTextInput('');
    setSelectedProductId('');
    setSelectedOptionId('');
    setQuantity(1);
    setStep('initial');
    setResult(null);
    setTokenData(null);
    setTokenBalance(null);
    setCurrentOrderId(null);
    setOrderStatus('pending');
    setResponseMessage(null);
  };

  // Cancel order function - using Edge Function to bypass RLS
  const handleCancelOrder = async () => {
    if (!activeOrder || !tokenData) return;

    // UI already disables this, but keep a hard guard
    if (activeOrder.status === 'in_progress') {
      toast({
        title: 'لا يمكن الإلغاء',
        description: 'لا يمكن إلغاء الطلب لأن الطلب قيد التنفيذ',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // تأكيد حالة الطلب من قاعدة البيانات
      const { data: orderRow, error: orderFetchError } = await supabase
        .from('orders')
        .select('status, amount, total_price')
        .eq('id', activeOrder.id)
        .maybeSingle();

      if (orderFetchError) throw orderFetchError;

      if (!orderRow) {
        localStorage.removeItem(ACTIVE_ORDER_KEY);
        setActiveOrder(null);
        setCurrentOrderId(null);
        setStep('initial');
        toast({ title: 'تنبيه', description: 'الطلب غير موجود' });
        return;
      }

      // لو الحالة اتغيرت بالفعل
      if (orderRow.status !== 'pending') {
        setActiveOrder((prev) => (prev ? { ...prev, status: orderRow.status } : prev));
        toast({
          title: 'لا يمكن الإلغاء',
          description:
            orderRow.status === 'cancelled'
              ? 'تم إلغاء الطلب بالفعل'
              : 'الطلب انتقل إلى قيد التنفيذ قبل الإلغاء لذلك لا يمكن إلغاؤه',
          variant: 'destructive',
        });
        return;
      }

      const refundAmount = Number(orderRow.amount ?? orderRow.total_price ?? activeOrder.amount ?? 0);

      // Try Edge Function first (bypasses RLS)
      let cancelSuccess = false;
      let newBalance = 0;

      try {
        const { data, error } = await supabase.functions.invoke('cancel-order', {
          body: {
            orderId: activeOrder.id,
            tokenId: tokenData.id,
          },
        });

        if (!error && data?.success) {
          cancelSuccess = true;
          newBalance = data.newBalance;
        }
      } catch {
        // Edge function not available, fallback to direct update
      }

      // Fallback: Direct database update if Edge Function failed
      if (!cancelSuccess) {
        // Update order status to cancelled
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', activeOrder.id)
          .eq('status', 'pending');

        if (updateError) throw updateError;

        // Verify the update
        const { data: confirmedOrder } = await supabase
          .from('orders')
          .select('status')
          .eq('id', activeOrder.id)
          .maybeSingle();

        if (!confirmedOrder || confirmedOrder.status !== 'cancelled') {
          // RLS might have blocked the update
          toast({
            title: 'لا يمكن الإلغاء',
            description: 'لم يتم تنفيذ الإلغاء - تأكد من وجود صلاحية UPDATE على جدول orders في Supabase.',
            variant: 'destructive',
          });
          return;
        }

        // Refund balance
        const { data: currentToken } = await supabase
          .from('tokens')
          .select('balance')
          .eq('id', tokenData.id)
          .maybeSingle();

        if (!currentToken) throw new Error('TOKEN_NOT_FOUND');

        newBalance = Number(currentToken.balance) + refundAmount;
        const { error: tokenError } = await supabase
          .from('tokens')
          .update({ balance: newBalance })
          .eq('id', tokenData.id);

        if (tokenError) throw tokenError;
      }

      // تحديث واجهة سجل الطلبات فوراً
      setTokenOrders((prev) =>
        prev.map((o) => (o.id === activeOrder.id ? { ...o, status: 'cancelled' } : o))
      );

      // Update local state
      setTokenBalance(newBalance);
      localStorage.removeItem(ACTIVE_ORDER_KEY);
      setActiveOrder(null);
      setCurrentOrderId(null);
      setOrderStatus('pending');
      setResponseMessage(null);
      setResult(null);
      setStep('initial');

      toast({
        title: 'تم إلغاء الطلب',
        description: `تم إرجاع $${refundAmount.toFixed(2)} إلى رصيدك`,
      });

      // Refresh orders list
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('token_id', tokenData.id)
        .order('created_at', { ascending: false });

      setTokenOrders(
        (ordersData || []).map((o: any) => ({
          ...o,
          amount: o.amount || o.total_price,
        }))
      );
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إلغاء الطلب - تأكد من وجود صلاحية UPDATE على جدول orders في Supabase.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to order updates in real-time
  useEffect(() => {
    if (!currentOrderId || step !== 'waiting') return;

    const channel = supabase
      .channel(`order-${currentOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${currentOrderId}`
        },
        async (payload) => {
          const updatedOrder = payload.new as { status: string; response_message: string | null; amount: number };
          setOrderStatus(updatedOrder.status);
          setResponseMessage(updatedOrder.response_message);

          if (updatedOrder.status === 'cancelled') {
            // لو الطلب اتلغى (من العميل أو الأدمن)
            localStorage.removeItem(ACTIVE_ORDER_KEY);
            setActiveOrder(null);
            setCurrentOrderId(null);
            setOrderStatus('pending');
            setResponseMessage(null);
            setResult(null);
            setStep('initial');

            // تحديث الرصيد عبر RPC
            if (token) {
              const { data: refreshed } = await supabase
                .rpc('verify_token', { p_token: token.trim() })
                .maybeSingle();
              const row = refreshed as { balance: number } | null;
              if (row) setTokenBalance(Number(row.balance));
            }

            toast({ title: 'تم إلغاء الطلب', description: 'تم إلغاء الطلب' });
            return;
          }

          // Only show result for completed or rejected status
          if (updatedOrder.status === 'completed' || updatedOrder.status === 'rejected') {
            // لا نقوم بردّ الرصيد من هنا لتفادي التكرار (الرد يتم من لوحة الأدمن)
            if (updatedOrder.status === 'rejected' && token) {
              const { data: refreshed } = await supabase
                .rpc('verify_token', { p_token: token.trim() })
                .maybeSingle();

              const row = refreshed as { balance: number } | null;
              if (row) {
                setTokenBalance(Number(row.balance));
              }
            }

            setResult(updatedOrder.status === 'completed' ? 'success' : 'error');
            setStep('result');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrderId, step, tokenData, tokenBalance]);

  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
    setSelectedOptionId('');
    setQuantity(1);
  };

  const handleOptionChange = (value: string) => {
    setSelectedOptionId(value);
    setQuantity(1);
  };

  const handleShowBalance = async () => {
    if (!token.trim()) return;

    setIsLoading(true);

    const tokenValue = token.trim();

    // 1) Try Edge Function (fast path if deployed)
    try {
      const { data, error } = await supabase.functions.invoke('get-token-orders', {
        body: { tokenValue },
      });

      if (!error && data?.success) {
        setTokenData(data.token);
        setTokenBalance(Number(data.token.balance));
        setShowBalance(true);
        setTokenOrders((data.orders || []).map((o: any) => ({
          ...o,
          amount: o.amount || o.total_price,
        })));
        setTokenRecharges(data.recharges || []);
        setTokenRefunds(data.refunds || []);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('get-token-orders failed, falling back:', err);
    }

    // 2) Fallback: verify token via RPC/verify-token and fetch related tables
    const tokenResult = await verifyToken(tokenValue);
    if (!tokenResult) {
      toast({
        title: 'خطأ',
        description: 'التوكن غير صالح',
        variant: 'destructive',
      });
      setShowBalance(false);
      setTokenOrders([]);
      setTokenRecharges([]);
      setTokenRefunds([]);
      setIsLoading(false);
      return;
    }

    setTokenData(tokenResult);
    setTokenBalance(Number((tokenResult as any).balance));
    setShowBalance(true);

    const [ordersRes, rechargesRes, refundsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('token_id', (tokenResult as any).id)
        .order('created_at', { ascending: false }),
      supabase
        .from('recharge_requests')
        .select('*')
        .eq('token_id', (tokenResult as any).id)
        .order('created_at', { ascending: false }),
      supabase
        .from('refund_requests')
        .select('*')
        .eq('token_id', (tokenResult as any).id)
        .order('created_at', { ascending: false }),
    ]);

    setTokenOrders((ordersRes.data || []).map((o: any) => ({
      ...o,
      amount: o.amount || o.total_price,
    })));
    setTokenRecharges(rechargesRes.data || []);
    setTokenRefunds(refundsRes.data || []);

    setIsLoading(false);
  };

  // Real-time تحديث سجل الطلبات والرصيد بعد عرض الرصيد (بدون ريفريش)
  // + Polling بسيط كـ fallback لو الـ real-time مش شغال على بعض الجداول
  useEffect(() => {
    if (!showBalance || !tokenData?.id) return;

    const refetchOrders = async () => {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('token_id', tokenData.id)
        .order('created_at', { ascending: false });

      setTokenOrders((ordersData || []).map((o: any) => ({
        ...o,
        amount: o.amount || o.total_price,
      })));
    };

    const refetchBalance = async () => {
      const { data: currentToken } = await supabase
        .from('tokens')
        .select('balance')
        .eq('id', tokenData.id)
        .maybeSingle();
      if (currentToken?.balance !== undefined && currentToken?.balance !== null) {
        setTokenBalance(Number(currentToken.balance));
      }
    };

    const ordersChannel = supabase
      .channel(`token-orders-${tokenData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `token_id=eq.${tokenData.id}`,
        },
        () => {
          refetchOrders();
        }
      )
      .subscribe();

    const tokenChannel = supabase
      .channel(`token-balance-${tokenData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tokens',
          filter: `id=eq.${tokenData.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated?.balance !== undefined && updated?.balance !== null) {
            setTokenBalance(Number(updated.balance));
          }
        }
      )
      .subscribe();

    // Polling fallback كل 10 ثواني
    const intervalId = window.setInterval(() => {
      refetchOrders();
      refetchBalance();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(tokenChannel);
    };
  }, [showBalance, tokenData?.id]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return { label: 'مكتمل', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' };
      case 'rejected':
        return { label: 'مرفوض', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      case 'in_progress':
        return { label: 'قيد التنفيذ', icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'cancelled':
        return { label: 'ملغي', icon: Ban, color: 'text-muted-foreground', bg: 'bg-muted' };
      case 'pending':
        return { label: 'جاري المعالجة', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      default:
        return { label: 'قيد الانتظار', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    }
  };

  const getProductName = (productId: string | null, optionId: string | null) => {
    if (!productId && !optionId) return 'غير معروف';
    const productItem = products.find(p => p.id === productId);
    const option = productOptions.find(o => o.id === optionId);
    if (productItem && option) {
      return `${productItem.name} - ${option.name}`;
    }
    return productItem?.name || option?.name || 'غير معروف';
  };

  // Show loading while checking for active order
  if (checkingActiveOrder) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Get active order product info
  const activeOrderProduct = activeOrder ? products.find(p => p.id === activeOrder.product_id) : null;
  const activeOrderOption = activeOrder ? productOptions.find(o => o.id === activeOrder.product_option_id) : null;
  const activeOrderStatusInfo = activeOrder ? getStatusInfo(activeOrder.status) : null;
  const ActiveOrderStatusIcon = activeOrderStatusInfo?.icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buy Here Card */}
          <div className="card-simple p-6 select-text">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-primary">اشتري من هنا</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            اختر المنتج، ادخل التوكن
          </p>

          {step === 'initial' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اختر المنتج</label>
                <Select value={selectedProductId} onValueChange={handleProductChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر منتج..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.duration && `- ${p.duration}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {product && options.length > 0 && (
                <div>
                  <div className="mb-2">
  <label className="block text-sm font-medium">اختر نوع الخدمة</label>
  {selectedOption && (
    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${
      selectedOption.type === 'chat' 
        ? 'bg-primary text-primary-foreground' 
        : (selectedOption.type === 'none' || !selectedOption.type) 
          ? 'bg-success text-success-foreground' 
          : 'bg-info text-info-foreground'
    }`}>
      نوع التسليم: {selectedOption.type === 'chat' ? 'شات' : (selectedOption.type === 'none' || !selectedOption.type) ? 'فوري' : 'يدوي'}
    </span>
  )}
</div>
                  <Select value={selectedOptionId} onValueChange={handleOptionChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر نوع الخدمة..." />
                    </SelectTrigger>
                    <SelectContent>
                    {options.map((opt) => {
                        const stockCount = optionStockCounts[opt.id] || 0;
                        const isAutoDelivery = opt.type === 'none' || !opt.type;
                        const isUnavailable = (isAutoDelivery && stockCount === 0) || opt.is_active === false;
                        return (
                          <SelectItem
  key={opt.id}
  value={opt.id}
  disabled={isUnavailable}
  className="w-full"
>
  {opt.name} {opt.is_active === false && "(غير متاح حالياً)"}
</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {selectedOption && (
                    <div className="mt-2 p-2 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        {selectedOption.description}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">
                            السعر: ${selectedOption.price}
                          </span>
                          {selectedOption.duration && (
                            <span className="text-xs bg-muted-foreground/10 text-muted-foreground px-2 py-0.5 rounded-full">
                              {selectedOption.duration}
                            </span>
                          )}
                          {/* Service status indicator */}
                          {selectedOption.type !== 'none' && selectedOption.type && (
                            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              selectedOption.is_active !== false
                                ? 'bg-success/10 text-success'
                                : 'bg-destructive/10 text-destructive'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                selectedOption.is_active !== false ? 'bg-success' : 'bg-destructive'
                              }`} />
                              {selectedOption.is_active !== false ? 'نشط' : 'غير نشط'}
                            </span>
                          )}
                        </div>
                        {(selectedOption.type === 'none' || !selectedOption.type) && (
                          <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                            متوفر: {optionStockCounts[selectedOption.id] || 0}
                          </span>
                        )}
                      </div>

                      {/* Quantity selector for auto-delivery */}
                      {(selectedOption.type === 'none' || !selectedOption.type) && (optionStockCounts[selectedOption.id] || 0) > 0 && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <span className="text-sm text-muted-foreground">الكمية:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQuantity(q => Math.max(1, q - 1))}
                              className="w-8 h-8 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center"
                              disabled={quantity <= 1}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={(() => {
                                const stockMax = optionStockCounts[selectedOption.id] || 1;
                                const orderLimit = selectedOption.max_quantity_per_order;
                                return orderLimit && orderLimit > 0 ? Math.min(stockMax, orderLimit) : stockMax;
                              })()}
                              value={quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                const stockMax = optionStockCounts[selectedOption.id] || 1;
                                const orderLimit = selectedOption.max_quantity_per_order;
                                const max = orderLimit && orderLimit > 0 ? Math.min(stockMax, orderLimit) : stockMax;
                                setQuantity(Math.max(1, Math.min(max, val)));
                              }}
                              className="w-16 h-8 text-center font-semibold bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const stockMax = optionStockCounts[selectedOption.id] || 1;
                                const orderLimit = selectedOption.max_quantity_per_order;
                                const max = orderLimit && orderLimit > 0 ? Math.min(stockMax, orderLimit) : stockMax;
                                setQuantity(q => Math.min(max, q + 1));
                              }}
                              className="w-8 h-8 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center"
                              disabled={(() => {
                                const stockMax = optionStockCounts[selectedOption.id] || 1;
                                const orderLimit = selectedOption.max_quantity_per_order;
                                const max = orderLimit && orderLimit > 0 ? Math.min(stockMax, orderLimit) : stockMax;
                                return quantity >= max;
                              })()}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Show max quantity limit info */}
                      {selectedOption.max_quantity_per_order && selectedOption.max_quantity_per_order > 0 && (selectedOption.type === 'none' || !selectedOption.type) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          الحد الأقصى: {selectedOption.max_quantity_per_order} في العملية الواحدة
                        </p>
                      )}

                      {/* Total price for multiple items */}
                      {(selectedOption.type === 'none' || !selectedOption.type) && quantity > 1 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">الإجمالي:</span>
                            <span className="text-sm font-bold text-primary">
                              ${Number(selectedOption.price) * quantity}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">التوكن</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input-field w-full"
                  placeholder="ادخل التوكن الخاص بك"
                />
              </div>

              <button
                onClick={handleBuySubmit}
                disabled={!token.trim() || !selectedProductId || !selectedOptionId || isLoading}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {isLoading ? 'جاري التحقق...' : 'متابعة'}
              </button>
            </div>
          )}

          {step === 'details' && product && selectedOption && tokenBalance !== null && (() => {
            const isAutoDelivery = selectedOption.type === 'none' || !selectedOption.type;
            const basePrice = isAutoDelivery ? Number(selectedOption.price) * quantity : Number(selectedOption.price);
            const discountAmount = calculateDiscount(basePrice);
            const totalPrice = basePrice - discountAmount;
            const remainingBalance = tokenBalance - totalPrice;

            // Calculate display values based on whether there's an active order
            const displayBalance = activeOrder ? tokenBalance + activeOrder.amount : tokenBalance;
            const displayPrice = activeOrder ? activeOrder.amount : Number(selectedOption.price);
            const displayTotal = activeOrder ? activeOrder.amount : totalPrice;
            const displayRemaining = activeOrder ? tokenBalance : remainingBalance;

            return (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المنتج:</span>
                  <span className="font-medium text-sm">{product.name} - {selectedOption.name}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">الرصيد الحالي:</span>
                  <span className="font-bold text-lg">${displayBalance.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">
                    السعر {isAutoDelivery && quantity > 1 ? `(${quantity} × $${selectedOption.price})` : ''}:
                  </span>
                  <span className="font-semibold text-primary">${displayPrice.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-success flex items-center gap-1">
                      <Ticket className="w-3 h-3" />
                      خصم ({appliedCoupon.discount_value}{appliedCoupon.discount_type === 'percentage' ? '%' : '$'}):
                    </span>
                    <span className="font-semibold text-success">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-border">
                    <span className="text-muted-foreground">الإجمالي بعد الخصم:</span>
                    <span className="font-bold text-primary">${displayTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <span className="text-muted-foreground">الرصيد بعد الشراء:</span>
                  <span className={`font-bold ${displayRemaining >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ${displayRemaining.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Coupon Input */}
              {!activeOrder && (
                <div className="space-y-2">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2 bg-success/10 rounded-lg border border-success/20">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-success">
                          كوبون: {appliedCoupon.code} ({appliedCoupon.discount_value}{appliedCoupon.discount_type === 'percentage' ? '%' : '$'})
                        </span>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-xs text-destructive hover:underline"
                      >
                        إزالة
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="input-field flex-1 text-sm"
                        placeholder="كود الكوبون (اختياري)"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={!couponCode.trim() || couponLoading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
                      >
                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تطبيق'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Show message for instant delivery (no data required) */}
              {isAutoDelivery && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-800">استلام فوري</p>
                  <p className="text-xs text-green-600 mt-1">
                    سيتم إرسال {quantity > 1 ? `${quantity} منتجات` : 'المنتج'} فوراً بعد تأكيد الطلب
                  </p>
                </div>
              )}

              {selectedOption.type === 'link' && (
                <div>
                  <label className="block text-sm font-medium mb-2">الرابط</label>
                  <input
                    type="text"
                    value={verificationLink}
                    onChange={(e) => setVerificationLink(e.target.value)}
                    className="input-field w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="ادخل الرابط"
                    disabled={!!activeOrder}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    الوقت المتوقع: {selectedOption.estimated_time}
                  </p>
                  {activeOrder && (
                    <p className="text-xs text-primary mt-1 underline">
                      لديك طلب قيد التنفيذ - لا يمكنك تغيير البيانات
                    </p>
                  )}
                </div>
              )}

              {selectedOption.type === 'email_password' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">الإيميل</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="ادخل إيميل الحساب"
                      disabled={!!activeOrder}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">الباسورد</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="ادخل باسورد الحساب"
                      disabled={!!activeOrder}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الوقت المتوقع: {selectedOption.estimated_time}
                  </p>
                  {activeOrder && (
                    <p className="text-xs text-primary underline">
                      لديك طلب قيد التنفيذ - لا يمكنك تغيير البيانات
                    </p>
                  )}
                </div>
              )}

              {selectedOption.type === 'chat' && (
                <div className="space-y-3">
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">عدد الحسابات المطلوبة:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setChatAccountsCount(c => Math.max(1, c - 1))}
                          className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center"
                          disabled={chatAccountsCount <= 1 || !!activeOrder}
                        >-</button>
                        <span className="w-8 text-center font-bold">{chatAccountsCount}</span>
                        <button
                          type="button"
                          onClick={() => setChatAccountsCount(c => c + 1)}
                          className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center"
                          disabled={!!activeOrder}
                        >+</button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      الإجمالي: ${(Number(selectedOption.price) * chatAccountsCount).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الوقت المتوقع: {selectedOption.estimated_time}
                  </p>
                </div>
              )}

              {selectedOption.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium mb-2">النص المطلوب</label>
                  {/* عرض تعليمات المنتج الخاصة أو التعليمات العامة */}
                  {selectedOption.required_text_info && (
                    <div className="p-3 mb-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">{selectedOption.required_text_info}</p>
                    </div>
                  )}
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="input-field w-full h-24 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="ادخل النص المطلوب"
                    disabled={!!activeOrder}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    الوقت المتوقع: {selectedOption.estimated_time}
                  </p>
                  {activeOrder && (
                    <p className="text-xs text-primary mt-1 underline">
                      لديك طلب قيد التنفيذ - لا يمكنك تغيير البيانات
                    </p>
                  )}
                </div>
              )}

              {/* Buttons */}
              {activeOrder ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('initial')}
                      className="flex-1 py-3 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    >
                      رجوع
                    </button>
                    <button
                      disabled
                      className="flex-1 py-3 rounded-lg bg-red-600 text-white opacity-50 cursor-not-allowed"
                    >
                      لديك طلب نشط
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('initial')}
                    className="flex-1 py-3 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    رجوع
                  </button>
                  <button
                    onClick={handleOrderSubmit}
                    disabled={
                      isLoading ||
                      remainingBalance < 0 ||
                      (selectedOption.type === 'link' && !verificationLink.trim()) ||
                      (selectedOption.type === 'email_password' && (!email.trim() || !password.trim())) ||
                      (selectedOption.type === 'text' && !textInput.trim())
                    }
                    className="btn-primary flex-1 py-3 disabled:opacity-50"
                  >
                    {isLoading ? 'جاري المعالجة...' : 'إرسال الطلب'}
                  </button>
                </div>
              )}
            </div>
            );
          })()}

          {step === 'waiting' && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h3 className="text-lg font-bold">
                {orderStatus === 'in_progress' ? 'تم استلام طلبك وقيد التنفيذ' : 'جاري معالجة طلبك...'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {orderStatus === 'in_progress'
                  ? 'يرجى الانتظار، جاري العمل على طلبك'
                  : `يرجى الانتظار، سيتم تفعيل الخدمة خلال ${selectedOption?.estimated_time}`
                }
              </p>
              {responseMessage && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-800">{responseMessage}</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm">الرصيد المتبقي: <span className="font-bold">${tokenBalance}</span></p>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4 text-center py-4">
              {result === 'success' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-green-600">تم تفعيل الخدمة بنجاح!</h3>
                  {responseMessage && (
                    <div className="text-right">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(responseMessage);
                            toast({ title: 'تم النسخ', description: 'تم نسخ المحتوى بنجاح' });
                          }}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="نسخ"
                        >
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <span className="text-sm font-medium text-primary">محتوى الطلب</span>
                      </div>
                      <div className="p-4 rounded-lg bg-card border border-border max-h-48 overflow-y-auto">
                        <pre className="text-sm text-foreground whitespace-pre-wrap text-right font-mono leading-relaxed">
                          {responseMessage}
                        </pre>
                      </div>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm">الرصيد المتبقي: <span className="font-bold">${tokenBalance}</span></p>
                  </div>
                 {/* عرض البيانات المسلمة */}
{(activeOrder?.delivered_email || activeOrder?.delivered_password || activeOrder?.admin_notes) && (
  <div className="space-y-3 text-right bg-muted/50 rounded-xl p-4 mt-4">
    <h4 className="font-bold text-primary flex items-center justify-end gap-2">
      📦 بيانات حسابك
    </h4>
    <div className="space-y-2">
      {activeOrder?.delivered_email && (
        <div className="flex items-center justify-between bg-background p-3 rounded-lg">
          <button
            onClick={() => {
              navigator.clipboard.writeText(activeOrder.delivered_email!);
              toast({ title: 'تم النسخ!' });
            }}
            className="p-1 hover:bg-muted rounded"
          >
            <Copy className="w-4 h-4" />
          </button>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">الإيميل</span>
            <p className="font-mono">{activeOrder.delivered_email}</p>
          </div>
        </div>
      )}
      {activeOrder?.delivered_password && (
        <div className="flex items-center justify-between bg-background p-3 rounded-lg">
          <button
            onClick={() => {
              navigator.clipboard.writeText(activeOrder.delivered_password!);
              toast({ title: 'تم النسخ!' });
            }}
            className="p-1 hover:bg-muted rounded"
          >
            <Copy className="w-4 h-4" />
          </button>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">الباسورد</span>
            <p className="font-mono">{activeOrder.delivered_password}</p>
          </div>
        </div>
      )}
      {activeOrder?.admin_notes && (
        <div className="p-3 bg-primary/10 rounded-lg text-sm text-right">
          <span className="text-xs text-muted-foreground">ملاحظات</span>
          <p>{activeOrder.admin_notes}</p>
        </div>
      )}
    </div>
  </div>
)}  
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-red-600">
                    {orderStatus === 'rejected' ? 'تم رفض الطلب' : 'فشل في إتمام الطلب'}
                  </h3>
                  {responseMessage && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-sm text-red-800">{responseMessage}</p>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={handleReset}
                className="btn-primary w-full py-3 mt-4"
              >
                طلب جديد
              </button>
            </div>
          )}
        </div>

          {/* Second Card - Info or Active Order */}
          <div className="card-simple p-6 select-text">
            {activeOrder ? (
              // Show active order status/chat
              <div className="space-y-4">
                {/* Order Status Header */}
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    {ActiveOrderStatusIcon ? (
                      <ActiveOrderStatusIcon
                        className={`w-6 h-6 ${activeOrderStatusInfo?.color} ${activeOrder.status === 'in_progress' ? 'animate-spin' : ''}`}
                      />
                    ) : (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    )}
                  </div>
                  <h2 className="text-lg font-bold">
                    {activeOrder.status === 'cancelled'
                      ? 'تم إلغاء الطلب'
                      : activeOrder.status === 'in_progress'
                        ? 'جاري تنفيذ طلبك'
                        : 'جاري معالجة طلبك'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeOrder.status === 'cancelled'
                      ? 'يمكنك الآن عمل طلب جديد'
                      : 'لا يمكنك إجراء طلب جديد حتى ينتهي هذا الطلب'}
                  </p>
                </div>

                {/* Order Details */}
                <div className="bg-muted/50 rounded-xl p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">رقم الطلب:</span>
                    <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                      #{activeOrder.order_number}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">المنتج:</span>
                    <span className="font-medium text-xs">
                      {activeOrderProduct && activeOrderOption ? `${activeOrderProduct.name} - ${activeOrderOption.name}` : 'غير معروف'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">المبلغ:</span>
                    <span className="font-bold text-primary">${activeOrder.amount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">الحالة:</span>
                    <span className={`flex items-center gap-1 font-medium ${activeOrderStatusInfo?.color ?? 'text-muted-foreground'}`}>
                      {ActiveOrderStatusIcon ? (
                        <ActiveOrderStatusIcon className={`w-3 h-3 ${activeOrder.status === 'in_progress' ? 'animate-spin' : ''}`} />
                      ) : (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      {activeOrderStatusInfo?.label ?? activeOrder.status}
                    </span>
                  </div>
                  {tokenBalance !== null && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-muted-foreground">الرصيد الحالي:</span>
                      <span className="font-bold">${tokenBalance}</span>
                    </div>
                  )}
                </div>
                {/* عرض البيانات المسلمة */}
                {(activeOrder?.delivered_email || activeOrder?.delivered_password || activeOrder?.admin_notes) && (
                  <div className="space-y-3 text-right bg-muted/50 rounded-xl p-4">
                    <h4 className="font-bold text-primary flex items-center justify-end gap-2">
                      📦 بيانات حسابك
                    </h4>
                    <div className="space-y-2">
                      {activeOrder.delivered_email && (
                        <div className="flex items-center justify-between bg-background p-3 rounded-lg">
                          <button onClick={() => { navigator.clipboard.writeText(activeOrder.delivered_email!); toast({ title: 'تم النسخ!' }); }} className="p-1 hover:bg-muted rounded">
                            <Copy className="w-4 h-4" />
                          </button>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">الإيميل</span>
                            <p className="font-mono">{activeOrder.delivered_email}</p>
                          </div>
                        </div>
                      )}
                      {activeOrder.delivered_password && (
                        <div className="flex items-center justify-between bg-background p-3 rounded-lg">
                          <button onClick={() => { navigator.clipboard.writeText(activeOrder.delivered_password!); toast({ title: 'تم النسخ!' }); }} className="p-1 hover:bg-muted rounded">
                            <Copy className="w-4 h-4" />
                          </button>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">الباسورد</span>
                            <p className="font-mono">{activeOrder.delivered_password}</p>
                          </div>
                        </div>
                      )}
                      {activeOrder.admin_notes && (
                        <div className="p-3 bg-primary/10 rounded-lg text-sm text-right">
                          <span className="text-xs text-muted-foreground">ملاحظات</span>
                          <p>{activeOrder.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Chat Section - Only show when in_progress */}
                {activeOrder.status === 'in_progress' && (
                  <OrderChat orderId={activeOrder.id} senderType="customer" />
                )}

                {activeOrder.status === 'pending' && (
                  <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Clock className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                    <p className="text-xs text-yellow-800">
                      طلبك قيد المراجعة. سيتم إتاحة المحادثة عند بدء التنفيذ.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Show balance info card
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-primary">معلومات الرصيد</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  البحث عن التفعيل - سجل المعاملات - الرصيد
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">التوكن</label>
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => { setToken(e.target.value); setShowBalance(false); }}
                      className="input-field w-full"
                      placeholder="ادخل التوكن الخاص بك"
                    />
                  </div>

                  <button
                    onClick={handleShowBalance}
                    disabled={!token.trim() || isLoading}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                  >
                    {isLoading ? 'جاري التحقق...' : 'عرض السجل والرصيد'}
                  </button>

                  {showBalance && tokenBalance !== null && tokenData && (
                    <div className="space-y-4">
                      {/* Token Expiry Warning */}
                      {tokenRecharges.some(r => r.status === 'approved') && (() => {
                        const approvedRecharges = tokenRecharges.filter(r => r.status === 'approved');
                        const lastRecharge = approvedRecharges.sort((a, b) => 
                          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )[0];
                        if (!lastRecharge) return null;
                        
                        const expiresAt = new Date(lastRecharge.created_at);
                        expiresAt.setDate(expiresAt.getDate() + 30);
                        const now = new Date();
                        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        const isExpired = daysLeft <= 0;
                        const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
                        
                        if (!isExpired && !isExpiringSoon) return null;
                        
                        return (
                          <div className={`p-3 rounded-lg border ${
                            isExpired 
                              ? 'bg-destructive/10 border-destructive/30' 
                              : 'bg-warning/10 border-warning/30'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Clock className={`w-4 h-4 ${isExpired ? 'text-destructive' : 'text-warning'}`} />
                              <span className={`text-sm font-medium ${isExpired ? 'text-destructive' : 'text-warning'}`}>
                                {isExpired 
                                  ? '⚠️ انتهت صلاحية التوكن!' 
                                  : `⏰ تبقى ${daysLeft} يوم على انتهاء صلاحية التوكن`
                                }
                              </span>
                            </div>
                            <p className={`text-xs mt-1 ${isExpired ? 'text-destructive/80' : 'text-warning/80'}`}>
                              {isExpired 
                                ? 'الرصيد المتبقي قد يكون مفقوداً. يرجى شحن التوكن لتجديد الصلاحية.' 
                                : 'اشحن التوكن قبل انتهاء المدة لتجديد الصلاحية والحفاظ على رصيدك.'
                              }
                            </p>
                          </div>
                        );
                      })()}

                      {/* Balance Display */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">الرصيد الحالي:</span>
                          <span className="text-2xl font-bold text-primary">${tokenBalance}</span>
                        </div>
                        {/* Token Validity Info */}
                        {tokenRecharges.some(r => r.status === 'approved') && (() => {
                          const approvedRecharges = tokenRecharges.filter(r => r.status === 'approved');
                          const lastRecharge = approvedRecharges.sort((a, b) => 
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                          )[0];
                          if (!lastRecharge) return null;
                          
                          const expiresAt = new Date(lastRecharge.created_at);
                          expiresAt.setDate(expiresAt.getDate() + 30);
                          const now = new Date();
                          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          const isExpired = daysLeft <= 0;
                          
                          return (
                            <div className="mt-2 pt-2 border-t border-primary/20 text-xs text-muted-foreground">
                              <div className="flex items-center justify-between">
                                <span>صلاحية التوكن:</span>
                                <span className={isExpired ? 'text-destructive font-medium' : daysLeft <= 7 ? 'text-warning font-medium' : ''}>
                                  {isExpired ? 'منتهي' : `${daysLeft} يوم متبقي`}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>


                      {/* Combined Transaction History - Orders + Recharges */}
                      <div className="border-t border-border pt-4">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4" />
                          سجل المعاملات ({tokenOrders.length + tokenRecharges.length})
                        </h3>

                        {tokenOrders.length === 0 && tokenRecharges.length === 0 ? (
                          <div className="text-center py-6 bg-muted/30 rounded-lg">
                            <ShoppingCart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">لا توجد معاملات سابقة</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-72 overflow-y-auto">
                            {/* Combine and sort by date */}
                            {[
                              ...tokenOrders.map(order => ({ type: 'order' as const, data: order, date: new Date(order.created_at) })),
                              ...tokenRecharges.map(recharge => ({ type: 'recharge' as const, data: recharge, date: new Date(recharge.created_at) }))
                            ]
                              .sort((a, b) => b.date.getTime() - a.date.getTime())
                              .map((item) => {
                                if (item.type === 'recharge') {
                                  const recharge = item.data as RechargeRequest;
                                  const statusInfo = getStatusInfo(recharge.status);
                                  const StatusIcon = statusInfo.icon;
                                  return (
                                    <div key={`recharge-${recharge.id}`} className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                              <CreditCard className="w-3 h-3" />
                                              شحن رصيد
                                            </span>
                                          </div>
                                          <p className="font-medium text-sm text-foreground">
                                            {recharge.payment_method}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(recharge.created_at).toLocaleDateString('ar-EG')} - {new Date(recharge.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                        <div className="text-left">
                                          <span className="font-bold text-emerald-400 text-sm">+${recharge.amount}</span>
                                          <div className={`flex items-center gap-1 mt-1 ${statusInfo.color}`}>
                                            <StatusIcon className={`w-3 h-3 ${recharge.status === 'pending' ? 'animate-pulse' : ''}`} />
                                            <span className="text-xs font-medium">{statusInfo.label}</span>
                                          </div>
                                        </div>
                                      </div>
                                      {recharge.admin_note && (
                                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-card/50 rounded border border-border">
                                          ملاحظة الإدارة: {recharge.admin_note}
                                        </p>
                                      )}
                                    </div>
                                  );
                                } else {
                                  const order = item.data as Order;
                                  const statusInfo = getStatusInfo(order.status);
                                  const StatusIcon = statusInfo.icon;
                                  const refund = tokenRefunds.find(r => r.order_number === order.order_number);
                                  const getRefundStatusInfo = (status: string) => {
                                    switch (status) {
                                      case 'approved':
                                        return { label: 'تم الاسترداد', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' };
                                      case 'rejected':
                                        return { label: 'مرفوض', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
                                      case 'pending':
                                      default:
                                        return { label: 'قيد المراجعة', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
                                    }
                                  };
                                  return (
                                    <div key={`order-${order.id}`} className="bg-muted/30 rounded-lg p-3 border border-border">
                                                                          <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                            #{order.order_number}
                                          </span>
                                          {(order as any).quantity > 1 && (
                                            <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded font-bold">
                                              ×{(order as any).quantity}
                                            </span>
                                          )}
                                        </div>
                                        <p className="font-medium text-sm truncate">
                                          {getProductName(order.product_id, order.product_option_id)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {new Date(order.created_at).toLocaleDateString('ar-EG')} - {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      </div>
                                      <div className="text-left">
                                        <span className="font-bold text-primary text-sm">${order.amount}</span>
                                        {(order as any).quantity > 1 && (
                                          <p className="text-xs text-muted-foreground">({(order as any).quantity} قطعة)</p>
                                        )}
                                        <div className={`flex items-center gap-1 mt-1 ${statusInfo.color}`}>
                                          <StatusIcon className={`w-3 h-3 ${order.status === 'in_progress' ? 'animate-spin' : ''}`} />
                                          <span className="text-xs font-medium">{statusInfo.label}</span>
                                        </div>
                                      </div>
                                    </div>
                                                                          {order.response_message && (
                                      <div className="mt-2 p-2 bg-success/10 rounded-lg border border-success/20">
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-xs font-medium text-success">المنتجات المستلمة:</p>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => {
                                                navigator.clipboard.writeText(order.response_message || '');
                                                toast({ title: 'تم النسخ!' });
                                              }}
                                              className="p-1.5 bg-background hover:bg-muted rounded text-muted-foreground"
                                              title="نسخ الكل"
                                            >
                                              <Copy className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                const content = order.response_message || '';
                                                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `order-${order.order_number}.txt`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(url);
                                                toast({ title: 'تم التنزيل!' });
                                              }}
                                              className="p-1.5 bg-background hover:bg-muted rounded text-muted-foreground"
                                              title="تنزيل كملف"
                                            >
                                              <Download className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="space-y-1.5">
                                          {order.response_message.split('\n').map((line, idx, arr) => (
                                            <div key={idx}>
                                              <div className="flex items-center justify-between bg-background p-2 rounded text-xs">
                                                <button
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(line);
                                                    toast({ title: 'تم النسخ!' });
                                                  }}
                                                  className="p-1 hover:bg-muted rounded"
                                                >
                                                  <Copy className="w-3 h-3" />
                                                </button>
                                                <span className="font-mono text-foreground flex-1 text-right mr-2">{line}</span>
                                              </div>
                                              {idx < arr.length - 1 && (
                                                <div className="border-t border-dashed border-success/30 my-1" />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                      {/* عرض البيانات المسلمة في السجل */}
{((order as any).delivered_email || (order as any).delivered_password || (order as any).admin_notes) && (
  <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
    <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
      📦 بيانات الحساب
    </p>
    <div className="space-y-1.5">
      {(order as any).delivered_email && (
        <div className="flex items-center justify-between bg-background p-2 rounded text-xs">
          <button
            onClick={() => {
              navigator.clipboard.writeText((order as any).delivered_email);
              toast({ title: 'تم النسخ!' });
            }}
            className="p-1 hover:bg-muted rounded"
          >
            <Copy className="w-3 h-3" />
          </button>
          <div className="text-right">
            <span className="text-muted-foreground">الإيميل:</span>
            <span className="font-mono mr-1">{(order as any).delivered_email}</span>
          </div>
        </div>
      )}
      {(order as any).delivered_password && (
        <div className="flex items-center justify-between bg-background p-2 rounded text-xs">
          <button
            onClick={() => {
              navigator.clipboard.writeText((order as any).delivered_password);
              toast({ title: 'تم النسخ!' });
            }}
            className="p-1 hover:bg-muted rounded"
          >
            <Copy className="w-3 h-3" />
          </button>
          <div className="text-right">
            <span className="text-muted-foreground">الباسورد:</span>
            <span className="font-mono mr-1">{(order as any).delivered_password}</span>
          </div>
        </div>
      )}
      {(order as any).admin_notes && (
        <div className="p-2 bg-muted/50 rounded text-xs text-right">
          <span className="text-muted-foreground">ملاحظات:</span>
          <p className="mt-0.5">{(order as any).admin_notes}</p>
        </div>
      )}
    </div>
  </div>
)}
                                      {refund && (
                                        <div className="mt-2 p-2 rounded-lg border border-orange-200 bg-orange-50">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <RotateCcw className="w-3 h-3 text-orange-600" />
                                              <span className="text-xs font-medium text-orange-800">طلب استرداد</span>
                                            </div>
                                            {(() => {
                                              const refundInfo = getRefundStatusInfo(refund.status);
                                              const RefundIcon = refundInfo.icon;
                                              return (
                                                <div className={`flex items-center gap-1 ${refundInfo.color}`}>
                                                  <RefundIcon className="w-3 h-3" />
                                                  <span className="text-xs font-medium">{refundInfo.label}</span>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                          {refund.reason && (
                                            <p className="text-xs text-orange-700 mt-1">السبب: {refund.reason}</p>
                                          )}
                                          {refund.admin_notes && (
                                            <p className="text-xs text-muted-foreground mt-1 p-1.5 bg-background rounded border">
                                              ملاحظة الإدارة: {refund.admin_notes}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* News Section */}
        <NewsSection />
      </main>
    </div>
  );
};

export default Index;
