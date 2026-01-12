import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, Copy, Wallet, CreditCard, Bitcoin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AMOUNTS = [5, 10, 15, 20];
const TOKEN_STORAGE_KEY = 'user_token';

interface PaymentMethod {
  id: string;
  name: string;
  type: string | null;
  account_number: string | null;
  account_name: string | null;
  instructions: string | null;
  is_active: boolean;
}

const typeIcons: Record<string, any> = {
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
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [dollarRate, setDollarRate] = useState(51);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch payment methods
      const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .order('display_order');
      setPaymentMethods((methods || []) as PaymentMethod[]);

      // Fetch dollar rate
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'dollar_rate')
        .maybeSingle();

      if (settings?.value) {
        setDollarRate(Number(settings.value));
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
        const { data: tokenData, error: tokenError } = await supabase
          .from('tokens')
          .insert({ token: newToken, balance: 0 })
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
      <div className="text-center space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        <div>
          <p className="text-lg font-bold text-green-700 dark:text-green-400">تم إرسال طلب الشحن!</p>
          <p className="text-sm text-green-600 dark:text-green-500">سيتم إضافة الرصيد بعد المراجعة</p>
        </div>

        <div className="p-4 bg-white dark:bg-card border-2 border-primary rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">⚠️ احتفظ بهذا التوكن - ستحتاجه للشراء والشحن</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-2xl font-bold text-primary tracking-wider select-all">
              {generatedToken}
            </span>
            <button
              onClick={() => copyToken(generatedToken)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Copy className="w-5 h-5 text-primary" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">تم حفظ التوكن تلقائياً في متصفحك</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsSubmitted(false);
            setSelectedAmount(null);
            setSelectedMethod(null);
            setProofImage(null);
            setGeneratedToken(null);
          }}
        >
          إرسال طلب شحن آخر
        </Button>
      </div>
    );
  }

  if (isSubmitted && !generatedToken) {
    return (
      <div className="text-center space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
        <p className="text-sm font-bold text-green-700 dark:text-green-400">تم إرسال طلب الشحن!</p>
        <p className="text-xs text-green-600 dark:text-green-500">سيتم إضافة الرصيد بعد المراجعة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center">الدولار = {dollarRate} جنيه</p>

      {/* اختيار طريقة الدفع */}
      <div className="flex flex-wrap justify-center gap-2">
        {paymentMethods.map((method) => {
          const Icon = typeIcons[method.type || ''] || Wallet;
          const isActive = method.is_active;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => isActive && setSelectedMethod(method)}
              disabled={!isActive}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                !isActive
                  ? 'opacity-50 cursor-not-allowed border-border bg-muted'
                  : selectedMethod?.id === method.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">
                {method.name}
                {!isActive && <span className="text-[10px] mr-1 text-muted-foreground">(غير متاح)</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* معلومات طريقة الدفع */}
      {selectedMethod && (
        <div className="p-4 bg-gradient-to-b from-primary/10 to-primary/5 rounded-xl border border-primary/30 space-y-3 overflow-hidden">
          {selectedMethod.account_number && (
            <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border shadow-sm" dir="ltr">
              <span className="font-mono text-sm font-bold text-foreground flex-1 break-all select-all text-left">
                {selectedMethod.account_number}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedMethod.account_number || '');
                  toast.success("تم نسخ الرقم!");
                }}
                className="flex-shrink-0 p-2 bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                title="نسخ"
              >
                <Copy className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          )}
          {selectedMethod.account_name && (
            <p className="text-center text-sm font-semibold text-foreground">{selectedMethod.account_name}</p>
          )}
          {selectedMethod.instructions && (
            <p className="text-center text-xs text-muted-foreground">{selectedMethod.instructions}</p>
          )}
        </div>
      )}

      {/* اختيار المبلغ */}
      <div className="grid grid-cols-4 gap-2">
        {AMOUNTS.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => setSelectedAmount(amt)}
            className={`p-2 rounded-lg border text-center transition-all ${
              selectedAmount === amt
                ? 'border-primary bg-primary/10 text-primary font-bold'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="text-sm font-bold">${amt}</span>
            <span className="block text-xs text-muted-foreground">{amt * dollarRate}ج</span>
          </button>
        ))}
      </div>

      {/* رفع الصورة */}
      <div>
        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="proof" />
        <label
          htmlFor="proof"
          className={`block p-3 border border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            proofImage ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-border hover:border-primary/50'
          }`}
        >
          {proofImage ? (
            <span className="text-xs text-green-700 dark:text-green-400">✓ تم رفع الإيصال</span>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Upload className="w-4 h-4" /> ارفع إيصال التحويل
            </span>
          )}
        </label>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !selectedAmount || !proofImage || !selectedMethod}
        className="w-full"
        size="sm"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال"}
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
