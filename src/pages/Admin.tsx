import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, Key, ShoppingBag, LogOut, Plus, Trash2, Edit2, Save, X,
  ChevronDown, ChevronUp, Settings, Copy, Eye, EyeOff, Clock, CheckCircle2,
  XCircle, Loader2, LayoutGrid, Zap, Database, Bell, BellOff, TrendingUp, DollarSign, Users, MessageCircle, Link, RotateCcw, Ban, Ticket, Shield, CreditCard, Wallet, Newspaper
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useOrderNotification from '@/hooks/useOrderNotification';
import OrderChat from '@/components/OrderChat';

import CouponManagement from '@/components/admin/CouponManagement';
import { RechargeManagement } from '@/components/admin/RechargeManagement';
import { PaymentMethodsManagement } from '@/components/admin/PaymentMethodsManagement';
import AdminUsersManagement from '@/components/admin/AdminUsersManagement';
import NewsManagement from '@/components/admin/NewsManagement';

// Types matching actual database schema
interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  price: number;
  original_price: number | null;
  is_active: boolean;
  display_order: number;
  requires_email: boolean;
  requires_password: boolean;
  requires_text_input: boolean;
  requires_verification_link: boolean;
  text_input_label: string | null;
  created_at: string;
  updated_at: string;
}

interface StockItem {
  id: string;
  product_id: string | null;
  product_option_id: string;
  content: string;
  is_sold: boolean;
}

interface Token {
  id: string;
  token: string;
  balance: number;
  is_blocked: boolean;
}

interface Order {
  id: string;
  order_number: string;
  token_id: string | null;
  product_id: string | null;
  product_option_id: string | null;
  amount: number;
  total_price: number;
  status: string;
  created_at: string;
  delivered_email: string | null;
  delivered_password: string | null;
  verification_link: string | null;
  text_input: string | null;
  response_message: string | null;
  stock_content: string | null;
}

interface RefundRequest {
  id: string;
  token_id: string;
  order_number: string;
  reason: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  admin_notes: string | null;
}

// Status options
const statusOptions = [
  { value: 'pending', label: 'قيد الانتظار', icon: Clock, color: 'text-warning' },
  { value: 'in_progress', label: 'قيد التنفيذ', icon: Loader2, color: 'text-info' },
  { value: 'completed', label: 'مكتمل', icon: CheckCircle2, color: 'text-success' },
  { value: 'rejected', label: 'مرفوض', icon: XCircle, color: 'text-destructive' },
  { value: 'cancelled', label: 'ملغي', icon: Ban, color: 'text-muted-foreground' },
];

// Helper to get delivery type label
const getDeliveryTypeLabel = (option: ProductOption) => {
  const isAuto = !option.requires_email && !option.requires_password && !option.requires_text_input && !option.requires_verification_link;
  if (isAuto) return 'استلام فوري';
  if (option.requires_email && option.requires_password) return 'إيميل وباسورد';
  if (option.requires_verification_link) return 'رابط';
  if (option.requires_text_input) return 'نص';
  if (option.requires_email) return 'إيميل';
  return 'يدوي';
};

