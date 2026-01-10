import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasExistingAdmin, setHasExistingAdmin] = useState(true); // افتراضياً فيه أدمن
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already logged in and if there are existing admins
    const checkSession = async () => {
      // Check if any admin exists
      const { count } = await supabase
        .from('admin_auth')
        .select('*', { count: 'exact', head: true });
      
      setHasExistingAdmin((count || 0) > 0);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is admin
        const { data: adminData } = await supabase
          .from('admin_auth')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (adminData) {
          navigate('/admin');
        }
      }
      setCheckingSession(false);
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: adminData } = await supabase
          .from('admin_auth')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (adminData) {
          navigate('/admin');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is admin
        const { data: adminData, error: adminError } = await supabase
          .from('admin_auth')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (adminError || !adminData) {
          await supabase.auth.signOut();
          toast({
            title: 'خطأ',
            description: 'هذا الحساب ليس لديه صلاحيات أدمن',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'نجاح',
          description: 'تم تسجيل الدخول بنجاح',
        });
        navigate('/admin');
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل تسجيل الدخول',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/admin`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create admin_auth entry with super admin permissions (first user)
        const { error: insertError } = await supabase
          .from('admin_auth')
          .insert({
            user_id: data.user.id,
            is_super_admin: true,
            can_manage_orders: true,
            can_manage_products: true,
            can_manage_tokens: true,
            can_manage_refunds: true,
            can_manage_stock: true,
            can_manage_coupons: true,
            can_manage_recharges: true,
            can_manage_payment_methods: true,
            can_manage_users: true,
          });

        if (insertError) {
          console.error('Error creating admin:', insertError);
          toast({
            title: 'تحذير',
            description: 'تم إنشاء الحساب لكن فشل إضافة صلاحيات الأدمن',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'نجاح',
          description: 'تم إنشاء حساب الأدمن بنجاح! يمكنك الآن تسجيل الدخول',
        });
        setIsSignUp(false);
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إنشاء الحساب',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card-simple p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">
            <span className="text-primary">BOOM</span>
            <span className="text-foreground">PAY</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            {isSignUp ? 'إنشاء حساب أدمن جديد' : 'لوحة تحكم المسؤول'}
          </p>
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full pr-10"
                placeholder="admin@example.com"
                required
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full pr-10"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {isLoading ? 'جاري المعالجة...' : isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
          </button>
        </form>

        {/* إظهار خيار التسجيل فقط إذا لم يكن هناك أي أدمن */}
        {!hasExistingAdmin && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? 'لديك حساب؟ تسجيل الدخول' : 'إنشاء حساب أدمن جديد'}
            </button>
          </div>
        )}

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            🔒 هذه الصفحة محمية بنظام Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;