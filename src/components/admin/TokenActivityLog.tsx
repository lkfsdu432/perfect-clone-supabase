import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, ShoppingBag, Wallet, RotateCcw, Clock, CheckCircle2, 
  XCircle, Loader2, ChevronDown, ChevronUp, History, DollarSign 
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

const TokenActivityLog = () => {
  const [tokens, setTokens] = useState<TokenWithActivities[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenWithActivities | null>(null);

  useEffect(() => {
    fetchTokensWithActivities();
  }, []);

  const fetchTokensWithActivities = async () => {
    setIsLoading(true);
    try {
      // Fetch all tokens
      const { data: tokensData, error: tokensError } = await supabase
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (tokensError) throw tokensError;

      // Fetch all orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch all recharge requests
      const { data: rechargesData } = await supabase
        .from('recharge_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch all refund requests
      const { data: refundsData } = await supabase
        .from('refund_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Process tokens with their activities
      const tokensWithActivities: TokenWithActivities[] = (tokensData || []).map((token: any) => {
        const tokenOrders = (ordersData || []).filter((o: any) => o.token_id === token.id);
        const tokenRecharges = (rechargesData || []).filter((r: any) => r.token_id === token.id);
        const tokenRefunds = (refundsData || []).filter((r: any) => r.token_id === token.id);

        // Build activities list
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

        // Sort by date
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
      case 'order': return 'bg-primary/10 text-primary border-primary/30';
      case 'recharge': return 'bg-success/10 text-success border-success/30';
      case 'refund': return 'bg-warning/10 text-warning border-warning/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredTokens = tokens.filter(token => 
    token.token.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ابحث بالتوكن..."
          className="input-field w-full pr-10"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{tokens.length}</p>
          <p className="text-xs text-muted-foreground">إجمالي التوكنات</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">
            ${tokens.reduce((sum, t) => sum + t.total_recharged, 0).toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">إجمالي الشحن</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-info">
            ${tokens.reduce((sum, t) => sum + t.total_spent, 0).toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-warning">
            ${tokens.reduce((sum, t) => sum + t.total_refunded, 0).toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">إجمالي الاستردادات</p>
        </div>
      </div>

      {/* Tokens List */}
      <div className="space-y-3">
        {filteredTokens.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد توكنات</p>
          </div>
        ) : (
          filteredTokens.map((token) => (
            <div
              key={token.id}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Token Header */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedToken(expandedToken === token.id ? null : token.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${token.is_blocked ? 'bg-destructive' : 'bg-success'}`} />
                    <span className="font-mono font-bold text-lg">{token.token}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-sm font-bold ${
                      token.balance > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      ${token.balance}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" />
                        {token.total_orders}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wallet className="w-4 h-4" />
                        {token.total_recharges}
                      </span>
                      <span className="flex items-center gap-1">
                        <RotateCcw className="w-4 h-4" />
                        {token.total_refunds}
                      </span>
                    </div>
                    {expandedToken === token.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Mini Stats */}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>شحن: <span className="text-success font-bold">${token.total_recharged}</span></span>
                  <span>مشتريات: <span className="text-info font-bold">${token.total_spent}</span></span>
                  <span>استرداد: <span className="text-warning font-bold">${token.total_refunded}</span></span>
                </div>
              </div>

              {/* Activities List */}
              {expandedToken === token.id && (
                <div className="border-t border-border">
                  {token.activities.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      لا توجد حركات لهذا التوكن
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {token.activities.map((activity, index) => (
                        <div
                          key={activity.id}
                          className={`px-4 py-3 flex items-center justify-between gap-4 ${
                            index !== token.activities.length - 1 ? 'border-b border-border/50' : ''
                          } hover:bg-muted/30 transition-colors`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${getTypeColor(activity.type)}`}>
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
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(activity.created_at).toLocaleDateString('ar-EG')} - {new Date(activity.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className={`font-bold text-sm ${
                              activity.balance_change > 0 
                                ? 'text-success' 
                                : activity.balance_change < 0 
                                  ? 'text-destructive' 
                                  : 'text-muted-foreground'
                            }`}>
                              {activity.balance_change > 0 ? '+' : ''}{activity.balance_change !== 0 ? `$${activity.balance_change}` : '-'}
                            </span>
                            <p className="text-xs text-muted-foreground">
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
          ))
        )}
      </div>
    </div>
  );
};

export default TokenActivityLog;
