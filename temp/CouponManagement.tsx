import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, Loader2 } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const CouponManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  // Form states
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setCoupons(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!code.trim() || !discountValue) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const couponData = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      max_uses: maxUses ? parseInt(maxUses) : null,
      is_active: isActive,
      expires_at: expiresAt || null,
    };

    if (editingCoupon) {
      const { error } = await supabase
        .from("coupons")
        .update(couponData)
        .eq("id", editingCoupon.id);

      if (error) {
        toast.error("حدث خطأ أثناء التحديث");
      } else {
        toast.success("تم تحديث الكوبون بنجاح");
      }
    } else {
      const { error } = await supabase.from("coupons").insert(couponData);

      if (error) {
        if (error.code === "23505") {
          toast.error("هذا الكوبون موجود مسبقاً");
        } else {
          toast.error("حدث خطأ أثناء الإضافة");
        }
      } else {
        toast.success("تم إضافة الكوبون بنجاح");
      }
    }

    resetForm();
    setDialogOpen(false);
    fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكوبون؟")) return;

    const { error } = await supabase.from("coupons").delete().eq("id", id);

    if (error) {
      toast.error("حدث خطأ أثناء الحذف");
    } else {
      toast.success("تم حذف الكوبون بنجاح");
      fetchCoupons();
    }
  };

  const resetForm = () => {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMaxUses("");
    setIsActive(true);
    setExpiresAt("");
    setEditingCoupon(null);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value.toString());
    setMaxUses(coupon.max_uses?.toString() || "");
    setIsActive(coupon.is_active);
    setExpiresAt(coupon.expires_at?.split("T")[0] || "");
    setDialogOpen(true);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Tag className="h-5 w-5" />
          إدارة الكوبونات
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة كوبون
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? "تعديل الكوبون" : "إضافة كوبون جديد"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>كود الكوبون *</Label>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="SALE50"
                    dir="ltr"
                  />
                  <Button variant="outline" onClick={generateCode}>
                    توليد
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع الخصم *</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                      <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>قيمة الخصم *</Label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percentage" ? "10" : "5.00"}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الحد الأقصى للاستخدام</Label>
                  <Input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="غير محدود"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الانتهاء</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>نشط</Label>
              </div>

              <Button onClick={handleSave} className="w-full">
                حفظ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الخصم</TableHead>
                <TableHead>الاستخدامات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الانتهاء</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-bold">
                    {coupon.code}
                  </TableCell>
                  <TableCell>
                    {coupon.discount_value}
                    {coupon.discount_type === "percentage" ? "%" : " ر.س"}
                  </TableCell>
                  <TableCell>
                    {coupon.current_uses} / {coupon.max_uses || "∞"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        coupon.is_active
                          ? "bg-primary/20 text-primary"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {coupon.is_active ? "نشط" : "غير نشط"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {coupon.expires_at
                      ? new Date(coupon.expires_at).toLocaleDateString("ar-SA")
                      : "غير محدد"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(coupon)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    لا توجد كوبونات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CouponManagement;