// Order Card Component
const OrderCard = ({
  order,
  onUpdateStatus,
  onDelete,
  onRequestNewLink,
  products,
  productOptions
}: {
  order: Order;
  onUpdateStatus: (id: string, status: string, message?: string) => void;
  onDelete: (id: string) => void;
  onRequestNewLink: (orderId: string) => void;
  products: Product[];
  productOptions: ProductOption[];
}) => {
  const [message, setMessage] = useState(order.response_message || '');
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [showPassword, setShowPassword] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    onUpdateStatus(order.id, selectedStatus, message);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'تم النسخ', description: `تم نسخ ${label}` });
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const getProductName = () => {
    const product = products.find(p => p.id === order.product_id);
    const option = productOptions.find(o => o.id === order.product_option_id);
    if (product && option) return `${product.name} - ${option.name}`;
    return product?.name || option?.name || 'غير معروف';
  };

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
      <div className={`px-4 py-2 flex items-center justify-between ${
        order.status === 'pending' ? 'bg-warning/10' :
        order.status === 'in_progress' ? 'bg-info/10' :
        order.status === 'completed' ? 'bg-success/10' :
        order.status === 'cancelled' ? 'bg-muted/50' :
        'bg-destructive/10'
      }`}>
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusInfo.color} ${order.status === 'in_progress' ? 'animate-spin' : ''}`} />
          <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString('ar-EG')} - {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Package className="w-4 h-4 text-primary" />
            <span>{getProductName()}</span>
          </div>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-mono">
            طلب #{order.order_number}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-bold text-primary">${order.total_price || order.amount}</span>

          {order.verification_link && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">الرابط:</span>
              <span className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">{order.verification_link}</span>
              <button
                onClick={() => copyToClipboard(order.verification_link!, 'الرابط')}
                className="p-1 hover:bg-muted rounded"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {order.text_input && (
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
            <span className="text-sm text-muted-foreground">النص:</span>
            <span className="text-sm">{order.text_input}</span>
            <button onClick={() => copyToClipboard(order.text_input!, 'النص')} className="p-1 hover:bg-background rounded">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {order.delivered_email && (
            <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-lg">
              <span className="text-sm">{order.delivered_email}</span>
              <button onClick={() => copyToClipboard(order.delivered_email!, 'الإيميل')} className="p-1 hover:bg-background rounded">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}

          {order.delivered_password && (
            <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-lg">
              <span className="text-sm font-mono">{showPassword ? order.delivered_password : '••••••••'}</span>
              <button onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-background rounded">
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button onClick={() => copyToClipboard(order.delivered_password!, 'الباسورد')} className="p-1 hover:bg-background rounded">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {order.stock_content && (
          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
            <p className="text-xs text-success mb-1">تم التسليم الفوري:</p>
            <p className="text-sm font-mono">{order.stock_content}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field text-sm py-2.5 min-w-[180px]"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input-field text-sm py-2.5 flex-1"
            placeholder="رسالة للعميل (اختياري)..."
          />

          <div className="flex gap-2">
            <button onClick={handleSubmit} className="btn-primary px-4 py-2.5 flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span>حفظ</span>
            </button>
            {order.status === 'in_progress' && (
              <button
                onClick={() => setShowChat(!showChat)}
                className={`p-2.5 border rounded-lg transition-colors ${
                  showChat ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => onDelete(order.id)} className="p-2.5 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showChat && (
          <div className="pt-4 border-t border-border">
            <OrderChat orderId={order.id} senderType="admin" />
          </div>
        )}
      </div>
    </div>
  );
};

