import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, Copy, Wallet, CreditCard, Bitcoin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRESET_AMOUNTS = [5, 10, 15, 20];
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
      <div className="text-center space-y-6">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <div>
            <h3 className="text-xl font-bold text-foreground">تم إرسال طلب الشحن!</h3>
            <p className="text-muted-foreground">سيتم إضافة الرصيد بعد المراجعة</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-primary">⚠️ احتفظ بهذا التوكن - ستحتاجه للشراء والشحن</p>
          <div className="flex items-center justify-center gap-2 bg-background rounded-lg p-3">
            <span className="font-mono text-lg font-bold tracking-wider text-foreground">
              {generatedToken}
            </span>
            <button
              onClick={() => copyToken(generatedToken)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">تم حفظ التوكن تلقائياً في متصفحك</p>
          <div className="mt-2">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
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
      <div className="text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h3 className="text-xl font-bold text-foreground">تم إرسال طلب الشحن!</h3>
        <p className="text-muted-foreground">سيتم إضافة الرصيد بعد المراجعة</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">الدولار = {dollarRate} جنيه</p>

      {/* اختيار طريقة الدفع */}
      <div className="flex flex-wrap gap-2 justify-center">
        {paymentMethods.map((method) => {
          const Icon = typeIcons[method.type || ''] || Wallet;
          const isActive = method.is_active;
          return (
            <button
              key={method.id}
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
              <span className="text-sm">
                {method.name}
                {!isActive && <span className="text-xs mr-1">(غير متاح)</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* معلومات طريقة الدفع */}
      {selectedMethod && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-center">
          {selectedMethod.account_number && (
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-lg font-bold">
                {selectedMethod.account_number}
              </span>
              <button
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
              className={`p-2 rounded-lg border text-center transition-all ${
                selectedAmount === amt && !isCustomMode
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-bold">${amt}</div>
              <div className="text-xs text-muted-foreground">{amt * dollarRate}ج</div>
            </button>
          ))}
        </div>
        
        {/* مبلغ مخصص */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
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
                className={`w-full pr-8 pl-3 py-2 rounded-lg border text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                  isCustomMode && customAmount 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border'
                }`}
              />
            </div>
            {isCustomMode && customAmount && parseFloat(customAmount) > 0 && (
              <div className="bg-primary/10 px-3 py-2 rounded-lg">
                <span className="text-sm font-medium text-primary">
                  {Math.round(parseFloat(customAmount) * dollarRate)}ج
                </span>
              </div>
            )}
          </div>
          {isCustomMode && customAmount && parseFloat(customAmount) <= 0 && (
            <p className="text-xs text-destructive">المبلغ لازم يكون أكبر من صفر</p>
          )}
        </div>
      </div>

      {/* رقم/اسم المحول */}
      <div className="space-y-1">
        <input
          type="text"
          value={senderReference}
          onChange={(e) => setSenderReference(e.target.value)}
          placeholder="رقم الإيصال أو اسم المحول (اختياري)"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* رفع الصورة */}
      <div className="space-y-2">
        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="proof-upload" />
        <label htmlFor="proof-upload" className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${proofImage ? 'border-green-500 bg-green-500/10' : 'border-border hover:border-primary/50'}`}>
          {proofImage ? (
            <span className="text-green-500 font-medium">✓ تم رفع الإيصال</span>
          ) : (
            <span className="text-muted-foreground">
              <Upload className="w-5 h-5 inline ml-2" /> ارفع إيصال التحويل
            </span>
          )}
        </label>
      </div>

      <Button onClick={handleSubmit} disabled={!selectedAmount || !proofImage || !selectedMethod || isSubmitting} className="w-full">
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
