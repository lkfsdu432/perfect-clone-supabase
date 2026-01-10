import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Save, X, User, Shield, Eye, EyeOff, Settings, Check, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AdminUser {
  id: string;
  username: string;
  password: string;
  is_active: boolean;
  can_manage_orders: boolean;
  can_manage_products: boolean;
  can_manage_tokens: boolean;
  can_manage_refunds: boolean;
  can_manage_stock: boolean;
  can_manage_coupons: boolean;
  can_manage_recharges: boolean;
  can_manage_payment_methods: boolean;
  can_manage_users: boolean;
  created_at: string;
}

const PERMISSIONS = [
  { key: 'can_manage_orders', label: 'إدارة الطلبات' },
  { key: 'can_manage_products', label: 'إدارة المنتجات' },
  { key: 'can_manage_tokens', label: 'إدارة التوكنات' },
  { key: 'can_manage_refunds', label: 'إدارة الاستردادات' },
  { key: 'can_manage_stock', label: 'إدارة المخزون' },
  { key: 'can_manage_coupons', label: 'إدارة الكوبونات' },
  { key: 'can_manage_recharges', label: 'إدارة الشحن' },
  { key: 'can_manage_payment_methods', label: 'طرق الدفع' },
  { key: 'can_manage_users', label: 'إدارة المستخدمين' },
];

export const AdminUsersManagement = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [savingPermissions, setSavingPermissions] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل تحميل المستخدمين', variant: 'destructive' });
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setForm({
      username: '',
      password: '',
      is_active: true,
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    // إضافة مستخدم جديد (بدون صلاحيات - يحددها الأدمن لاحقاً)
    const { error } = await supabase
      .from('admin_users')
      .insert({
        username: form.username,
        password: form.password,
        is_active: form.is_active,
        can_manage_orders: false,
        can_manage_products: false,
        can_manage_tokens: false,
        can_manage_refunds: false,
        can_manage_stock: false,
        can_manage_coupons: false,
        can_manage_recharges: false,
        can_manage_payment_methods: false,
        can_manage_users: false,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'خطأ', description: 'اسم المستخدم موجود مسبقاً', variant: 'destructive' });
      } else {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'نجاح', description: 'تم إضافة المستخدم بنجاح - حدد صلاحياته الآن' });
      setShowModal(false);
      resetForm();
      fetchUsers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    const { error } = await supabase.from('admin_users').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'نجاح', description: 'تم حذف المستخدم' });
      fetchUsers();
    }
  };

  const toggleActive = async (user: AdminUser) => {
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: !user.is_active })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: user.is_active ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم' });
      fetchUsers();
    }
  };

  const handlePermissionChange = async (userId: string, permKey: string, value: boolean) => {
    setSavingPermissions(userId);

    const { error } = await supabase
      .from('admin_users')
      .update({ [permKey]: value })
      .eq('id', userId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, [permKey]: value } : u
      ));
    }

    setSavingPermissions(null);
  };

  const toggleAllPermissions = async (userId: string, enable: boolean) => {
    setSavingPermissions(userId);

    const allPermissions = {
      can_manage_orders: enable,
      can_manage_products: enable,
      can_manage_tokens: enable,
      can_manage_refunds: enable,
      can_manage_stock: enable,
      can_manage_coupons: enable,
      can_manage_recharges: enable,
      can_manage_payment_methods: enable,
      can_manage_users: enable,
    };

    const { error } = await supabase
      .from('admin_users')
      .update(allPermissions)
      .eq('id', userId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, ...allPermissions } : u
      ));
      toast({ title: 'تم', description: enable ? 'تم تفعيل كل الصلاحيات' : 'تم إلغاء كل الصلاحيات' });
    }

    setSavingPermissions(null);
  };

  const updatePassword = async (userId: string, newPassword: string) => {
    if (!newPassword) return;

    const { error } = await supabase
      .from('admin_users')
      .update({ password: newPassword })
      .eq('id', userId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم تحديث كلمة المرور' });
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <User className="w-5 h-5" />
          مدراء النظام ({users.length})
        </h2>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          إضافة مستخدم
        </button>
      </div>

      {/* Super Admin Note */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="w-5 h-5" />
          <span className="font-medium">الأدمن الرئيسي (boom) له كل الصلاحيات ولا يظهر هنا</span>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>لا يوجد مستخدمين مسجلين</p>
          <p className="text-sm">اضغط على "إضافة مستخدم" لإنشاء مستخدم جديد</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {users.map((user) => {
            const isExpanded = expandedUser === user.id;
            const hasAnyPermission = PERMISSIONS.some(p => (user as any)[p.key]);

            return (
              <div
                key={user.id}
                className={`bg-card rounded-xl border overflow-hidden ${
                  !user.is_active ? 'border-destructive/30 opacity-70' : 'border-border'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        user.is_active ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <User className={`w-5 h-5 ${
                          user.is_active ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <p className="font-bold">{user.username}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString('ar-EG')}
                          </p>
                          {!user.is_active && (
                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                              معطل
                            </span>
                          )}
                          {!hasAnyPermission && user.is_active && (
                            <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                              بانتظار الصلاحيات
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(user)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          user.is_active
                            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                            : 'bg-success/10 text-success hover:bg-success/20'
                        }`}
                      >
                        {user.is_active ? 'تعطيل' : 'تفعيل'}
                      </button>

                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isExpanded ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                        title="إدارة الصلاحيات"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Permission badges */}
                  {hasAnyPermission && !isExpanded && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {PERMISSIONS.filter(p => (user as any)[p.key]).map((p) => (
                        <span
                          key={p.key}
                          className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                        >
                          {p.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded Permissions Section */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">الصلاحيات التفصيلية</h3>
                      <div className="flex items-center gap-2">
                        {savingPermissions === user.id && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        )}
                        <button
                          onClick={() => toggleAllPermissions(user.id, true)}
                          disabled={savingPermissions === user.id}
                          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          تفعيل الكل
                        </button>
                        <button
                          onClick={() => toggleAllPermissions(user.id, false)}
                          disabled={savingPermissions === user.id}
                          className="text-xs px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          إلغاء الكل
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PERMISSIONS.map((perm) => {
                        const isEnabled = (user as any)[perm.key] ?? false;

                        return (
                          <div
                            key={perm.key}
                            className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                          >
                            <Label
                              htmlFor={`${user.id}-${perm.key}`}
                              className="text-sm cursor-pointer"
                            >
                              {perm.label}
                            </Label>
                            <Switch
                              id={`${user.id}-${perm.key}`}
                              checked={isEnabled}
                              disabled={savingPermissions === user.id}
                              onCheckedChange={(value) =>
                                handlePermissionChange(user.id, perm.key, value)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Change Password */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="كلمة مرور جديدة"
                          className="input-field flex-1"
                          id={`password-${user.id}`}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById(`password-${user.id}`) as HTMLInputElement;
                            if (input?.value) {
                              updatePassword(user.id, input.value);
                              input.value = '';
                            }
                          }}
                          className="btn-primary px-4 py-2"
                        >
                          تغيير كلمة المرور
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg">إضافة مستخدم جديد</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-2">اسم المستخدم *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="input-field w-full"
                  placeholder="اسم المستخدم"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2">كلمة المرور *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field w-full pr-10"
                    placeholder="كلمة المرور"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  مستخدم نشط
                </label>
              </div>

              <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                💡 بعد إضافة المستخدم، اضغط على أيقونة الإعدادات لتحديد صلاحياته
              </p>

              {/* Submit */}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  إضافة المستخدم
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersManagement;
