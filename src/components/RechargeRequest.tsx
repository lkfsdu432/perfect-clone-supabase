import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, Copy, Wallet, CreditCard, Bitcoin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRESET_AMOUNTS = [1, 5, 10, 15, 20];
const MIN_CUSTOM_AMOUNT = 1;
const TOKEN_STORAGE_KEY = 'user_token';

interface PaymentMethod {
  id: string;
  name: string;
  type: string | null;
  account_number: string | null;
  account_name: string | null;
  instructions: string | null;
  is_active: boolean;
  is_visible: boolean | null;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  instapay: CreditCard,
  binance: Bitcoin,
};

interface RechargeRequestProps {
  tokenId?: string;
  onSuccess?: () => void;
  onTokenGenerated?: (token: string) => void;
}

export const RechargeRequest = ({ tokenId, onSuccess, onTokenGenerated }: RechargeRequestProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [senderReference, setSenderReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [dollarRate, setDollarRate] = useState(51);

  useEffect(() => {
    const fetchData = async () => {
      const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .order('display_order');
      setPaymentMethods((methods || []) as PaymentMethod[]);

      // Fetch dollar rate عبر Edge Function (عشان نقدر نقفل /settings)
      try {
        const { data, error } = await supabase.functions.invoke('get-dollar-rate');
        if (!error && data?.success && typeof data.rate === 'number') {
          setDollarRate(data.rate);
        }
      } catch {
        // keep default
      }
    };
    fetchData();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("حجم الصورة كبير");
        return;
      }
      setProofImage(file);
    }
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("تم نسخ التوكن!");
  };

  const handleSubmit = async () => {
    if (!selectedAmount || !proofImage || !selectedMethod) return;

    setIsSubmitting(true);
    try {
      let finalTokenId = tokenId;
      let newToken: string | null = null;

      if (!tokenId) {
        newToken = generateToken();
        
        let userIp: string | null = null;
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          userIp = ipData.ip;
        } catch (e) {
          console.log('Could not fetch IP');
        }

        const { data: tokenData, error: tokenError } = await supabase
          .from('tokens')
          .insert({ 
            token: newToken, 
            balance: 0,
            created_ip: userIp
          })
          .select('id')
          .single();

        if (tokenError) throw tokenError;
        finalTokenId = tokenData.id;
        setGeneratedToken(newToken);
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      }

      const fileExt = proofImage.name.split('.').pop();
      const fileName = `${finalTokenId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, proofImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('recharge_requests')
        .insert({
          token_id: finalTokenId,
          amount: selectedAmount,
          payment_method: selectedMethod.name,
          payment_method_id: selectedMethod.id,
          proof_image_url: publicUrl,
          sender_reference: senderReference.trim() || null,
          status: 'pending'
        });

      if (insertError) throw insertError;

      setIsSubmitted(true);
      toast.success("تم إرسال الطلب!");
      if (newToken) onTokenGenerated?.(newToken);
      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
      toast.error("حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && generatedToken) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">تم إرسال طلب الشحن!</h3>
            <p className="text-muted-foreground mt-1">سيتم إضافة الرصيد بعد المراجعة</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-3">⚠️ احتفظ بهذا التوكن - ستحتاجه للشراء والشحن</p>
          <div className="flex items-center justify-center gap-3 bg-background/80 backdrop-blur rounded-xl p-4">
            <span className="font-mono text-xl font-bold tracking-wider text-foreground">
              {generatedToken}
            </span>
            <button
              onClick={() => copyToken(generatedToken)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Copy className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">تم حفظ التوكن تلقائياً في متصفحك</p>
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <p className="text-xs text-amber-600 dark:text-amber-400 text-right">
                ⏰ مدة صلاحية التوكن 30 يوم فقط من تاريخ آخر شحن. الرصيد المتبقي بعد انتهاء المدة سيتم فقدانه.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setIsSubmitted(false);
            setSelectedAmount(null);
            setSelectedMethod(null);
            setProofImage(null);
            setSenderReference("");
            setGeneratedToken(null);
            setCustomAmount("");
            setIsCustomMode(false);
          }}
        >
          إرسال طلب شحن آخر
        </Button>
      </div>
    );
  }

  if (isSubmitted && !generatedToken) {
    return (
      <div className="text-center py-8 space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h3 className="text-xl font-bold text-foreground">تم إرسال طلب الشحن!</h3>
        <p className="text-muted-foreground">سيتم إضافة الرصيد بعد المراجعة</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-sm text-muted-foreground">الدولار = {dollarRate} جنيه</p>

      {/* اختيار طريقة الدفع - الظاهرة فقط */}
      <div className="grid grid-cols-3 gap-2">
        {paymentMethods.filter(m => m.is_visible !== false).map((method) => {
          const Icon = typeIcons[method.type || ''] || Wallet;
          const isActive = method.is_active;
          return (
            <button
              key={method.id}
              onClick={() => isActive && setSelectedMethod(method)}
              disabled={!isActive}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                !isActive
                  ? 'opacity-60 cursor-not-allowed border-dashed border-destructive/30 bg-destructive/5'
                  : selectedMethod?.id === method.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              <Icon className={`w-5 h-5 ${!isActive ? 'text-muted-foreground' : ''}`} />
              <span className="text-xs font-medium text-center">
                {method.name}
              </span>
              {!isActive && (
                <span className="text-[10px] text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded-full">
                  غير متاح حالياً
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* معلومات طريقة الدفع - الجزء المعدل */}
      {selectedMethod && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-3 overflow-hidden">
          {selectedMethod.account_number && (
            <div className="flex items-start gap-2 w-full max-w-full overflow-hidden">
              <div className="flex-1 min-w-0 overflow-hidden">
                <span className="text-sm font-medium text-foreground break-all block w-full">
                  {selectedMethod.account_number}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedMethod.account_number || '');
                  toast.success("تم نسخ الرقم!");
                }}
                className="p-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex-shrink-0"
                title="نسخ"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}
          {selectedMethod.account_name && (
            <p className="text-sm text-muted-foreground">{selectedMethod.account_name}</p>
          )}
          {selectedMethod.instructions && (
            <p className="text-xs text-muted-foreground">{selectedMethod.instructions}</p>
          )}
        </div>
      )}

      {/* اختيار المبلغ */}
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => {
                setSelectedAmount(amt);
                setIsCustomMode(false);
                setCustomAmount("");
              }}
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedAmount === amt && !isCustomMode
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="font-bold">${amt}</p>
              <p className="text-xs text-muted-foreground">{amt * dollarRate}ج</p>
            </button>
          ))}
        </div>
        
        {/* مبلغ مخصص */}
        <div className="space-y-2">
          <div className={`flex items-center gap-2 rounded-xl border transition-all ${
            isCustomMode ? 'border-primary bg-primary/5' : 'border-border'
          }`}>
            <div className="flex-1 relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomAmount(val);
                  setIsCustomMode(true);
                  const numVal = parseFloat(val);
                  if (!isNaN(numVal) && numVal > 0) {
                    setSelectedAmount(numVal);
                  } else {
                    setSelectedAmount(null);
                  }
                }}
                onFocus={() => setIsCustomMode(true)}
                placeholder="أدخل مبلغ مخصص"
                className="w-full pr-8 pl-3 py-3 rounded-xl bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            {isCustomMode && customAmount && parseFloat(customAmount) > 0 && (
              <div className="px-3 py-1 bg-primary/10 rounded-lg ml-2">
                <span className="text-sm font-medium text-primary">
                  {Math.round(parseFloat(customAmount) * dollarRate)}ج
                </span>
              </div>
            )}
          </div>
          {isCustomMode && customAmount && parseFloat(customAmount) > 0 && parseFloat(customAmount) < MIN_CUSTOM_AMOUNT && (
            <p className="text-xs text-red-500">الحد الأدنى للإيداع ${MIN_CUSTOM_AMOUNT}</p>
          )}
          {isCustomMode && customAmount && parseFloat(customAmount) <= 0 && (
            <p className="text-xs text-red-500">المبلغ لازم يكون أكبر من صفر</p>
          )}
        </div>
      </div>

      {/* رقم/اسم المحول */}
      <div className="space-y-2">
        <input
          type="text"
          value={senderReference}
          onChange={(e) => setSenderReference(e.target.value)}
          placeholder="رقم الإيصال أو اسم المحول (اختياري)"
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* رفع الصورة */}
      <div className="space-y-2">
        <input type="file" id="proof" accept="image/*" onChange={handleImageChange} className="hidden" />
        <label htmlFor="proof" className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          proofImage ? 'border-green-500 bg-green-500/10' : 'border-border hover:border-primary/50'
        }`}>
          {proofImage ? (
            <span className="flex items-center gap-2 text-green-500 font-medium">
              <CheckCircle className="w-5 h-5" />
              تم رفع الإيصال
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Upload className="w-5 h-5" /> ارفع إيصال التحويل
            </span>
          )}
        </label>
      </div>

      <Button onClick={handleSubmit} disabled={!selectedAmount || selectedAmount < MIN_CUSTOM_AMOUNT || !proofImage || !selectedMethod || isSubmitting} className="w-full py-6 text-lg">
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال"}
      </Button>
    </div>
  );
};

export const getSavedToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const saveToken = (token: string) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export default RechargeRequest;
