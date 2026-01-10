import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import NewsSection from '@/components/NewsSection';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Search, CheckCircle, AlertCircle, Loader2, Clock, XCircle, CheckCircle2, Copy, MessageCircle, Ticket, Ban, CreditCard } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import OrderChat from '@/components/OrderChat';

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
  admin_notes: string | null;
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
}

const ACTIVE_ORDER_KEY = 'active_order';

const Index = () => {
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
  const [optionStockCounts, setOptionStockCounts] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [checkingActiveOrder, setCheckingActiveOrder] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: 'percentage' | 'fixed'; discount_value: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  
  const { toast } = useToast();

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
              amount: orderData.amount || orderData.total_price
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

    // Fetch stock counts for auto-delivery options
    const { data: stockData } = await supabase
      .from('stock_items')
      .select('product_option_id')
      .eq('is_sold', false);

    // Count stock per option
    const counts: Record<string, number> = {};
    stockData?.forEach(item => {
      if (item.product_option_id) {
        counts[item.product_option_id] = (counts[item.product_option_id] || 0) + 1;
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
    const { data } = await supabase
      .from('tokens')
      .select('id, balance, is_blocked')
      .eq('token', tokenValue)
      .maybeSingle();

    return data;
  };

  const handleBuySubmit = async () => {
    if (!token.trim() || !product || !selectedOption) return;

    setIsLoading(true);
    const data = await verifyToken(token);
    setIsLoading(false);

    if (!data) {
      toast({
        title: 'خطأ',
        description: 'التوكن غير صالح',
        variant: 'destructive',
      });
      return;
    }

    if (data.is_blocked) {
      toast({
        title: 'خطأ',
        description: 'هذا التوكن محظور ولا يمكن استخدامه للشراء',
        variant: 'destructive',
      });
      return;
    }

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

    // For auto-delivery, first check if stock is available
    if (isAutoDelivery) {
      // Fetch required quantity of stock items
      const { data: stockItems, error: stockError } = await supabase
        .from('stock_items')
        .select('id, content')
        .eq('product_option_id', selectedOption.id)
        .eq('is_sold', false)
        .limit(quantity);

      if (stockError || !stockItems || stockItems.length < quantity) {
        toast({
          title: 'خطأ',
          description: `المخزون غير كافي. متوفر فقط ${stockItems?.length || 0} قطعة`,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Combine all stock content
      const combinedContent = stockItems.map(item => item.content).join('\n');

      // Create order with completed status for auto-delivery
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        token_id: tokenData.id,
        product_id: product.id,
        product_option_id: selectedOption.id,
        amount: totalPrice,
        total_price: totalPrice,
        discount_amount: discountAmount,
        coupon_code: appliedCoupon?.code || null,
        status: 'completed',
        response_message: combinedContent,
        stock_content: combinedContent
      }).select('id, order_number').single();

      if (orderError || !orderData) {
        toast({
          title: 'خطأ',
          description: 'فشل في إرسال الطلب',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Mark all stock items as sold
      const stockIds = stockItems.map(item => item.id);
      await supabase
        .from('stock_items')
        .update({
          is_sold: true,
          sold_at: new Date().toISOString(),
          sold_to_order_id: orderData.id
        })
        .in('id', stockIds);

      // Update coupon usage count
      if (appliedCoupon) {
        const { data: couponData } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('code', appliedCoupon.code)
          .single();

        if (couponData) {
          await supabase
            .from('coupons')
            .update({ used_count: (couponData.used_count || 0) + 1 })
            .eq('code', appliedCoupon.code);
        }
      }

      // Deduct balance
      const newBalance = tokenBalance - totalPrice;
      await supabase
        .from('tokens')
        .update({ balance: newBalance })
        .eq('id', tokenData.id);

      // Update local stock count
      setOptionStockCounts(prev => ({
        ...prev,
        [selectedOption.id]: (prev[selectedOption.id] || 0) - quantity
      }));

      setTokenBalance(newBalance);
      setResponseMessage(combinedContent);
      setResult('success');
      setIsLoading(false);
      setStep('result');
      setAppliedCoupon(null);
      setCouponCode('');
      return;
    }

    // For manual delivery products
    const manualTotalPrice = Number(selectedOption.price) - calculateDiscount(Number(selectedOption.price));

    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      token_id: tokenData.id,
      product_id: product.id,
      product_option_id: selectedOption.id,
      email: selectedOption.type === 'email_password' ? email : null,
      password: selectedOption.type === 'email_password' ? password : null,
      verification_link: selectedOption.type === 'link' ? verificationLink : (selectedOption.type === 'text' ? textInput : null),
      amount: manualTotalPrice,
      total_price: manualTotalPrice,
      discount_amount: calculateDiscount(Number(selectedOption.price)),
      coupon_code: appliedCoupon?.code || null,
      status: 'pending'
    }).select('id, order_number').single();

    if (orderError || !orderData) {
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال الطلب',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Update coupon usage count
    if (appliedCoupon) {
      const { data: couponData } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('code', appliedCoupon.code)
        .single();

      if (couponData) {
        await supabase
          .from('coupons')
          .update({ used_count: (couponData.used_count || 0) + 1 })
          .eq('code', appliedCoupon.code);
      }
    }

    // Deduct balance
    const newBalance = tokenBalance - manualTotalPrice;
    await supabase
      .from('tokens')
      .update({ balance: newBalance })
      .eq('id', tokenData.id);

    // Store active order in localStorage
    localStorage.setItem(ACTIVE_ORDER_KEY, JSON.stringify({
      orderId: orderData.id,
      tokenValue: token
    }));

    // Set active order - stay on same page, show order status in second card
    setActiveOrder({
      id: orderData.id,
      order_number: orderData.order_number,
      status: 'pending',
      response_message: null,
      product_id: product.id,
      product_option_id: selectedOption.id,
      amount: manualTotalPrice
    });

    setTokenBalance(newBalance);
    setCurrentOrderId(orderData.id);
    setOrderStatus('pending');
    setResponseMessage(null);
    setIsLoading(false);
    setAppliedCoupon(null);
    setCouponCode('');
    // Stay on same page - don't change step
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

  // Cancel order function
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
      // تأكيد حالة الطلب من قاعدة البيانات (عشان مايبقاش فيه حالة قديمة)
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
        // زامن الـ UI فوراً
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

      // IMPORTANT: نحدّث بشرط status=pending لتفادي سباق الحالة (لو اتحول لـ in_progress قبل الإلغاء)
      // ونطلب RETURNING علشان نعرف هل فعلاً اتعدل صف ولا لأ
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', activeOrder.id)
        .eq('status', 'pending')
        .select('id, status')
        .maybeSingle();

      if (updateError) throw updateError;

      // لو مفيش صف اتعدل: غالباً الحالة اتغيرت بين القراءة والتحديث
      if (!updatedOrder) {
        const { data: latest, error: latestError } = await supabase
          .from('orders')
          .select('status')
          .eq('id', activeOrder.id)
          .maybeSingle();

        if (latestError) throw latestError;

        if (latest?.status) {
          setActiveOrder((prev) => (prev ? { ...prev, status: latest.status } : prev));
        }

        toast({
          title: 'لا يمكن الإلغاء',
          description:
            latest?.status === 'cancelled'
              ? 'تم إلغاء الطلب بالفعل'
              : latest?.status === 'in_progress'
              ? 'الطلب انتقل إلى قيد التنفيذ قبل الإلغاء لذلك لا يمكن إلغاؤه'
              : 'لم يتم تنفيذ الإلغاء لأن حالة الطلب تغيّرت أو لا توجد صلاحية.',
          variant: 'destructive',
        });
        return;
      }

      if (updatedOrder.status !== 'cancelled') {
        throw new Error('ORDER_CANCEL_FAILED');
      }

      // تحديث واجهة سجل الطلبات فوراً
      setTokenOrders((prev) =>
        prev.map((o) => (o.id === activeOrder.id ? { ...o, status: 'cancelled' } : o))
      );

      // Refund: fetch latest balance then add refund amount (لتفادي أي تعارض)
      const { data: currentToken, error: tokenFetchError } = await supabase
        .from('tokens')
        .select('balance')
        .eq('id', tokenData.id)
        .maybeSingle();

      if (tokenFetchError) throw tokenFetchError;
      if (!currentToken) throw new Error('TOKEN_NOT_FOUND');

      const newBalance = Number(currentToken.balance) + refundAmount;
      const { error: tokenError } = await supabase
        .from('tokens')
        .update({ balance: newBalance })
        .eq('id', tokenData.id);

      if (tokenError) throw tokenError;

      // Refresh orders list (محاولة 2x لتفادي أي تأخير)
      const fetchOrders = async () => {
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
      };

      await fetchOrders();
      await new Promise((r) => setTimeout(r, 200));
      await fetchOrders();

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
    } catch (error) {
      console.error('Error cancelling order:', error);
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as any).message)
          : 'UNKNOWN_ERROR';

      toast({
        title: 'خطأ',
        description: `فشل في إلغاء الطلب أو استرداد المبلغ: ${msg}`,
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

            // تحديث الرصيد من قاعدة البيانات
            if (tokenData) {
              const { data: currentToken } = await supabase
                .from('tokens')
                .select('balance')
                .eq('id', tokenData.id)
                .maybeSingle();
              if (currentToken) setTokenBalance(Number(currentToken.balance));
            }

            toast({ title: 'تم إلغاء الطلب', description: 'تم إلغاء الطلب' });
            return;
          }

          // Only show result for completed or rejected status
          if (updatedOrder.status === 'completed' || updatedOrder.status === 'rejected') {
            // لا نقوم بردّ الرصيد من هنا لتفادي التكرار (الرد يتم من لوحة الأدمن)
            if (updatedOrder.status === 'rejected' && tokenData) {
              const { data: currentToken } = await supabase
                .from('tokens')
                .select('balance')
                .eq('id', tokenData.id)
                .maybeSingle();

              if (currentToken) {
                setTokenBalance(Number(currentToken.balance));
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
    const data = await verifyToken(token);

    if (data) {
      setTokenData(data);
      setTokenBalance(Number(data.balance));
      setShowBalance(true);

      // Fetch orders for this token
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('token_id', data.id)
        .order('created_at', { ascending: false });

      // Fetch recharge requests for this token
      const { data: rechargesData } = await supabase
        .from('recharge_requests')
        .select('*')
        .eq('token_id', data.id)
        .order('created_at', { ascending: false });

      setTokenOrders((ordersData || []).map(o => ({
        ...o,
        amount: o.amount || o.total_price
      })));
      setTokenRecharges(rechargesData || []);
    } else {
      toast({
        title: 'خطأ',
        description: 'التوكن غير صالح',
        variant: 'destructive',
      });
      setShowBalance(false);
      setTokenOrders([]);
      setTokenRecharges([]);
    }
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
          <div className="card-simple p-6">
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
                  <label className="block text-sm font-medium mb-2">اختر نوع الخدمة</label>
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
                          <SelectItem key={opt.id} value={opt.id} disabled={isUnavailable}>
                            {opt.name} {opt.is_active === false && '(غير متاح حالياً)'}
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
                              max={optionStockCounts[selectedOption.id] || 1}
                              value={quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                const max = optionStockCounts[selectedOption.id] || 1;
                                setQuantity(Math.max(1, Math.min(max, val)));
                              }}
                              className="w-16 h-8 text-center font-semibold bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setQuantity(q => Math.min(optionStockCounts[selectedOption.id] || 1, q + 1))}
                              className="w-8 h-8 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center"
                              disabled={quantity >= (optionStockCounts[selectedOption.id] || 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
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

              {selectedOption.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium mb-2">النص المطلوب</label>
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
                  {/* Cancel button - always visible but disabled if in_progress */}
                  <button
                    onClick={handleCancelOrder}
                    disabled={isLoading || activeOrder.status === 'in_progress'}
                    className={`w-full py-3 rounded-lg transition-colors ${
                      activeOrder.status === 'in_progress'
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50'
                    }`}
                  >
                    {isLoading
                      ? 'جاري الإلغاء...'
                      : activeOrder.status === 'in_progress'
                      ? '⚠️ لا يمكن الإلغاء - الطلب قيد التنفيذ'
                      : 'إلغاء الطلب واسترداد المبلغ'}
                  </button>

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
          <div className="card-simple p-6">
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
                      {/* Balance Display */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">الرصيد الحالي:</span>
                          <span className="text-2xl font-bold text-primary">${tokenBalance}</span>
                        </div>
                      </div>


                      {/* Recharge Requests History */}
                      {tokenRecharges.length > 0 && (
                        <div className="border-t border-border pt-4">
                          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            طلبات الشحن ({tokenRecharges.length})
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {tokenRecharges.map((recharge) => {
                              const statusInfo = getStatusInfo(recharge.status);
                              const StatusIcon = statusInfo.icon;
                              return (
                                <div key={recharge.id} className="bg-muted/30 rounded-lg p-3 border border-border">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                          شحن رصيد
                                        </span>
                                      </div>
                                      <p className="font-medium text-sm">
                                        {recharge.payment_method}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(recharge.created_at).toLocaleDateString('ar-EG')} - {new Date(recharge.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                    <div className="text-left">
                                      <span className="font-bold text-green-600 text-sm">+${recharge.amount}</span>
                                      <div className={`flex items-center gap-1 mt-1 ${statusInfo.color}`}>
                                        <StatusIcon className={`w-3 h-3 ${recharge.status === 'pending' ? 'animate-pulse' : ''}`} />
                                        <span className="text-xs font-medium">{statusInfo.label}</span>
                                      </div>
                                    </div>
                                  </div>
                                  {recharge.admin_notes && (
                                    <p className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded border">
                                      {recharge.admin_notes}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Orders History */}
                      <div className="border-t border-border pt-4">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4" />
                          سجل الطلبات ({tokenOrders.length})
                        </h3>

                        {tokenOrders.length === 0 ? (
                          <div className="text-center py-6 bg-muted/30 rounded-lg">
                            <ShoppingCart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">لا توجد طلبات سابقة</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {tokenOrders.map((order) => {
                              const statusInfo = getStatusInfo(order.status);
                              const StatusIcon = statusInfo.icon;
                              return (
                                <div key={order.id} className="bg-muted/30 rounded-lg p-3 border border-border">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                          #{order.order_number}
                                        </span>
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
                                      <div className={`flex items-center gap-1 mt-1 ${statusInfo.color}`}>
                                        <StatusIcon className={`w-3 h-3 ${order.status === 'in_progress' ? 'animate-spin' : ''}`} />
                                        <span className="text-xs font-medium">{statusInfo.label}</span>
                                      </div>
                                    </div>
                                  </div>
                                  {order.response_message && (
                                    <p className="text-xs text-muted-foreground mt-2 p-2 bg-background rounded border">
                                      {order.response_message}
                                    </p>
                                  )}
                                </div>
                              );
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
