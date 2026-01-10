import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, ShoppingBag, Wallet, RotateCcw, Clock, CheckCircle2, 
  XCircle, Loader2, ChevronDown, ChevronUp, History, DollarSign,
  Filter, Calendar, RefreshCw
} from 'lucide-react';

interface TokenActivity {
  id: string;
  type: 'order' | 'recharge' | 'refund';
  amount: number;
  status: string;
  created_at: string;
  details: string;
  balance_change: number;
}

interface TokenWithActivities {
  id: string;
  token: string;
  balance: number;
  is_blocked: boolean;
  activities: TokenActivity[];
  total_orders: number;
  total_recharges: number;
  total_refunds: number;
  total_spent: number;
  total_recharged: number;
  total_refunded: number;
}

type ActivityTypeFilter = 'all' | 'order' | 'recharge' | 'refund';
type StatusFilter = 'all' | 'completed' | 'pending' | 'rejected';

const TokenActivityLog = () => {
  const [tokens, setTokens] = useState<TokenWithActivities[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  
  // Filters
  const [activityTypeFilter, setActivityTypeFilter] = useState<ActivityTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest_balance' | 'lowest_balance'>('newest');

  useEffect(() => {
    fetchTokensWithActivities();
  }, []);

  const fetchTokensWithActivities = async () => {
    setIsLoading(true);
    try {
      const { data: tokensData, error: tokensError } = await supabase
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (tokensError) throw tokensError;

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: rechargesData } = await supabase
        .from('recharge_requests')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: refundsData } = await supabase
        .from('refund_requests')
        .select('*')
        .order('created_at', { ascending: false });

      const tokensWithActivities: TokenWithActivities[] = (tokensData || []).map((token: any) => {
        const tokenOrders = (ordersData || []).filter((o: any) => o.token_id === token.id);
        const tokenRecharges = (rechargesData || []).filter((r: any) => r.token_id === token.id);
        const tokenRefunds = (refundsData || []).filter((r: any) => r.token_id === token.id);

        const activities: TokenActivity[] = [];

        tokenOrders.forEach((order: any) => {
          activities.push({
            id: order.id,
            type: 'order',
            amount: order.total_price || order.amount || 0,
            status: order.status,
            created_at: order.created_at,
            details: `طلب #${order.order_number}`,
            balance_change: -(order.total_price || order.amount || 0),
          });
        });

        tokenRecharges.forEach((recharge: any) => {
          activities.push({
            id: recharge.id,
            type: 'recharge',
            amount: recharge.amount || 0,
            status: recharge.status,
            created_at: recharge.created_at,
            details: `شحن عبر ${recharge.payment_method || 'غير محدد'}`,
            balance_change: recharge.status === 'approved' ? (recharge.amount || 0) : 0,
          });
        });

        tokenRefunds.forEach((refund: any) => {
          activities.push({
            id: refund.id,
            type: 'refund',
            amount: refund.refund_amount || 0,
            status: refund.status,
            created_at: refund.created_at,
            details: `استرداد طلب #${refund.order_number}`,
            balance_change: refund.status === 'approved' ? (refund.refund_amount || 0) : 0,
          });
        });

        activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return {
          id: token.id,
          token: token.token,
          balance: token.balance,
          is_blocked: token.is_blocked,
          activities,
          total_orders: tokenOrders.length,
          total_recharges: tokenRecharges.length,
          total_refunds: tokenRefunds.length,
          total_spent: tokenOrders.reduce((sum: number, o: any) => sum + (o.total_price || o.amount || 0), 0),
          total_recharged: tokenRecharges
            .filter((r: any) => r.status === 'approved')
            .reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
          total_refunded: tokenRefunds
            .filter((r: any) => r.status === 'approved')
            .reduce((sum: number, r: any) => sum + (r.refund_amount || 0), 0),
        };
      });

      setTokens(tokensWithActivities);
    } catch (error) {
      console.error('Error fetching token activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
      case 'pending':
        return <Clock className="w-3.5 h-3.5 text-warning" />;
      case 'in_progress':
        return <Loader2 className="w-3.5 h-3.5 text-info animate-spin" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'approved': return 'موافق عليه';
      case 'pending': return 'قيد الانتظار';
      case 'in_progress': return 'قيد التنفيذ';
      case 'rejected': return 'مرفوض';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingBag className="w-4 h-4" />;
      case 'recharge': return <Wallet className="w-4 h-4" />;
      case 'refund': return <RotateCcw className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'order': return 'طلب';
      case 'recharge': return 'شحن';
      case 'refund': return 'استرداد';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'order': return 'bg-primary/10 text-primary border-primary/20';
      case 'recharge': return 'bg-success/10 text-success border-success/20';
      case 'refund': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter activities within each token
  const filterActivities = (activities: TokenActivity[]) => {
    return activities.filter(activity => {
      // Type filter
      if (activityTypeFilter !== 'all' && activity.type !== activityTypeFilter) return false;
      
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed' && !['completed', 'approved'].includes(activity.status)) return false;
        if (statusFilter === 'pending' && activity.status !== 'pending') return false;
        if (statusFilter === 'rejected' && !['rejected', 'cancelled'].includes(activity.status)) return false;
      }
      
      return true;
    });
  };

  // Filter and sort tokens
  const filteredTokens = tokens
    .filter(token => token.token.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(token => {
      // If filters are applied, only show tokens that have matching activities
      if (activityTypeFilter !== 'all' || statusFilter !== 'all') {
        return filterActivities(token.activities).length > 0;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return 0; // Already sorted by created_at desc
        case 'oldest':
          return 0; // Would need created_at field
        case 'highest_balance':
          return b.balance - a.balance;
        case 'lowest_balance':
          return a.balance - b.balance;
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">جاري تحميل السجل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search & Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        {/* Search Row */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالتوكن..."
              className="input-field w-full pr-10"
            />
          </div>
          <button
            onClick={fetchTokensWithActivities}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-xl transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>فلترة:</span>
          </div>

          {/* Activity Type Filter */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
            {[
              { value: 'all', label: 'الكل', icon: null },
              { value: 'order', label: 'طلبات', icon: ShoppingBag },
              { value: 'recharge', label: 'شحن', icon: Wallet },
              { value: 'refund', label: 'استرداد', icon: RotateCcw },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setActivityTypeFilter(option.value as ActivityTypeFilter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activityTypeFilter === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {option.icon && <option.icon className="w-3.5 h-3.5" />}
                {option.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
            {[
              { value: 'all', label: 'كل الحالات' },
              { value: 'completed', label: 'مكتمل' },
              { value: 'pending', label: 'قيد الانتظار' },
              { value: 'rejected', label: 'مرفوض' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value as StatusFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted/50 border-0 text-muted-foreground focus:ring-1 focus:ring-primary"
          >
            <option value="newest">الأحدث</option>
            <option value="highest_balance">أعلى رصيد</option>
            <option value="lowest_balance">أقل رصيد</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-primary mb-2">
            <History className="w-4 h-4" />
            <span className="text-xs font-medium">التوكنات</span>
          </div>
          <p className="text-2xl font-bold text-primary">{tokens.length}</p>
        </div>
        <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-success mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">إجمالي الشحن</span>
          </div>
          <p className="text-2xl font-bold text-success">
            ${tokens.reduce((sum, t) => sum + t.total_recharged, 0).toFixed(0)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-info/10 to-info/5 border border-info/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-info mb-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-xs font-medium">إجمالي المشتريات</span>
          </div>
          <p className="text-2xl font-bold text-info">
            ${tokens.reduce((sum, t) => sum + t.total_spent, 0).toFixed(0)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-warning mb-2">
            <RotateCcw className="w-4 h-4" />
            <span className="text-xs font-medium">إجمالي الاستردادات</span>
          </div>
          <p className="text-2xl font-bold text-warning">
            ${tokens.reduce((sum, t) => sum + t.total_refunded, 0).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Tokens List */}
      <div className="space-y-3">
        {filteredTokens.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground mb-2">لا توجد توكنات</p>
            <p className="text-sm text-muted-foreground/70">جرب تغيير الفلتر أو البحث</p>
          </div>
        ) : (
          filteredTokens.map((token) => {
            const filteredActivities = filterActivities(token.activities);
            
            return (
              <div
                key={token.id}
                className="bg-card border border-border rounded-2xl overflow-hidden transition-shadow hover:shadow-lg"
              >
                {/* Token Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedToken(expandedToken === token.id ? null : token.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${token.is_blocked ? 'bg-destructive' : 'bg-success'}`} />
                      <span className="font-mono font-bold text-lg tracking-wide">{token.token}</span>
                      <div className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
                        token.balance > 0 
                          ? 'bg-success/10 text-success border border-success/20' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        ${token.balance}
                      </div>
                      {token.is_blocked && (
                        <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded-lg font-medium">
                          محظور
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 bg-primary/5 px-2 py-1 rounded-lg">
                          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                          <span className="font-medium">{token.total_orders}</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-success/5 px-2 py-1 rounded-lg">
                          <Wallet className="w-3.5 h-3.5 text-success" />
                          <span className="font-medium">{token.total_recharges}</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-warning/5 px-2 py-1 rounded-lg">
                          <RotateCcw className="w-3.5 h-3.5 text-warning" />
                          <span className="font-medium">{token.total_refunds}</span>
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg transition-colors ${expandedToken === token.id ? 'bg-primary/10' : 'bg-muted/50'}`}>
                        {expandedToken === token.id ? (
                          <ChevronUp className="w-5 h-5 text-primary" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mini Stats */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs">
                      <span className="text-muted-foreground">شحن: </span>
                      <span className="text-success font-bold">${token.total_recharged}</span>
                    </span>
                    <span className="text-xs">
                      <span className="text-muted-foreground">مشتريات: </span>
                      <span className="text-info font-bold">${token.total_spent}</span>
                    </span>
                    <span className="text-xs">
                      <span className="text-muted-foreground">استرداد: </span>
                      <span className="text-warning font-bold">${token.total_refunded}</span>
                    </span>
                  </div>
                </div>

                {/* Activities List */}
                {expandedToken === token.id && (
                  <div className="border-t border-border bg-muted/20">
                    {filteredActivities.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        لا توجد حركات مطابقة للفلتر
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
                        {filteredActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl border ${getTypeColor(activity.type)}`}>
                                {getTypeIcon(activity.type)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{getTypeLabel(activity.type)}</span>
                                  <span className="text-xs text-muted-foreground">{activity.details}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {getStatusIcon(activity.status)}
                                  <span className="text-xs text-muted-foreground">
                                    {getStatusLabel(activity.status)}
                                  </span>
                                  <span className="text-xs text-muted-foreground/50">•</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(activity.created_at).toLocaleDateString('ar-EG')} - {new Date(activity.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-left">
                              <span className={`font-bold ${
                                activity.balance_change > 0 
                                  ? 'text-success' 
                                  : activity.balance_change < 0 
                                    ? 'text-destructive' 
                                    : 'text-muted-foreground'
                              }`}>
                                {activity.balance_change > 0 ? '+' : ''}{activity.balance_change !== 0 ? `$${activity.balance_change}` : '-'}
                              </span>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                ${activity.amount}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TokenActivityLog;