// Refund Card Component
const RefundCard = ({
  refund,
  orderInfo,
  tokenValue,
  onApprove,
  onReject
}: {
  refund: RefundRequest;
  orderInfo: Order | undefined;
  tokenValue: string;
  onApprove: (refund: RefundRequest, adminNote: string, refundAmount: number) => void;
  onReject: (refundId: string, adminNote: string) => void;
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [refundAmount, setRefundAmount] = useState(orderInfo?.total_price?.toString() || orderInfo?.amount?.toString() || '0');

  const handleReject = () => {
    onReject(refund.id, rejectNote);
    setShowRejectForm(false);
    setRejectNote('');
  };

  const handleApprove = () => {
    const amount = parseFloat(refundAmount) || 0;
    if (amount <= 0) return;
    onApprove(refund, approveNote, amount);
    setShowApproveForm(false);
    setApproveNote('');
  };

  return (
    <div className={`bg-card rounded-xl border overflow-hidden ${
      refund.status === 'pending' ? 'border-warning' :
      refund.status === 'approved' ? 'border-success' : 'border-destructive'
    }`}>
      <div className={`px-4 py-2 flex items-center justify-between ${
        refund.status === 'pending' ? 'bg-warning/10' :
        refund.status === 'approved' ? 'bg-success/10' : 'bg-destructive/10'
      }`}>
        <div className="flex items-center gap-2">
          {refund.status === 'pending' ? (
            <Clock className="w-4 h-4 text-warning" />
          ) : refund.status === 'approved' ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <XCircle className="w-4 h-4 text-destructive" />
          )}
          <span className={`text-sm font-semibold ${
            refund.status === 'pending' ? 'text-warning' :
            refund.status === 'approved' ? 'text-success' : 'text-destructive'
          }`}>
            {refund.status === 'pending' ? 'قيد المراجعة' :
             refund.status === 'approved' ? 'تم الاسترداد' : 'مرفوض'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(refund.created_at).toLocaleDateString('ar-EG')}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono bg-muted px-2 py-0.5 rounded">{tokenValue || '---'}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
              #{refund.order_number}
            </span>
          </div>
          {orderInfo && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-bold text-primary">${orderInfo.total_price || orderInfo.amount}</span>
            </div>
          )}
        </div>

        {refund.reason && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">سبب الاسترداد:</p>
            <p className="text-sm">{refund.reason}</p>
          </div>
        )}

        {refund.admin_notes && (
          <div className={`p-3 rounded-lg border ${
            refund.status === 'rejected' ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'
          }`}>
            <p className="text-sm">{refund.admin_notes}</p>
          </div>
        )}

        {refund.status === 'pending' && !showRejectForm && !showApproveForm && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowApproveForm(true)}
              className="flex-1 py-2 bg-success text-success-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              قبول
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              رفض
            </button>
          </div>
        )}

        {showApproveForm && (
          <div className="pt-2 space-y-3 border-t border-border">
            <div>
              <label className="text-sm font-medium mb-2 block">مبلغ الاسترداد</label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="input-field w-full"
                min="0"
              />
            </div>
            <textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              className="input-field w-full h-16"
              placeholder="ملاحظة (اختياري)..."
            />
            <div className="flex gap-2">
              <button onClick={handleApprove} className="flex-1 py-2 bg-success text-success-foreground rounded-lg">
                استرداد ${refundAmount || '0'}
              </button>
              <button onClick={() => setShowApproveForm(false)} className="px-4 py-2 bg-muted rounded-lg">
                إلغاء
              </button>
            </div>
          </div>
        )}

        {showRejectForm && (
          <div className="pt-2 space-y-3 border-t border-border">
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="input-field w-full h-16"
              placeholder="سبب الرفض..."
            />
            <div className="flex gap-2">
              <button onClick={handleReject} className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg">
                تأكيد الرفض
              </button>
              <button onClick={() => setShowRejectForm(false)} className="px-4 py-2 bg-muted rounded-lg">
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard = ({
  product,
  options,
  stockCount,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddOption,
  onEditOption,
  onDeleteOption,
  getOptionStockCount,
}: {
  product: Product;
  options: ProductOption[];
  stockCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddOption: () => void;
  onEditOption: (option: ProductOption) => void;
  onDeleteOption: (id: string) => void;
  getOptionStockCount: (optionId: string) => number;
}) => {
  const activeOptions = options.filter(o => o.is_active);
  const hasAutoDelivery = options.some(o => !o.requires_email && !o.requires_password && !o.requires_text_input && !o.requires_verification_link);

  return (
    <div className={`bg-card rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${!product.is_active ? 'opacity-60' : ''} border-border`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg truncate">{product.name}</h3>
              {!product.is_active && (
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-md text-xs">معطل</span>
              )}
              {hasAutoDelivery && (
                <span className="bg-success/20 text-success px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" /> فوري
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              {product.category && (
                <span className="bg-secondary px-2 py-0.5 rounded-md">{product.category}</span>
              )}
              <span className="flex items-center gap-1 text-primary">
                <Settings className="w-3 h-3" /> {activeOptions.length} منتجات
              </span>
              {hasAutoDelivery && stockCount > 0 && (
                <span className="flex items-center gap-1 text-success">
                  <Database className="w-3 h-3" /> مخزون: {stockCount}
                </span>
              )}
            </div>
            {product.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{product.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleExpand}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <button onClick={onEdit} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border bg-muted/30">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                المنتجات ({options.length})
              </h4>
              <button
                onClick={onAddOption}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
              >
                <Plus className="w-4 h-4" /> إضافة منتج
              </button>
            </div>

            {options.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد منتجات</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {options.map((option) => {
                  const isAuto = !option.requires_email && !option.requires_password && !option.requires_text_input && !option.requires_verification_link;
                  return (
                    <div key={option.id} className={`bg-card p-3 rounded-lg border flex items-center justify-between gap-3 ${!option.is_active ? 'opacity-50 border-muted' : 'border-border'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{option.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="bg-secondary px-2 py-0.5 rounded">
                            {getDeliveryTypeLabel(option)}
                          </span>
                          <span className="text-primary font-medium">${option.price}</span>
                          {option.original_price && option.original_price > option.price && (
                            <span className="line-through text-muted-foreground">${option.original_price}</span>
                          )}
                          {isAuto && (
                            <span className="flex items-center gap-1 text-success">
                              <Database className="w-3 h-3" /> مخزون: {getOptionStockCount(option.id)}
                            </span>
                          )}
                          {!option.is_active && (
                            <span className="text-destructive">معطل</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onEditOption(option)} className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeleteOption(option.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface UserPermissions {
  can_manage_orders: boolean;
  can_manage_products: boolean;
  can_manage_tokens: boolean;
  can_manage_refunds: boolean;
  can_manage_stock: boolean;
  can_manage_coupons: boolean;
  can_manage_users: boolean;
  can_manage_recharges: boolean;
  can_manage_payment_methods: boolean;
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState<string>('orders');
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // Editing states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  const [currentStockOptionId, setCurrentStockOptionId] = useState<string | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({ name: '', description: '', category: '', is_active: true });
  const [optionForm, setOptionForm] = useState({ 
    name: '', 
    price: 0, 
    original_price: 0,
    requires_email: false, 
    requires_password: false, 
    requires_text_input: false,
    requires_verification_link: false,
    text_input_label: '',
    is_active: true 
  });
  const [tokenForm, setTokenForm] = useState({ token: '', balance: 0 });
  const [newStockItems, setNewStockItems] = useState('');

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [refundStatusFilter, setRefundStatusFilter] = useState<string>('all');
  const [tokenSearch, setTokenSearch] = useState<string>('');

  // Stats
  const [todayStats, setTodayStats] = useState({ totalEarnings: 0, totalOrders: 0, completedOrders: 0 });

  const { newOrdersCount } = useOrderNotification();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && userPermissions) {
      fetchData();
    }
  }, [activeTab, isLoading, userPermissions]);

  useEffect(() => {
    if (newOrdersCount > 0 && notificationsEnabled && activeTab === 'orders') {
      fetchData();
    }
  }, [newOrdersCount]);

  const checkAuth = async () => {
    const sessionStr = localStorage.getItem('admin_session');
    
    if (!sessionStr) {
      navigate('/admin/login');
      return;
    }

    try {
      const adminData = JSON.parse(sessionStr);
      
      if (!adminData?.id) {
        localStorage.removeItem('admin_session');
        navigate('/admin/login');
        return;
      }

      const permissions = adminData.permissions || {};
      const perms: UserPermissions = {
        can_manage_orders: permissions.can_manage_orders || permissions.is_super_admin || false,
        can_manage_products: permissions.can_manage_products || permissions.is_super_admin || false,
        can_manage_tokens: permissions.can_manage_tokens || permissions.is_super_admin || false,
        can_manage_refunds: permissions.can_manage_refunds || permissions.is_super_admin || false,
        can_manage_stock: permissions.can_manage_stock || permissions.is_super_admin || false,
        can_manage_coupons: permissions.can_manage_coupons || permissions.is_super_admin || false,
        can_manage_users: permissions.can_manage_users || permissions.is_super_admin || false,
        can_manage_recharges: permissions.can_manage_recharges || permissions.is_super_admin || false,
        can_manage_payment_methods: permissions.can_manage_payment_methods || permissions.is_super_admin || false,
      };
      
      setUserPermissions(perms);

      if (perms.can_manage_orders) setActiveTab('orders');
      else if (perms.can_manage_products) setActiveTab('products');
      else if (perms.can_manage_tokens) setActiveTab('tokens');
      
      setIsLoading(false);
    } catch {
      localStorage.removeItem('admin_session');
      navigate('/admin/login');
    }
  };

  const fetchData = async () => {
    try {
      if (activeTab === 'products' && userPermissions?.can_manage_products) {
        const [productsRes, optionsRes, stockRes] = await Promise.all([
          supabase.from('products').select('*').order('display_order', { ascending: true }),
          supabase.from('product_options').select('*').order('display_order', { ascending: true }),
          supabase.from('stock_items').select('*').eq('is_sold', false)
        ]);
        setProducts(productsRes.data || []);
        setProductOptions(optionsRes.data || []);
        setStockItems(stockRes.data || []);
      } else if (activeTab === 'orders' && userPermissions?.can_manage_orders) {
        const [ordersRes, productsRes, optionsRes] = await Promise.all([
          supabase.from('orders').select('*').order('created_at', { ascending: false }),
          supabase.from('products').select('*'),
          supabase.from('product_options').select('*')
        ]);
        setOrders(ordersRes.data || []);
        setProducts(productsRes.data || []);
        setProductOptions(optionsRes.data || []);
        
        // Stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = (ordersRes.data || []).filter(o => new Date(o.created_at) >= today);
        setTodayStats({
          totalOrders: todayOrders.length,
          completedOrders: todayOrders.filter(o => o.status === 'completed').length,
          totalEarnings: todayOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total_price || o.amount || 0), 0)
        });
      } else if (activeTab === 'tokens' && userPermissions?.can_manage_tokens) {
        const { data } = await supabase.from('tokens').select('*').order('created_at', { ascending: false });
        setTokens(data || []);
      } else if (activeTab === 'refunds' && userPermissions?.can_manage_refunds) {
        const [refundsRes, ordersRes, tokensRes] = await Promise.all([
          supabase.from('refund_requests').select('*').order('created_at', { ascending: false }),
          supabase.from('orders').select('*'),
          supabase.from('tokens').select('*')
        ]);
        setRefundRequests(refundsRes.data || []);
        setOrders(ordersRes.data || []);
        setTokens(tokensRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Product handlers
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        category: product.category || '',
        is_active: product.is_active
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', description: '', category: '', is_active: true });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم القسم', variant: 'destructive' });
      return;
    }

    const productData = {
      name: productForm.name.trim(),
      description: productForm.description.trim() || null,
      category: productForm.category.trim() || null,
      is_active: productForm.is_active
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث القسم بنجاح' });
      }
    } else {
      const { error } = await supabase.from('products').insert(productData);
      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم إضافة القسم بنجاح' });
      }
    }

    setShowProductModal(false);
    fetchData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
    if (error) {
      // Try hard delete if soft delete fails
      const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
      if (deleteError) {
        toast({ title: 'خطأ', description: 'تم تعطيل القسم بدلاً من حذفه', variant: 'default' });
      } else {
        toast({ title: 'تم', description: 'تم حذف القسم' });
      }
    } else {
      toast({ title: 'تم', description: 'تم تعطيل القسم' });
    }
    fetchData();
  };

  // Option handlers
  const openOptionModal = (productId: string, option?: ProductOption) => {
    setCurrentProductId(productId);
    if (option) {
      setEditingOption(option);
      setOptionForm({
        name: option.name,
        price: option.price,
        original_price: option.original_price || 0,
        requires_email: option.requires_email,
        requires_password: option.requires_password,
        requires_text_input: option.requires_text_input,
        requires_verification_link: option.requires_verification_link,
        text_input_label: option.text_input_label || '',
        is_active: option.is_active
      });
    } else {
      setEditingOption(null);
      setOptionForm({
        name: '',
        price: 0,
        original_price: 0,
        requires_email: false,
        requires_password: false,
        requires_text_input: false,
        requires_verification_link: false,
        text_input_label: '',
        is_active: true
      });
    }
    setShowOptionModal(true);
  };

  const handleSaveOption = async () => {
    if (!optionForm.name.trim() || !currentProductId) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المنتج', variant: 'destructive' });
      return;
    }

    const optionData = {
      product_id: currentProductId,
      name: optionForm.name.trim(),
      price: optionForm.price || 0,
      original_price: optionForm.original_price || null,
      requires_email: optionForm.requires_email,
      requires_password: optionForm.requires_password,
      requires_text_input: optionForm.requires_text_input,
      requires_verification_link: optionForm.requires_verification_link,
      text_input_label: optionForm.text_input_label.trim() || null,
      is_active: optionForm.is_active
    };

    if (editingOption) {
      const { error } = await supabase
        .from('product_options')
        .update(optionData)
        .eq('id', editingOption.id);

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث المنتج بنجاح' });
      }
    } else {
      const { error } = await supabase.from('product_options').insert(optionData);
      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم إضافة المنتج بنجاح' });
      }
    }

    setShowOptionModal(false);
    fetchData();
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm('هل أنت متأكد؟')) return;
    
    const { error } = await supabase.from('product_options').update({ is_active: false }).eq('id', id);
    if (error) {
      const { error: deleteError } = await supabase.from('product_options').delete().eq('id', id);
      if (deleteError) {
        toast({ title: 'خطأ', description: deleteError.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم حذف المنتج' });
      }
    } else {
      toast({ title: 'تم', description: 'تم تعطيل المنتج' });
    }
    fetchData();
  };

  // Token handlers
  const openTokenModal = (token?: Token) => {
    if (token) {
      setEditingToken(token);
      setTokenForm({ token: token.token, balance: token.balance });
    } else {
      setEditingToken(null);
      setTokenForm({ token: '', balance: 0 });
    }
    setShowTokenModal(true);
  };

  const handleSaveToken = async () => {
    if (!tokenForm.token.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال التوكن', variant: 'destructive' });
      return;
    }

    if (editingToken) {
      const { error } = await supabase
        .from('tokens')
        .update({ token: tokenForm.token, balance: tokenForm.balance })
        .eq('id', editingToken.id);

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث التوكن' });
      }
    } else {
      const { error } = await supabase.from('tokens').insert({
        token: tokenForm.token,
        balance: tokenForm.balance
      });

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم إضافة التوكن' });
      }
    }

    setShowTokenModal(false);
    fetchData();
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm('هل أنت متأكد؟')) return;
    const { error } = await supabase.from('tokens').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف التوكن' });
      fetchData();
    }
  };

  const handleToggleBlockToken = async (token: Token) => {
    const { error } = await supabase
      .from('tokens')
      .update({ is_blocked: !token.is_blocked })
      .eq('id', token.id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: token.is_blocked ? 'تم فك حظر التوكن' : 'تم حظر التوكن' });
      fetchData();
    }
  };

  // Order handlers
  const handleUpdateOrderStatus = async (id: string, status: string, message?: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status, response_message: message || null })
      .eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم تحديث حالة الطلب' });
      fetchData();
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف الطلب' });
      fetchData();
    }
  };

  const handleRequestNewLink = async (orderId: string) => {
    const { error } = await supabase.from('order_messages').insert({
      order_id: orderId,
      sender_type: 'admin',
      message: '⚠️ الرابط المرسل غير صحيح أو منتهي الصلاحية. يرجى إرسال رابط جديد.'
    });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم إرسال طلب رابط جديد' });
    }
  };

  // Refund handlers
  const handleApproveRefund = async (refund: RefundRequest, adminNote: string, refundAmount: number) => {
    const { data: tokenData } = await supabase
      .from('tokens')
      .select('balance')
      .eq('id', refund.token_id)
      .single();

    if (!tokenData) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على التوكن', variant: 'destructive' });
      return;
    }

    const newBalance = Number(tokenData.balance) + refundAmount;
    
    const { error: balanceError } = await supabase
      .from('tokens')
      .update({ balance: newBalance })
      .eq('id', refund.token_id);

    if (balanceError) {
      toast({ title: 'خطأ', description: balanceError.message, variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('refund_requests')
      .update({ status: 'approved', processed_at: new Date().toISOString(), admin_notes: adminNote || null })
      .eq('id', refund.id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: `تم استرداد $${refundAmount}` });
      fetchData();
    }
  };

  const handleRejectRefund = async (refundId: string, adminNote: string) => {
    const { error } = await supabase
      .from('refund_requests')
      .update({ status: 'rejected', processed_at: new Date().toISOString(), admin_notes: adminNote || null })
      .eq('id', refundId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم رفض طلب الاسترداد' });
      fetchData();
    }
  };

  // Stock handlers
  const openStockModal = (optionId: string) => {
    setCurrentStockOptionId(optionId);
    setNewStockItems('');
    setShowStockModal(true);
  };

  const handleAddStock = async () => {
    if (!newStockItems.trim() || !currentStockOptionId) return;

    const items = newStockItems.split('\n').filter(item => item.trim());
    if (items.length === 0) return;

    const stockToInsert = items.map(content => ({
      product_option_id: currentStockOptionId,
      content: content.trim(),
      is_sold: false
    }));

    const { error } = await supabase.from('stock_items').insert(stockToInsert);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: `تم إضافة ${items.length} عنصر للمخزون` });
      setShowStockModal(false);
      fetchData();
    }
  };

  const getOptionStockCount = (optionId: string) => {
    return stockItems.filter(s => s.product_option_id === optionId && !s.is_sold).length;
  };

  const getProductStockCount = (productId: string) => {
    const productOptionIds = productOptions.filter(o => o.product_id === productId).map(o => o.id);
    return stockItems.filter(s => productOptionIds.includes(s.product_option_id) && !s.is_sold).length;
  };

  // Filtered data
  const filteredOrders = orderStatusFilter === 'all' ? orders : orders.filter(o => o.status === orderStatusFilter);
  const filteredRefunds = refundStatusFilter === 'all' ? refundRequests : refundRequests.filter(r => r.status === refundStatusFilter);
  const filteredTokens = tokens.filter(t => t.token.toLowerCase().includes(tokenSearch.toLowerCase()));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: 'orders', label: 'الطلبات', icon: ShoppingBag, permission: 'can_manage_orders' },
    { id: 'recharges', label: 'طلبات الشحن', icon: CreditCard, permission: 'can_manage_recharges' },
    { id: 'products', label: 'الأقسام', icon: Package, permission: 'can_manage_products' },
    { id: 'tokens', label: 'التوكنات', icon: Key, permission: 'can_manage_tokens' },
    { id: 'refunds', label: 'الاستردادات', icon: RotateCcw, permission: 'can_manage_refunds' },
    { id: 'payment_methods', label: 'طرق الدفع', icon: Wallet, permission: 'can_manage_payment_methods' },
    { id: 'coupons', label: 'الكوبونات', icon: Ticket, permission: 'can_manage_coupons' },
    { id: 'news', label: 'الأخبار', icon: Newspaper, permission: 'can_manage_products' },
    { id: 'admin_users', label: 'المدراء', icon: Users, permission: 'can_manage_users' },
  ].filter(tab => userPermissions?.[tab.permission as keyof UserPermissions]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">لوحة التحكم</h1>
                <p className="text-xs text-muted-foreground">إدارة المنتجات والطلبات</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  notificationsEnabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                }`}
              >
                {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/admin/login');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        {activeTab === 'orders' && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                أرباح اليوم
              </div>
              <p className="text-2xl font-bold text-primary">${todayStats.totalEarnings}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <ShoppingBag className="w-4 h-4" />
                طلبات اليوم
              </div>
              <p className="text-2xl font-bold">{todayStats.totalOrders}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" />
                مكتملة
              </div>
              <p className="text-2xl font-bold text-success">{todayStats.completedOrders}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-card hover:bg-muted border border-border'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOrderStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  orderStatusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                الكل ({orders.length})
              </button>
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setOrderStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    orderStatusFilter === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {opt.label} ({orders.filter(o => o.status === opt.value).length})
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={handleUpdateOrderStatus}
                    onDelete={handleDeleteOrder}
                    onRequestNewLink={handleRequestNewLink}
                    products={products}
                    productOptions={productOptions}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => openProductModal()} className="btn-primary px-4 py-2 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة قسم
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد أقسام</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    options={productOptions.filter(o => o.product_id === product.id)}
                    stockCount={getProductStockCount(product.id)}
                    isExpanded={expandedProduct === product.id}
                    onToggleExpand={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                    onEdit={() => openProductModal(product)}
                    onDelete={() => handleDeleteProduct(product.id)}
                    onAddOption={() => openOptionModal(product.id)}
                    onEditOption={(opt) => openOptionModal(product.id, opt)}
                    onDeleteOption={handleDeleteOption}
                    getOptionStockCount={getOptionStockCount}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="بحث بالتوكن..."
                  value={tokenSearch}
                  onChange={(e) => setTokenSearch(e.target.value)}
                  className="input-field w-full pr-10"
                />
                <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              <button onClick={() => openTokenModal()} className="btn-primary px-4 py-2 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة توكن
              </button>
            </div>

            {filteredTokens.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Key className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">{tokenSearch ? 'لا توجد نتائج' : 'لا توجد توكنات'}</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredTokens.map(token => (
                  <div key={token.id} className={`bg-card rounded-xl border p-4 ${token.is_blocked ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Key className={`w-4 h-4 ${token.is_blocked ? 'text-destructive' : 'text-primary'}`} />
                        <span className="font-mono text-sm truncate max-w-[150px]">{token.token}</span>
                        {token.is_blocked && <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-md">محظور</span>}
                      </div>
                      <span className={`text-lg font-bold ${token.is_blocked ? 'text-muted-foreground' : 'text-primary'}`}>${token.balance}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openTokenModal(token)} className="flex-1 py-2 bg-muted rounded-lg text-sm">تعديل</button>
                      <button
                        onClick={() => handleToggleBlockToken(token)}
                        className={`px-3 py-2 border rounded-lg ${token.is_blocked ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}`}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteToken(token.id)} className="px-3 py-2 border border-destructive/30 text-destructive rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Refunds Tab */}
        {activeTab === 'refunds' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'approved', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setRefundStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    refundStatusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {status === 'all' ? 'الكل' : status === 'pending' ? 'قيد المراجعة' : status === 'approved' ? 'مقبول' : 'مرفوض'}
                  ({status === 'all' ? refundRequests.length : refundRequests.filter(r => r.status === status).length})
                </button>
              ))}
            </div>

            {filteredRefunds.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <RotateCcw className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد طلبات استرداد</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredRefunds.map(refund => {
                  const orderInfo = orders.find(o => o.order_number === refund.order_number);
                  const tokenInfo = tokens.find(t => t.id === refund.token_id);
                  return (
                    <RefundCard
                      key={refund.id}
                      refund={refund}
                      orderInfo={orderInfo}
                      tokenValue={tokenInfo?.token || ''}
                      onApprove={handleApproveRefund}
                      onReject={handleRejectRefund}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === 'coupons' && <CouponManagement />}
        {activeTab === 'recharges' && <RechargeManagement />}
        {activeTab === 'payment_methods' && <PaymentMethodsManagement />}
        {activeTab === 'admin_users' && <AdminUsersManagement />}
        {activeTab === 'news' && <NewsManagement />}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold">{editingProduct ? 'تعديل القسم' : 'إضافة قسم جديد'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">اسم القسم *</label>
                <input
                  type="text"
                  placeholder="مثال: حسابات جيميل"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">الوصف</label>
                <input
                  type="text"
                  placeholder="وصف مختصر..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">التصنيف</label>
                <input
                  type="text"
                  placeholder="مثال: حسابات"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">نشط</span>
                <button
                  type="button"
                  onClick={() => setProductForm({ ...productForm, is_active: !productForm.is_active })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${productForm.is_active ? 'bg-success' : 'bg-muted-foreground/30'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${productForm.is_active ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button onClick={handleSaveProduct} className="btn-primary flex-1 py-3">حفظ</button>
              <button onClick={() => setShowProductModal(false)} className="px-6 py-3 border border-border rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {showOptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl my-8">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold">{editingOption ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium mb-2 block">اسم المنتج *</label>
                <input
                  type="text"
                  placeholder="مثال: جيميل جديد"
                  value={optionForm.name}
                  onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">السعر ($) *</label>
                  <input
                    type="number"
                    value={optionForm.price}
                    onChange={(e) => setOptionForm({ ...optionForm, price: parseFloat(e.target.value) || 0 })}
                    className="input-field w-full"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">السعر الأصلي (اختياري)</label>
                  <input
                    type="number"
                    value={optionForm.original_price}
                    onChange={(e) => setOptionForm({ ...optionForm, original_price: parseFloat(e.target.value) || 0 })}
                    className="input-field w-full"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">البيانات المطلوبة من العميل</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optionForm.requires_email}
                      onChange={(e) => setOptionForm({ ...optionForm, requires_email: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">إيميل</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optionForm.requires_password}
                      onChange={(e) => setOptionForm({ ...optionForm, requires_password: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">باسورد</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optionForm.requires_verification_link}
                      onChange={(e) => setOptionForm({ ...optionForm, requires_verification_link: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">رابط</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optionForm.requires_text_input}
                      onChange={(e) => setOptionForm({ ...optionForm, requires_text_input: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">نص</span>
                  </label>
                </div>
                {optionForm.requires_text_input && (
                  <input
                    type="text"
                    placeholder="عنوان حقل النص (مثال: اسم المستخدم)"
                    value={optionForm.text_input_label}
                    onChange={(e) => setOptionForm({ ...optionForm, text_input_label: e.target.value })}
                    className="input-field w-full mt-2"
                  />
                )}
              </div>

              {!optionForm.requires_email && !optionForm.requires_password && !optionForm.requires_text_input && !optionForm.requires_verification_link && (
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm text-success flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    استلام فوري من المخزون
                  </p>
                  {editingOption && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionModal(false);
                        openStockModal(editingOption.id);
                      }}
                      className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Database className="w-3 h-3" /> إدارة المخزون ({getOptionStockCount(editingOption.id)})
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">نشط</span>
                <button
                  type="button"
                  onClick={() => setOptionForm({ ...optionForm, is_active: !optionForm.is_active })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${optionForm.is_active ? 'bg-success' : 'bg-muted-foreground/30'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${optionForm.is_active ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button onClick={handleSaveOption} className="btn-primary flex-1 py-3">حفظ</button>
              <button onClick={() => setShowOptionModal(false)} className="px-6 py-3 border border-border rounded-lg">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">{editingToken ? 'تعديل التوكن' : 'إضافة توكن'}</h2>
              <button onClick={() => setShowTokenModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">التوكن</label>
                <input
                  type="text"
                  value={tokenForm.token}
                  onChange={(e) => setTokenForm({ ...tokenForm, token: e.target.value })}
                  className="input-field w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الرصيد</label>
                <input
                  type="number"
                  value={tokenForm.balance}
                  onChange={(e) => setTokenForm({ ...tokenForm, balance: Number(e.target.value) })}
                  className="input-field w-full"
                  min={0}
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-border">
              <button onClick={() => setShowTokenModal(false)} className="flex-1 py-2.5 border border-border rounded-lg">إلغاء</button>
              <button onClick={handleSaveToken} className="btn-primary flex-1 py-2.5">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">إضافة للمخزون</h2>
              <button onClick={() => setShowStockModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">المحتوى (كل سطر = عنصر)</label>
                <textarea
                  value={newStockItems}
                  onChange={(e) => setNewStockItems(e.target.value)}
                  className="input-field w-full h-40 font-mono text-sm"
                  placeholder="email1@example.com:password1&#10;email2@example.com:password2"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {newStockItems.split('\n').filter(l => l.trim()).length} عنصر
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t border-border">
              <button onClick={() => setShowStockModal(false)} className="flex-1 py-2.5 border border-border rounded-lg">إلغاء</button>
              <button onClick={handleAddStock} className="btn-primary flex-1 py-2.5">إضافة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
