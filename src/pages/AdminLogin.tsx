import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Lock, User, LogIn, Loader2 } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface AdminSession {
  id: string;
  username: string;
  permissions: {
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
  };
}

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already logged in
    const session = localStorage.getItem('admin_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed?.id) {
          navigate('/admin');
          return;
        }
      } catch {}
    }
    setIsCheckingSession(false);
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المستخدم وكلمة المرور', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({ title: 'خطأ في تسجيل الدخول', description: result.error || 'بيانات الدخول غير صحيحة', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Save session
      localStorage.setItem('admin_session', JSON.stringify(result.admin));
      
      toast({ title: 'تم تسجيل الدخول بنجاح' });
      navigate('/admin');
    } catch (error) {
      console.error('Login error:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ في تسجيل الدخول', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
            <p className="text-white/80 text-sm mt-1">سجل دخولك للمتابعة</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field w-full pr-10"
                  placeholder="اسم المستخدم"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field w-full pr-10"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
