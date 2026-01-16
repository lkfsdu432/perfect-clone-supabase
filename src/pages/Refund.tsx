import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RotateCcw, CheckCircle, AlertCircle, Loader2, Search, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

interface RefundStatus {
  status: string;
  reason: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

const Refund = () => {
  const [activeTab, setActiveTab] = useState<'submit' | 'check'>('submit');
  const [tokenValue, setTokenValue] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [refundStatus, setRefundStatus] = useState<RefundStatus | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tokenValue.trim() || !orderNumber.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsLoading(true);

    // Verify token exists and check if blocked using RPC
    const { data: tokenData } = await supabase.rpc('check_token_balance', { 
      token_input: tokenValue.trim() 
    });

    if (!tokenData) {
      setError('التوكن غير صالح');
      setIsLoading(false);
      return;
    }

    if (tokenData.is_blocked) {
      setError('هذا التوكن محظور ولا يمكن استخدامه لطلب استرداد');
      setIsLoading(false);
      return;
    }

    // Verify order exists and belongs to this token (support both formats: with/without ORD- prefix)
    const orderNum = orderNumber.trim();
    const orderNumWithPrefix = orderNum.startsWith('ORD-') ? orderNum : `ORD-${orderNum}`;
    const orderNumWithoutPrefix = orderNum.startsWith('ORD-') ? orderNum.replace('ORD-', '') : orderNum;

    const { data: orderData } = await supabase
      .from('orders')
      .select('id, status, amount, order_number')
      .eq('token_id', tokenData.id)
      .or(`order_number.eq.${orderNum},order_number.eq.${orderNumWithPrefix},order_number.eq.${orderNumWithoutPrefix}`)
      .maybeSingle();

    if (!orderData) {
      setError('رقم الطلب غير صحيح أو لا ينتمي لهذا التوكن');
      setIsLoading(false);
      return;
    }
    
    // Use the actual order number from DB for consistency
    const actualOrderNumber = orderData.order_number;

    if (orderData.status === 'pending' || orderData.status === 'in_progress') {
      setError('لا يمكن طلب استرداد لطلب قيد التنفيذ');
      setIsLoading(false);
      return;
    }

    // Check if ANY refund request exists for this order (not just pending)
    const { data: existingRefund } = await supabase
      .from('refund_requests')
      .select('id, status')
      .eq('order_number', actualOrderNumber)
      .maybeSingle();

    if (existingRefund) {
      if (existingRefund.status === 'pending') {
        setError('يوجد طلب استرداد قيد المراجعة لهذا الطلب');
      } else if (existingRefund.status === 'approved') {
        setError('تم استرداد هذا الطلب مسبقاً');
      } else {
        setError('تم رفض طلب الاسترداد لهذا الطلب مسبقاً');
      }
      setIsLoading(false);
      return;
    }

    // Create refund request
    const { error: insertError } = await supabase
      .from('refund_requests')
      .insert({
        token_id: tokenData.id,
        order_number: actualOrderNumber,
        // DB column is NOT NULL, but UI allows leaving it empty
        reason: reason.trim() || ''
      });

    if (insertError) {
      setError('فشل في إرسال طلب الاسترداد');
      setIsLoading(false);
      return;
    }

    setSubmitted(true);
    setIsLoading(false);
    toast({ title: 'تم', description: 'تم إرسال طلب الاسترداد بنجاح' });
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRefundStatus(null);

    if (!tokenValue.trim() || !orderNumber.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsLoading(true);

    // Verify token exists using RPC
    const { data: tokenData } = await supabase.rpc('check_token_balance', { 
      token_input: tokenValue.trim() 
    });

    if (!tokenData) {
      setError('التوكن غير صالح');
      setIsLoading(false);
      return;
    }

    // Get order (support both formats: with/without ORD- prefix)
    const orderNum = orderNumber.trim();
    const orderNumWithPrefix = orderNum.startsWith('ORD-') ? orderNum : `ORD-${orderNum}`;
    const orderNumWithoutPrefix = orderNum.startsWith('ORD-') ? orderNum.replace('ORD-', '') : orderNum;

    const { data: orderData } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('token_id', tokenData.id)
      .or(`order_number.eq.${orderNum},order_number.eq.${orderNumWithPrefix},order_number.eq.${orderNumWithoutPrefix}`)
      .maybeSingle();

    if (!orderData) {
      setError('رقم الطلب غير صحيح أو لا ينتمي لهذا التوكن');
      setIsLoading(false);
      return;
    }

    const actualOrderNumber = orderData.order_number;

    // Get refund request
    const { data: refundData, error: refundError } = await supabase
      .from('refund_requests')
      .select('status, reason, admin_notes, created_at, processed_at')
      .eq('order_number', actualOrderNumber)
      .maybeSingle();

    if (refundError) {
      setError('حدث خطأ أثناء البحث');
      setIsLoading(false);
      return;
    }

    if (!refundData) {
      setError('لا يوجد طلب استرداد لهذا الطلب. يمكنك تقديم طلب استرداد من تبويب "تقديم طلب"');
      setIsLoading(false);
      return;
    }

    setRefundStatus({
      status: refundData.status,
      reason: refundData.reason,
      admin_note: refundData.admin_notes,
      created_at: refundData.created_at,
      processed_at: refundData.processed_at
    });
    setIsLoading(false);
  };

  const handleReset = () => {
    setTokenValue('');
    setOrderNumber('');
    setReason('');
    setSubmitted(false);
    setError('');
    setRefundStatus(null);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'قيد المراجعة', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' };
      case 'approved':
        return { label: 'تم الاسترداد', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' };
      case 'rejected':
        return { label: 'مرفوض', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' };
      default:
        return { label: status, icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="card-simple p-6">
            <div className="flex items-center gap-2 mb-4">
              <RotateCcw className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">طلب استرداد</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setActiveTab('submit'); handleReset(); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'submit'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                تقديم طلب
              </button>
              <button
                onClick={() => { setActiveTab('check'); handleReset(); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'check'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Search className="w-4 h-4" />
                استعلام عن طلب
              </button>
            </div>

            {activeTab === 'submit' ? (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  أدخل بيانات الطلب لتقديم طلب استرداد
                </p>

                {submitted ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-green-600">تم إرسال الطلب بنجاح</h3>
                    <p className="text-sm text-muted-foreground">
                      سيتم مراجعة طلبك والرد عليه في أقرب وقت
                    </p>
                    <p className="text-sm text-muted-foreground">
                      يمكنك متابعة حالة طلبك من تبويب "استعلام عن طلب"
                    </p>
                    <button onClick={handleReset} className="btn-primary w-full py-3 mt-4">
                      طلب استرداد آخر
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">التوكن *</label>
                      <input
                        type="text"
                        value={tokenValue}
                        onChange={(e) => setTokenValue(e.target.value)}
                        className="input-field w-full"
                        placeholder="أدخل التوكن الخاص بك"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">رقم الطلب *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value.replace(/\D/g, ''))}
                        className="input-field w-full"
                        placeholder="أدخل رقم الطلب"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">سبب الاسترداد (اختياري)</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="input-field w-full h-24"
                        placeholder="اكتب سبب طلب الاسترداد..."
                      />
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          إرسال طلب الاسترداد
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  أدخل بيانات الطلب للاستعلام عن حالة طلب الاسترداد
                </p>

                {refundStatus ? (
                  <div className="space-y-4">
                    {/* Status Card */}
                    <div className={`p-4 rounded-lg ${getStatusInfo(refundStatus.status).bg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {(() => {
                          const StatusIcon = getStatusInfo(refundStatus.status).icon;
                          return <StatusIcon className={`w-5 h-5 ${getStatusInfo(refundStatus.status).color}`} />;
                        })()}
                        <span className={`font-bold ${getStatusInfo(refundStatus.status).color}`}>
                          {getStatusInfo(refundStatus.status).label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        تاريخ الطلب: {new Date(refundStatus.created_at).toLocaleDateString('ar-EG')}
                      </p>
                      {refundStatus.processed_at && (
                        <p className="text-sm text-muted-foreground">
                          تاريخ المعالجة: {new Date(refundStatus.processed_at).toLocaleDateString('ar-EG')}
                        </p>
                      )}
                    </div>

                    {/* Reason */}
                    {refundStatus.reason && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">سبب الاسترداد:</p>
                        <p className="text-sm">{refundStatus.reason}</p>
                      </div>
                    )}

                    {/* Admin Note */}
                    {refundStatus.admin_note && (
                      <div className={`p-3 rounded-lg border ${
                        refundStatus.status === 'rejected'
                          ? 'bg-destructive/10 border-destructive/20'
                          : 'bg-primary/10 border-primary/20'
                      }`}>
                        <p className={`text-xs mb-1 ${
                          refundStatus.status === 'rejected' ? 'text-destructive' : 'text-primary'
                        }`}>
                          {refundStatus.status === 'rejected' ? 'سبب الرفض:' : 'ملاحظة:'}
                        </p>
                        <p className={`text-sm ${
                          refundStatus.status === 'rejected' ? 'text-destructive' : 'text-foreground'
                        }`}>{refundStatus.admin_note}</p>
                      </div>
                    )}

                    <button onClick={handleReset} className="btn-primary w-full py-3">
                      استعلام آخر
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCheckStatus} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">التوكن *</label>
                      <input
                        type="text"
                        value={tokenValue}
                        onChange={(e) => setTokenValue(e.target.value)}
                        className="input-field w-full"
                        placeholder="أدخل التوكن الخاص بك"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">رقم الطلب *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value.replace(/\D/g, ''))}
                        className="input-field w-full"
                        placeholder="أدخل رقم الطلب"
                        required
                      />
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري البحث...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          استعلام
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Refund;