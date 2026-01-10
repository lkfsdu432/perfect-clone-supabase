import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AdminPermissions {
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
}

interface AdminAuth {
  user: User | null;
  session: Session | null;
  permissions: AdminPermissions | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const defaultPermissions: AdminPermissions = {
  is_super_admin: false,
  can_manage_orders: false,
  can_manage_products: false,
  can_manage_tokens: false,
  can_manage_refunds: false,
  can_manage_stock: false,
  can_manage_coupons: false,
  can_manage_recharges: false,
  can_manage_payment_methods: false,
  can_manage_users: false,
};

export const useAdminAuth = (): AdminAuth => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Defer fetching admin permissions
      if (session?.user) {
        setTimeout(() => {
          fetchAdminPermissions(session.user.id);
        }, 0);
      } else {
        setPermissions(null);
        setIsLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchAdminPermissions(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAdminPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_auth')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin permissions:', error);
        setPermissions(null);
      } else if (data) {
        setPermissions({
          is_super_admin: data.is_super_admin,
          can_manage_orders: data.can_manage_orders,
          can_manage_products: data.can_manage_products,
          can_manage_tokens: data.can_manage_tokens,
          can_manage_refunds: data.can_manage_refunds,
          can_manage_stock: data.can_manage_stock,
          can_manage_coupons: data.can_manage_coupons,
          can_manage_recharges: data.can_manage_recharges,
          can_manage_payment_methods: data.can_manage_payment_methods,
          can_manage_users: data.can_manage_users,
        });
      } else {
        setPermissions(null);
      }
    } catch (error) {
      console.error('Error:', error);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPermissions(null);
  };

  return {
    user,
    session,
    permissions,
    isLoading,
    isAdmin: !!permissions,
    signOut,
  };
};

export default useAdminAuth;