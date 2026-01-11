import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, ShoppingBag, Wallet, RotateCcw, Clock, CheckCircle2, 
  XCircle, Loader2, ChevronDown, ChevronUp, History, DollarSign,
  Filter, RefreshCw, Calendar, ArrowUpDown, TrendingUp, TrendingDown,
  Hash, Eye, X, Globe, Timer, AlertTriangle
} from 'lucide-react';

interface TokenActivity {
  id: string;
  type: 'order' | 'recharge' | 'refund';
  amount: number;
  status: string;
  created_at: string;
  details: string;
  balance_change: number;
  order_number?: string;
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
  created_at: string;
  expires_at: string | null;
  created_ip: string | null;
  last_recharge_at: string | null;
}

type ActivityTypeFilter = 'all' | 'order' | 'recharge' | 'refund';
type StatusFilter = 'all' | 'completed' | 'pending' | 'rejected';
type SortOrder = 'newest' | 'oldest' | 'highest_balance' | 'lowest_balance' | 'most_active';

const TokenActivityLog = () => {
  const [tokens, setTokens] = useState<TokenWithActivities[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenWithActivities | null>(null);
  
  // Filters
  const [activityTypeFilter, setActivityTypeFilter] = useState<ActivityTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
            order_number: order.order_number,
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
            order_number: refund.order_number,
          });
        });

        activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Find last approved recharge date
        const approvedRecharges = tokenRecharges.filter((r: any) => r.status === 'approved');
        const lastRechargeAt = approvedRecharges.length > 0 
          ? approvedRecharges.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : null;

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
          created_at: token.created_at,
          expires_at: token.expires_at || null,
          created_ip: token.created_ip || null,
          last_recharge_at: lastRechargeAt,
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
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-info animate-spin" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
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

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'completed':
      case 'approved':
        return `${baseClasses} bg-success/15 text-success`;
      case 'pending':
        return `${baseClasses} bg-warning/15 text-warning`;
      case 'in_progress':
        return `${baseClasses} bg-info/15 text-info`;
      case 'rejected':
      case 'cancelled':
        return `${baseClasses} bg-destructive/15 text-destructive`;
      default:
        return `${baseClasses} bg-muted text-muted-foreground`;
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

  const getTypeBadge = (type: string) => {
    const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold";
    switch (type) {
      case 'order': return `${baseClasses} bg-primary/10 text-primary`;
      case 'recharge': return `${baseClasses} bg-success/10 text-success`;
      case 'refund': return `${baseClasses} bg-warning/10 text-warning`;
      default: return `${baseClasses} bg-muted text-muted-foreground`;
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

      // Date filter
      if (dateFrom) {
        const activityDate = new Date(activity.created_at);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (activityDate < fromDate) return false;
      }
      if (dateTo) {
        const activityDate = new Date(activity.created_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (activityDate > toDate) return false;
      }
      
      return true;
    });
  };

  // Filter and sort tokens
  const filteredTokens = tokens
    .filter(token => token.token.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(token => {
      // If filters are applied, only show tokens that have matching activities
      if (activityTypeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) {
        return filterActivities(token.activities).length > 0;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest_balance':
          return b.balance - a.balance;
        case 'lowest_balance':
          return a.balance - b.balance;
        case 'most_active':
          return b.activities.length - a.activities.length;
        default:
          return 0;
      }
    });

  const totalStats = {
    tokens: tokens.length,
    totalRecharged: tokens.reduce((sum, t) => sum + t.total_recharged, 0),
    totalSpent: tokens.reduce((sum, t) => sum + t.total_spent, 0),
    totalRefunded: tokens.reduce((sum, t) => sum + t.total_refunded, 0),
    totalBalance: tokens.reduce((sum, t) => sum + t.balance, 0),
  };

  const clearFilters = () => {
    setActivityTypeFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortOrder('newest');
  };

  const hasActiveFilters = activityTypeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 mx-auto" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary mx-auto animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">جاري تحميل السجل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <History className="w-6 h-6 text-primary" />
            </div>
            سجل حركات التوكنات
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            متابعة جميع العمليات المالية للتوكنات
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border hover:bg-muted'
            }`}
          >
            <Filter className="w-4 h-4" />
            فلترة
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary-foreground" />
            )}
          </button>
          <button
            onClick={fetchTokensWithActivities}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Hash className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">إجمالي</span>
          </div>
          <p className="text-2xl font-bold">{totalStats.tokens}</p>
          <p className="text-xs text-muted-foreground mt-1">توكن مسجل</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <span className="text-xs text-success">+</span>
          </div>
          <p className="text-2xl font-bold text-success">${totalStats.totalRecharged.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">إجمالي الشحن</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <ShoppingBag className="w-4 h-4 text-info" />
            </div>
            <span className="text-xs text-info">−</span>
          </div>
          <p className="text-2xl font-bold text-info">${totalStats.totalSpent.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">إجمالي المشتريات</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <RotateCcw className="w-4 h-4 text-warning" />
            </div>
            <span className="text-xs text-warning">↺</span>
          </div>
          <p className="text-2xl font-bold text-warning">${totalStats.totalRefunded.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">إجمالي الاستردادات</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-primary">$</span>
          </div>
          <p className="text-2xl font-bold">${totalStats.totalBalance.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">الرصيد الإجمالي</p>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              خيارات الفلترة
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-destructive hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                مسح الفلاتر
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Activity Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">نوع الحركة</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'all', label: 'الكل' },
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
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {option.icon && <option.icon className="w-3 h-3" />}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">الحالة</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'all', label: 'الكل' },
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
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">الفترة الزمنية</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="input-field w-full text-xs pr-8 py-1.5"
                    placeholder="من"
                  />
                </div>
                <div className="relative flex-1">
                  <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="input-field w-full text-xs pr-8 py-1.5"
                    placeholder="إلى"
                  />
                </div>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">الترتيب</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="input-field w-full text-xs py-1.5"
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
                <option value="highest_balance">أعلى رصيد</option>
                <option value="lowest_balance">أقل رصيد</option>
                <option value="most_active">الأكثر نشاطاً</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ابحث بالتوكن..."
          className="input-field w-full pr-12 py-3 text-base"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          عرض <span className="font-semibold text-foreground">{filteredTokens.length}</span> من{' '}
          <span className="font-semibold text-foreground">{tokens.length}</span> توكن
        </span>
        {hasActiveFilters && (
          <span className="text-primary">الفلاتر نشطة</span>
        )}
      </div>

      {/* Tokens List */}
      <div className="space-y-3">
        {filteredTokens.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium mb-2">لا توجد توكنات</p>
            <p className="text-sm text-muted-foreground">جرب تغيير الفلتر أو البحث</p>
          </div>
        ) : (
          filteredTokens.map((token) => {
            const filteredActivities = filterActivities(token.activities);
            const isExpanded = expandedToken === token.id;
            
            return (
              <div
                key={token.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                {/* Token Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedToken(isExpanded ? null : token.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Token Info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        token.is_blocked ? 'bg-destructive' : 'bg-success'
                      }`} />
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg tracking-wider truncate">{token.token}</span>
                          {token.is_blocked && (
                            <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded-md font-medium flex-shrink-0">
                              محظور
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>تسجيل: {new Date(token.created_at).toLocaleDateString('ar-EG')}</span>
                          <span>•</span>
                          <span>{token.activities.length} حركة</span>
                          {token.created_ip && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-info">
                                <Globe className="w-3 h-3" />
                                {token.created_ip}
                              </span>
                            </>
                          )}
                          {token.last_recharge_at && (
                            <>
                              <span>•</span>
                              {(() => {
                                const expiresAt = new Date(token.last_recharge_at);
                                expiresAt.setDate(expiresAt.getDate() + 30);
                                const now = new Date();
                                const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                const isExpired = daysLeft <= 0;
                                const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
                                return (
                                  <span className={`flex items-center gap-1 ${
                                    isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-muted-foreground'
                                  }`}>
                                    <Timer className="w-3 h-3" />
                                    {isExpired ? (
                                      'منتهي الصلاحية'
                                    ) : (
                                      `ينتهي: ${expiresAt.toLocaleDateString('ar-EG')} (${daysLeft} يوم)`
                                    )}
                                  </span>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats & Balance */}
                    <div className="flex items-center gap-6">
                      {/* Mini Stats (Hidden on mobile) */}
                      <div className="hidden lg:flex items-center gap-4">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 rounded-lg">
                          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-medium">{token.total_orders}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/5 rounded-lg">
                          <Wallet className="w-3.5 h-3.5 text-success" />
                          <span className="text-xs font-medium">{token.total_recharges}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-warning/5 rounded-lg">
                          <RotateCcw className="w-3.5 h-3.5 text-warning" />
                          <span className="text-xs font-medium">{token.total_refunds}</span>
                        </div>
                      </div>

                      {/* Balance */}
                      <div className={`px-4 py-2 rounded-xl text-lg font-bold ${
                        token.balance > 0 
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        ${token.balance.toFixed(2)}
                      </div>

                      {/* Expand Icon */}
                      <div className={`p-2 rounded-lg transition-all ${
                        isExpanded ? 'bg-primary/10 rotate-180' : 'bg-muted/50'
                      }`}>
                        <ChevronDown className={`w-5 h-5 transition-colors ${
                          isExpanded ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats Bar */}
                  <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <span className="text-xs text-muted-foreground">شحن:</span>
                      <span className="text-sm font-bold text-success">${token.total_recharged.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-info" />
                      <span className="text-xs text-muted-foreground">مشتريات:</span>
                      <span className="text-sm font-bold text-info">${token.total_spent.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-warning" />
                      <span className="text-xs text-muted-foreground">استرداد:</span>
                      <span className="text-sm font-bold text-warning">${token.total_refunded.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Activities List */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Activities Header */}
                    <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        الحركات ({filteredActivities.length})
                      </span>
                      {hasActiveFilters && filteredActivities.length !== token.activities.length && (
                        <span className="text-xs text-muted-foreground">
                          (من أصل {token.activities.length})
                        </span>
                      )}
                    </div>

                    {filteredActivities.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        لا توجد حركات مطابقة للفلتر
                      </div>
                    ) : (
                      <div className="max-h-[450px] overflow-y-auto">
                        {filteredActivities.map((activity, index) => (
                          <div
                            key={activity.id}
                            className={`px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors ${
                              index !== filteredActivities.length - 1 ? 'border-b border-border/30' : ''
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Type Badge */}
                              <div className={getTypeBadge(activity.type)}>
                                {getTypeIcon(activity.type)}
                                {getTypeLabel(activity.type)}
                              </div>

                              {/* Details */}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{activity.details}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={getStatusBadge(activity.status)}>
                                    {getStatusLabel(activity.status)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(activity.created_at).toLocaleDateString('ar-EG')} - {new Date(activity.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="text-left flex-shrink-0">
                              <span className={`text-base font-bold ${
                                activity.balance_change > 0 
                                  ? 'text-success' 
                                  : activity.balance_change < 0 
                                    ? 'text-destructive' 
                                    : 'text-muted-foreground'
                              }`}>
                                {activity.balance_change > 0 ? '+' : ''}{activity.balance_change !== 0 ? `$${Math.abs(activity.balance_change).toFixed(2)}` : '—'}
                              </span>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                المبلغ: ${activity.amount.toFixed(2)}
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
