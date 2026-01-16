import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Wallet, CreditCard, Bitcoin, Eye, EyeOff, Power, DollarSign, Save } from "lucide-react";
import { toast } from "sonner";
import {
  fetchPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod,
  fetchSettings, updateSetting
} from "@/lib/adminApi";

interface PaymentMethod {
  id: string;
  name: string;
  type: string | null;
  account_number: string | null;
  account_name: string | null;
  account_info: string;
  instructions: string | null;
  is_active: boolean;
  is_visible: boolean | null;
  display_order: number | null;
}

const typeIcons: Record<string, any> = {
  wallet: Wallet,
  instapay: CreditCard,
  binance: Bitcoin,
};

export const PaymentMethodsManagement = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);
  const [dollarRate, setDollarRate] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  const [form, setForm] = useState({
    name: '',
    type: 'wallet',
    account_number: '',
    account_name: '',
    instructions: '',
    is_active: true,
    is_visible: true,
    display_order: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [methodsRes, settingsRes] = await Promise.all([
        fetchPaymentMethods(),
        fetchSettings()
      ]);

      if (methodsRes.success) {
        setMethods(methodsRes.data?.payment_methods || []);
      }

      if (settingsRes.success) {
        const settings = settingsRes.data?.settings || [];
        const rate = settings.find((s: any) => s.key === 'dollar_rate');
        if (rate?.value) {
          setDollarRate(rate.value);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("خطأ في جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddDialog = () => {
    setEditingMethod(null);
    setForm({
      name: '',
      type: 'wallet',
      account_number: '',
      account_name: '',
      instructions: '',
      is_active: true,
      is_visible: true,
      display_order: methods.length,
    });
    setShowDialog(true);
  };

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method);
    setForm({
      name: method.name,
      type: method.type || 'wallet',
      account_number: method.account_number || method.account_info || '',
      account_name: method.account_name || '',
      instructions: method.instructions || '',
      is_active: method.is_active,
      is_visible: method.is_visible ?? true,
      display_order: method.display_order || 0,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("ادخل اسم طريقة الدفع");
      return;
    }

    setSaving(true);
    try {
      const paymentData = {
        name: form.name,
        type: form.type,
        account_number: form.account_number || null,
        account_name: form.account_name || null,
        account_info: form.account_number || '',
        instructions: form.instructions || null,
        is_active: form.is_active,
        is_visible: form.is_visible,
        display_order: form.display_order,
        updated_at: new Date().toISOString(),
      };

      if (editingMethod) {
        const result = await updatePaymentMethod(editingMethod.id, paymentData);
        if (!result.success) throw new Error(result.error);
        toast.success("تم التحديث");
      } else {
        const result = await addPaymentMethod(paymentData);
        if (!result.success) throw new Error(result.error);
        toast.success("تمت الإضافة");
      }

      setShowDialog(false);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error("حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف طريقة الدفع هذه؟")) return;

    try {
      const result = await deletePaymentMethod(id);
      if (!result.success) throw new Error(result.error);
      toast.success("تم الحذف");
      loadData();
    } catch (error) {
      console.error('Error:', error);
      toast.error("حدث خطأ");
    }
  };

  const toggleActive = async (method: PaymentMethod) => {
    try {
      const result = await updatePaymentMethod(method.id, { is_active: !method.is_active });
      if (!result.success) throw new Error(result.error);
      loadData();
      toast.success(method.is_active ? "تم إيقاف التفعيل" : "تم التفعيل");
    } catch (error) {
      console.error('Error:', error);
      toast.error("حدث خطأ");
    }
  };

  const toggleVisible = async (method: PaymentMethod) => {
    try {
      const result = await updatePaymentMethod(method.id, { is_visible: !(method.is_visible ?? true) });
      if (!result.success) throw new Error(result.error);
      loadData();
      toast.success((method.is_visible ?? true) ? "تم إخفاء الطريقة" : "تم إظهار الطريقة");
    } catch (error) {
      console.error('Error:', error);
      toast.error("حدث خطأ");
    }
  };

  const handleSaveRate = async () => {
    if (!dollarRate || isNaN(Number(dollarRate))) {
      toast.error("أدخل سعر صحيح");
      return;
    }

    setSavingRate(true);
    try {
      const result = await updateSetting('dollar_rate', dollarRate);
      if (!result.success) throw new Error(result.error);
      toast.success("تم حفظ سعر الدولار");
    } catch (error) {
      console.error('Error:', error);
      toast.error("حدث خطأ");
    } finally {
      setSavingRate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* سعر الدولار */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold">سعر الدولار</p>
                <p className="text-xs text-muted-foreground">السعر الذي يظهر للعملاء</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">1$ =</span>
              <Input
                type="number"
                value={dollarRate}
                onChange={(e) => setDollarRate(e.target.value)}
                className="w-20 text-center"
                placeholder="51"
              />
              <span className="text-sm text-muted-foreground">جنيه</span>
              <Button onClick={handleSaveRate} disabled={savingRate} size="sm">
                {savingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* طرق الدفع */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          طرق الدفع
        </h2>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          إضافة
        </Button>
      </div>

      <div className="grid gap-3">
        {methods.map((method) => {
          const Icon = typeIcons[method.type || ''] || Wallet;
          const isVisible = method.is_visible ?? true;
          return (
            <Card key={method.id} className={`transition-all ${!isVisible ? 'opacity-40 border-dashed' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${method.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`w-5 h-5 ${method.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{method.name}</span>
                      {!method.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded bg-destructive/10 text-destructive">غير نشط</span>
                      )}
                      {!isVisible && (
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">مخفي</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {(method.account_number || method.account_info) && <span className="font-mono">{method.account_number || method.account_info}</span>}
                      {method.account_name && <span className="mr-2">• {method.account_name}</span>}
                    </div>
                    {method.instructions && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">{method.instructions}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisible(method)}
                      title={isVisible ? "إخفاء" : "إظهار"}
                      className={isVisible ? "text-primary" : "text-muted-foreground"}
                    >
                      {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(method)}
                      title={method.is_active ? "إيقاف" : "تفعيل"}
                      className={method.is_active ? "text-green-500" : "text-muted-foreground"}
                    >
                      <Power className="w-4 h-4" />
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(method)}>
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => handleDelete(method.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {methods.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              لا توجد طرق دفع. أضف طريقة دفع جديدة.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">الاسم</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: محفظة فودافون كاش"
              />
            </div>

            <div>
              <label className="text-sm font-medium">النوع</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 rounded-md border bg-background"
              >
                <option value="wallet">محفظة إلكترونية</option>
                <option value="instapay">InstaPay</option>
                <option value="binance">Binance</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">رقم الحساب / المحفظة</label>
              <Input
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                placeholder="01xxxxxxxxx أو username@instapay"
              />
            </div>

            <div>
              <label className="text-sm font-medium">اسم الحساب</label>
              <Input
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                placeholder="الاسم المسجل"
              />
            </div>

            <div>
              <label className="text-sm font-medium">تعليمات</label>
              <Textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="تعليمات التحويل للعميل..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_visible}
                  onCheckedChange={(checked) => setForm({ ...form, is_visible: checked })}
                />
                <label className="text-sm">ظاهر للعملاء</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <label className="text-sm">نشط (قابل للاستخدام)</label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethodsManagement;