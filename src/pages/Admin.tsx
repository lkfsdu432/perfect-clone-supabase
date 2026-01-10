import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, Key, ShoppingBag, LogOut, Plus, Trash2, Edit2, Save, X,
  ChevronDown, ChevronUp, Settings, Copy, Eye, EyeOff, Clock, CheckCircle2,
  XCircle, Loader2, LayoutGrid, Zap, Database, Bell, BellOff, Volume2, VolumeX, TrendingUp, DollarSign, Users, MessageCircle, Link, RotateCcw, Ban, Ticket, Shield, CreditCard, Wallet, Newspaper
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useOrderNotification from '@/hooks/useOrderNotification';
import useAdminAuth from '@/hooks/useAdminAuth';
import OrderChat from '@/components/OrderChat';

import CouponManagement from '@/components/admin/CouponManagement';
import { RechargeManagement } from '@/components/admin/RechargeManagement';
import { PaymentMethodsManagement } from '@/components/admin/PaymentMethodsManagement';
import AdminUsersManagement from '@/components/admin/AdminUsersManagement';
import NewsManagement from '@/components/admin/NewsManagement';
import TokenActivityLog from '@/components/admin/TokenActivityLog';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  duration: string | null;
  available: number | null;
  instant_delivery?: boolean;
}

interface StockItem {
  id: string;
  product_id: string | null;
  product_option_id: string | null;
  content: string;
  is_sold: boolean;
}

interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  price: number;
  duration: string | null;
  available: number | null;
  type: string | null;
  description: string | null;
  estimated_time: string | null;
  is_active: boolean;
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
  total_price?: number;
  status: string;
  created_at: string;
  email: string | null;
  password: string | null;
  verification_link: string | null;
  response_message: string | null;
}

interface RefundRequest {
  id: string;
  token_id: string | null;
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
      {/* Status Header */}
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
        {/* Order Number & Product Name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Package className="w-4 h-4 text-primary" />
            <span>{getProductName()}</span>
          </div>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-mono">
            طلب #{order.order_number}
          </span>
        </div>

        {/* Amount & Verification Link */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-bold text-primary">${order.amount}</span>

          {order.verification_link && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">الرابط:</span>
              <span className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">{order.verification_link}</span>
              <button
                onClick={() => copyToClipboard(order.verification_link!, 'الرابط')}
                className="p-1 hover:bg-muted rounded"
                title="نسخ الرابط"
              >
                <Copy className="w-3 h-3" />
              </button>
              {order.status === 'in_progress' && (
                <button
                  onClick={() => onRequestNewLink(order.id)}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 bg-primary/10 px-2 py-1 rounded"
                  title="طلب رابط جديد من العميل"
                >
                  <Link className="w-3 h-3" />
                  طلب رابط جديد
                </button>
              )}
            </div>
          )}
        </div>

        {/* Email & Password */}
        <div className="flex flex-wrap items-center gap-3">
          {order.email && (
            <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-lg">
              <span className="text-sm">{order.email}</span>
              <button onClick={() => copyToClipboard(order.email!, 'الإيميل')} className="p-1 hover:bg-background rounded">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}

          {order.password && (
            <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-lg">
              <span className="text-sm font-mono">{showPassword ? order.password : '••••••••'}</span>
              <button onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-background rounded">
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button onClick={() => copyToClipboard(order.password!, 'الباسورد')} className="p-1 hover:bg-background rounded">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
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
                  showChat
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
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

        {/* Chat Section */}
        {showChat && order.status === 'in_progress' && (
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
  const [refundAmount, setRefundAmount] = useState(orderInfo?.amount?.toString() || '0');

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
      {/* Status Header */}
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
          {new Date(refund.created_at).toLocaleDateString('ar-EG')} - {new Date(refund.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Token & Order Info */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">التوكن:</span>
            <span className="font-mono bg-muted px-2 py-0.5 rounded">{tokenValue || '---'}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">رقم الطلب:</span>
            <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
              #{refund.order_number}
            </span>
          </div>
          {orderInfo && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">المبلغ:</span>
              <span className="font-bold text-primary">${orderInfo.amount}</span>
            </div>
          )}
        </div>

        {/* Reason */}
        {refund.reason && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">سبب الاسترداد:</p>
            <p className="text-sm">{refund.reason}</p>
          </div>
        )}

        {/* Admin Note */}
        {refund.admin_notes && (
          <div className={`p-3 rounded-lg border ${
            refund.status === 'rejected'
              ? 'bg-destructive/10 border-destructive/20'
              : 'bg-primary/10 border-primary/20'
          }`}>
            <p className={`text-xs mb-1 ${
              refund.status === 'rejected' ? 'text-destructive' : 'text-primary'
            }`}>
              {refund.status === 'rejected' ? 'سبب الرفض:' : 'ملاحظة:'}
            </p>
            <p className={`text-sm ${
              refund.status === 'rejected' ? 'text-destructive' : 'text-foreground'
            }`}>{refund.admin_notes}</p>
          </div>
        )}

        {/* Actions */}
        {refund.status === 'pending' && !showRejectForm && !showApproveForm && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowApproveForm(true)}
              className="flex-1 py-2 bg-success text-success-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              قبول الاسترداد
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              رفض
            </button>
          </div>
        )}

        {/* Approve Form */}
        {refund.status === 'pending' && showApproveForm && (
          <div className="pt-2 space-y-3 border-t border-border">
            <div>
              <label className="text-sm font-medium mb-2 block">مبلغ الاسترداد</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="input-field w-full pr-8"
                    min="0"
                    max={orderInfo?.amount || 0}
                    step="0.01"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRefundAmount(orderInfo?.amount?.toString() || '0')}
                  className="px-3 py-2 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  المبلغ كامل
                </button>
              </div>
              {orderInfo && (
                <p className="text-xs text-muted-foreground mt-1">
                  المبلغ الأصلي للطلب: ${orderInfo.amount}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">ملاحظة للعميل (اختياري)</label>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                className="input-field w-full h-20"
                placeholder="اكتب ملاحظة تظهر للعميل..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={!refundAmount || parseFloat(refundAmount) <= 0}
                className="flex-1 py-2 bg-success text-success-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                استرداد ${refundAmount || '0'}
              </button>
              <button
                onClick={() => { setShowApproveForm(false); setApproveNote(''); }}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Reject Form */}
        {refund.status === 'pending' && showRejectForm && (
          <div className="pt-2 space-y-3 border-t border-border">
            <div>
              <label className="text-sm font-medium mb-2 block">سبب الرفض (اختياري)</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="input-field w-full h-20"
                placeholder="اكتب سبب رفض طلب الاسترداد..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                تأكيد الرفض
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectNote(''); }}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {refund.processed_at && (
          <p className="text-xs text-muted-foreground">
            تم المعالجة: {new Date(refund.processed_at).toLocaleDateString('ar-EG')}
          </p>
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
  onManageStock,
  onManageOptionStock,
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
  onManageStock: () => void;
  onManageOptionStock: (optionId: string) => void;
  getOptionStockCount: (optionId: string) => number;
}) => {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg truncate">{product.name}</h3>
              {product.instant_delivery && (
                <span className="bg-success/20 text-success px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" /> استلام فوري
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              {product.price > 0 && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">${product.price}</span>
              )}
              {product.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {product.duration}
                </span>
              )}
              {product.instant_delivery ? (
                <span className="flex items-center gap-1 text-success">
                  <Database className="w-3 h-3" /> المخزون: {stockCount}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" /> متوفر: {product.available || 0}
                </span>
              )}
              <span className="flex items-center gap-1 text-primary">
                <Settings className="w-3 h-3" /> {options.length} خيارات
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {product.instant_delivery && (
              <button
                onClick={onManageStock}
                className="p-2 hover:bg-success/10 text-success rounded-lg transition-colors"
                title="إدارة المخزون"
              >
                <Database className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onToggleExpand}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="خيارات المنتج"
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

      {/* Options Section */}
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
                <p className="text-sm">لا توجد منتجات - اضغط على "إضافة منتج" لإنشاء منتج جديد</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {options.map((option) => (
                  <div key={option.id} className="bg-card p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{option.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="bg-secondary px-2 py-0.5 rounded">
                          {option.type === 'none' ? 'استلام فوري' : option.type === 'email_password' ? 'إيميل وباسورد' : option.type === 'link' ? 'رابط فقط' : option.type === 'text' ? 'نص' : 'استلام فوري'}
                        </span>
                        {option.price > 0 && (
                          <span className="text-primary font-medium">${option.price}</span>
                        )}
                        {option.estimated_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {option.estimated_time}
                          </span>
                        )}
                        {product.instant_delivery && (
                          <span className="flex items-center gap-1 text-success">
                            <Database className="w-3 h-3" /> مخزون: {getOptionStockCount(option.id)}
                          </span>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{option.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {product.instant_delivery && (
                        <button
                          onClick={() => onManageOptionStock(option.id)}
                          className="p-1.5 hover:bg-success/10 text-success rounded transition-colors"
                          title="إدارة مخزون هذا المنتج"
                        >
                          <Database className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => onEditOption(option)} className="p-1.5 hover:bg-muted rounded transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteOption(option.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
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
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'tokens' | 'orders' | 'refunds' | 'users' | 'coupons' | 'recharges' | 'payment_methods' | 'admin_users' | 'news' | 'token_log'>('orders');
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Editing states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({ name: '', price: 0, duration: '', available: 0, instant_delivery: false });
  const [optionForm, setOptionForm] = useState({ name: '', type: 'email_password', description: '', estimated_time: '', price: 0, duration: '', delivery_type: 'manual', is_active: true });
  const [tokenForm, setTokenForm] = useState({ token: '', balance: 0 });

  // New options to add with product
  const [newProductOptions, setNewProductOptions] = useState<Array<{ name: string; price: number; description: string; estimated_time: string; input_type: string; duration: string; delivery_type: string; stock_content: string }>>([]);

  // Stock items for instant delivery
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [newStockItems, setNewStockItems] = useState<string>('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [currentStockProductId, setCurrentStockProductId] = useState<string | null>(null);
  const [currentStockOptionId, setCurrentStockOptionId] = useState<string | null>(null);

  // Statistics state
  const [todayStats, setTodayStats] = useState({
    totalEarnings: 0,
    totalOrders: 0,
    totalRecharges: 0,
    completedOrders: 0
  });

  // Order filter state
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Refund filter state
  const [refundStatusFilter, setRefundStatusFilter] = useState<string>('all');

  // Token search state
  const [tokenSearch, setTokenSearch] = useState<string>('');

  // Use order notification hook
  const { newOrdersCount, clearNotifications, soundEnabled, toggleSound, testSound } = useOrderNotification();

  // Handle new order notifications
  useEffect(() => {
    if (newOrdersCount > 0 && notificationsEnabled) {
      // Refresh orders if on orders tab
      if (activeTab === 'orders') {
        supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          setOrders(data || []);
        });
      }
      // Refresh stats
      const fetchStats = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const { data: todayOrders } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', todayISO);

        const { data: todayRecharges } = await supabase
          .from('recharge_requests')
          .select('*')
          .gte('created_at', todayISO);

        if (todayOrders) {
          const earnings = todayOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
          const completed = todayOrders.filter(o => o.status === 'completed').length;
          setTodayStats({
            totalEarnings: earnings,
            totalOrders: todayOrders.length,
            totalRecharges: todayRecharges?.length || 0,
            completedOrders: completed
          });
        }
      };
      fetchStats();
    }
  }, [newOrdersCount, notificationsEnabled, activeTab]);

  // Fetch today's statistics
  const fetchTodayStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get today's orders
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', todayISO);

    if (todayOrders) {
      const totalEarnings = todayOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + Number(o.amount || o.total_price), 0);

      const completedOrders = todayOrders.filter(o => o.status === 'completed').length;
      const totalOrders = todayOrders.length;

      // Count recharges (orders with token_id)
      const totalRecharges = todayOrders.filter(o => o.token_id).length;

      setTodayStats({
        totalEarnings,
        totalOrders,
        totalRecharges,
        completedOrders
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchData();
      fetchTodayStats();
    }
  }, [activeTab, isLoading]);

  // Real-time subscriptions للتحديث التلقائي
  useEffect(() => {
    if (isLoading) return;

    // الاشتراك في تحديثات الطلبات
    const ordersChannel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Orders change:', payload);
        // تحديث الطلبات
        supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          setOrders(data || []);
        });
        // تحديث الإحصائيات
        fetchTodayStats();
      })
      .subscribe();

    // الاشتراك في تحديثات التوكنات
    const tokensChannel = supabase
      .channel('admin-tokens-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, (payload) => {
        console.log('Tokens change:', payload);
        supabase.from('tokens').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          setTokens(data || []);
        });
      })
      .subscribe();

    // الاشتراك في تحديثات طلبات الاسترداد
    const refundsChannel = supabase
      .channel('admin-refunds-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_requests' }, (payload) => {
        console.log('Refunds change:', payload);
        supabase.from('refund_requests').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          setRefundRequests(data || []);
        });
      })
      .subscribe();

    // الاشتراك في تحديثات طلبات الشحن
    const rechargeChannel = supabase
      .channel('admin-recharge-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recharge_requests' }, (payload) => {
        console.log('Recharge change:', payload);
        fetchTodayStats();
      })
      .subscribe();

    // الاشتراك في تحديثات المنتجات والمخزون
    const productsChannel = supabase
      .channel('admin-products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        supabase.from('products').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          setProducts(data || []);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_options' }, () => {
        supabase.from('product_options').select('*').then(({ data }) => {
          setProductOptions((data || []).map(opt => ({ ...opt, is_active: opt.is_active ?? true })));
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => {
        supabase.from('stock_items').select('*').eq('is_sold', false).then(({ data }) => {
          setStockItems(data || []);
        });
      })
      .subscribe();

    // تنظيف الاشتراكات عند إلغاء التحميل
    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(tokensChannel);
      supabase.removeChannel(refundsChannel);
      supabase.removeChannel(rechargeChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [isLoading]);

  const checkAuth = async () => {
    // استخدام Supabase Auth للتحقق
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/admin/login');
      return;
    }

    // التحقق من صلاحيات الأدمن
    const { data: adminData, error } = await supabase
      .from('admin_auth')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !adminData) {
      await supabase.auth.signOut();
      navigate('/admin/login');
      return;
    }

    setIsAdmin(true);
    setUserPermissions({
      can_manage_orders: adminData.can_manage_orders || adminData.is_super_admin,
      can_manage_products: adminData.can_manage_products || adminData.is_super_admin,
      can_manage_tokens: adminData.can_manage_tokens || adminData.is_super_admin,
      can_manage_refunds: adminData.can_manage_refunds || adminData.is_super_admin,
      can_manage_stock: adminData.can_manage_stock || adminData.is_super_admin,
      can_manage_coupons: adminData.can_manage_coupons || adminData.is_super_admin,
      can_manage_users: adminData.can_manage_users || adminData.is_super_admin,
    });
    
    // تحديد التاب الافتراضي
    if (adminData.can_manage_orders || adminData.is_super_admin) setActiveTab('orders');
    else if (adminData.can_manage_products) setActiveTab('products');
    else if (adminData.can_manage_tokens) setActiveTab('tokens');
    else if (adminData.can_manage_refunds) setActiveTab('refunds');
    else if (adminData.can_manage_coupons) setActiveTab('coupons');
    
    setIsLoading(false);
  };

  const fetchData = async () => {
    if (activeTab === 'products') {
      const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      const { data: optionsData } = await supabase.from('product_options').select('*');
      const { data: stockData } = await supabase.from('stock_items').select('*').eq('is_sold', false);
      setProducts(productsData || []);
      setProductOptions((optionsData || []).map(opt => ({ ...opt, is_active: opt.is_active ?? true })));
      setStockItems(stockData || []);
    } else if (activeTab === 'tokens') {
      const { data } = await supabase.from('tokens').select('*').order('created_at', { ascending: false });
      setTokens(data || []);
    } else if (activeTab === 'orders') {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      setOrders(data || []);
      // Also fetch products and options for display
      const { data: productsData } = await supabase.from('products').select('*');
      const { data: optionsData } = await supabase.from('product_options').select('*');
      setProducts(productsData || []);
      setProductOptions((optionsData || []).map(opt => ({ ...opt, is_active: opt.is_active ?? true })));
    } else if (activeTab === 'refunds') {
      const { data: refundsData } = await supabase.from('refund_requests').select('*').order('created_at', { ascending: false });
      const { data: ordersData } = await supabase.from('orders').select('*');
      const { data: tokensData } = await supabase.from('tokens').select('*');
      setRefundRequests(refundsData || []);
      setOrders(ordersData || []);
      setTokens(tokensData || []);
    }
  };

  // Product handlers
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        price: product.price,
        duration: product.duration || '',
        available: product.available || 0,
        instant_delivery: product.instant_delivery || false
      });
      setNewProductOptions([]);
      setNewStockItems('');
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', price: 0, duration: '', available: 0, instant_delivery: false });
      setNewProductOptions([]);
      setNewStockItems('');
    }
    setShowProductModal(true);
  };

  const addNewProductOption = () => {
    setNewProductOptions([...newProductOptions, { name: '', price: 0, description: '', estimated_time: '', input_type: 'none', duration: '', delivery_type: 'manual', stock_content: '' }]);
  };

  const updateNewProductOption = (index: number, field: string, value: string | number) => {
    const updated = [...newProductOptions];
    updated[index] = { ...updated[index], [field]: value };
    setNewProductOptions(updated);
  };

  const removeNewProductOption = (index: number) => {
    setNewProductOptions(newProductOptions.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async () => {
    if (!productForm.name) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المنتج', variant: 'destructive' });
      return;
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update({
          name: productForm.name,
          price: productForm.price,
          duration: productForm.duration || null,
          available: productForm.available,
          instant_delivery: productForm.instant_delivery
        })
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث المنتج بنجاح' });
      }
    } else {
      // Create product first
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: productForm.name,
          price: productForm.price,
          duration: productForm.duration || null,
          available: productForm.available,
          instant_delivery: productForm.instant_delivery
        })
        .select('id')
        .single();

      if (productError || !newProduct) {
        toast({ title: 'خطأ', description: productError?.message || 'فشل في إضافة المنتج', variant: 'destructive' });
        return;
      }

      // Add options if any
      if (newProductOptions.length > 0) {
        for (const opt of newProductOptions.filter(o => o.name.trim())) {
          // Insert the option
          const { data: insertedOption, error: optError } = await supabase.from('product_options').insert({
            product_id: newProduct.id,
            name: opt.name,
            type: opt.delivery_type === 'auto' ? 'none' : (opt.input_type || 'email_password'),
            description: opt.description || null,
            estimated_time: opt.estimated_time || null,
            price: opt.price || 0,
            duration: opt.duration || null
          }).select('id').single();

          if (optError || !insertedOption) {
            toast({ title: 'تحذير', description: 'فشل في إضافة بعض المنتجات', variant: 'destructive' });
            continue;
          }

          // If auto delivery, add stock items for this option
          if (opt.delivery_type === 'auto' && opt.stock_content.trim()) {
            const items = opt.stock_content.split('\n').filter(item => item.trim());
            if (items.length > 0) {
              const stockToInsert = items.map(content => ({
                product_option_id: insertedOption.id,
                content: content.trim(),
                is_sold: false
              }));
              await supabase.from('stock_items').insert(stockToInsert);
            }
          }
        }
      }

      toast({ title: 'تم', description: 'تم إضافة المنتج بنجاح' });
    }

    setShowProductModal(false);
    setNewProductOptions([]);
    fetchData();
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف المنتج' });
      fetchData();
    }
  };

  // Option handlers
  const openOptionModal = (productId: string, option?: ProductOption) => {
    setCurrentProductId(productId);
    if (option) {
      setEditingOption(option);
      const isAuto = option.type === 'none';
      setOptionForm({
        name: option.name,
        type: isAuto ? 'email_password' : (option.type || 'email_password'),
        description: option.description || '',
        estimated_time: option.estimated_time || '',
        price: option.price || 0,
        duration: option.duration || '',
        delivery_type: isAuto ? 'auto' : 'manual',
        is_active: option.is_active !== false
      });
    } else {
      setEditingOption(null);
      setOptionForm({ name: '', type: 'email_password', description: '', estimated_time: '', price: 0, duration: '', delivery_type: 'manual', is_active: true });
    }
    setShowOptionModal(true);
  };

  const handleSaveOption = async () => {
    if (!optionForm.name || !currentProductId) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم الخيار', variant: 'destructive' });
      return;
    }

    const typeToSave = optionForm.delivery_type === 'auto' ? 'none' : optionForm.type;

    if (editingOption) {
      const { error } = await supabase
        .from('product_options')
        .update({
          name: optionForm.name,
          type: typeToSave,
          description: optionForm.description || null,
          estimated_time: optionForm.estimated_time || null,
          price: optionForm.price || 0,
          duration: optionForm.duration || null,
          is_active: optionForm.is_active
        })
        .eq('id', editingOption.id);

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث المنتج بنجاح' });
      }
    } else {
      const { error } = await supabase.from('product_options').insert({
        product_id: currentProductId,
        name: optionForm.name,
        type: typeToSave,
        description: optionForm.description || null,
        estimated_time: optionForm.estimated_time || null,
        price: optionForm.price || 0,
        duration: optionForm.duration || null,
        is_active: optionForm.is_active
      });

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
    const { error } = await supabase.from('product_options').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف الخيار' });
      fetchData();
    }
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
    if (!tokenForm.token) {
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
        toast({ title: 'تم', description: 'تم تحديث التوكن بنجاح' });
      }
    } else {
      const { error } = await supabase.from('tokens').insert({
        token: tokenForm.token,
        balance: tokenForm.balance
      });

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم إضافة التوكن بنجاح' });
      }
    }

    setShowTokenModal(false);
    fetchData();
  };

  const handleDeleteToken = async (id: string) => {
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
      toast({
        title: 'تم',
        description: token.is_blocked ? 'تم فك حظر التوكن' : 'تم حظر التوكن'
      });
      fetchData();
    }
  };

  // Order handlers
  const handleUpdateOrderStatus = async (id: string, status: string, message?: string) => {
    // إذا كانت الحالة "مرفوض" أو "ملغي" - رد الفلوس للعميل أولاً
    if (status === 'rejected' || status === 'cancelled') {
      // جلب بيانات الطلب
      const order = orders.find(o => o.id === id);
      if (order && order.token_id) {
        // جلب رصيد التوكن الحالي
        const { data: tokenData } = await supabase
          .from('tokens')
          .select('balance')
          .eq('id', order.token_id)
          .single();

        if (tokenData) {
          const refundAmount = Number(order.amount) || Number(order.total_price) || 0;
          const newBalance = Number(tokenData.balance) + refundAmount;
          
          // تحديث رصيد التوكن
          const { error: balanceError } = await supabase
            .from('tokens')
            .update({ balance: newBalance })
            .eq('id', order.token_id);

          if (balanceError) {
            toast({ title: 'خطأ', description: 'فشل في رد الرصيد: ' + balanceError.message, variant: 'destructive' });
            return;
          }
          
          toast({ title: 'تم رد الرصيد', description: `تم إرجاع $${refundAmount} لرصيد العميل` });
        }
      }
    }

    const { error } = await supabase
      .from('orders')
      .update({ status, response_message: message || null })
      .eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم تحديث حالة الطلب' });
      fetchData();
      fetchTodayStats();
    }
  };

  const handleDeleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف الطلب' });
      fetchData();
      fetchTodayStats();
    }
  };

  const handleRequestNewLink = async (orderId: string) => {
    // Send a message to the customer requesting a new link
    const { error } = await supabase.from('order_messages').insert({
      order_id: orderId,
      sender_type: 'admin',
      message: '⚠️ الرابط المرسل غير صحيح أو منتهي الصلاحية. يرجى إرسال رابط جديد في الشات.'
    });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم إرسال طلب رابط جديد للعميل' });
    }
  };

  // Refund handlers
  const handleApproveRefund = async (refund: RefundRequest, adminNote: string, refundAmount: number) => {
    // Get the order info using order_number
    const { data: orderData } = await supabase
      .from('orders')
      .select('amount, token_id, total_price')
      .eq('order_number', refund.order_number)
      .maybeSingle();

    if (!orderData) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على الطلب', variant: 'destructive' });
      return;
    }

    const orderAmount = orderData.amount || orderData.total_price;

    // Validate refund amount
    if (refundAmount > Number(orderAmount)) {
      toast({ title: 'خطأ', description: 'مبلغ الاسترداد أكبر من مبلغ الطلب', variant: 'destructive' });
      return;
    }

    // Get the token using token_id from refund
    const { data: tokenData } = await supabase
      .from('tokens')
      .select('id, balance')
      .eq('id', refund.token_id)
      .maybeSingle();

    if (!tokenData) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على التوكن', variant: 'destructive' });
      return;
    }

    // Refund the specified amount to the token
    const newBalance = Number(tokenData.balance) + refundAmount;
    const { error: balanceError } = await supabase
      .from('tokens')
      .update({ balance: newBalance })
      .eq('id', tokenData.id);

    if (balanceError) {
      toast({ title: 'خطأ', description: balanceError.message, variant: 'destructive' });
      return;
    }

    // Update refund request status
    const { error: refundError } = await supabase
      .from('refund_requests')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        admin_notes: adminNote || null
      })
      .eq('id', refund.id);

    if (refundError) {
      toast({ title: 'خطأ', description: refundError.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'تم', description: `تم استرداد $${refundAmount} للتوكن` });
    fetchData();
  };

  const handleRejectRefund = async (refundId: string, adminNote: string) => {
    const { error } = await supabase
      .from('refund_requests')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
        admin_notes: adminNote || null
      })
      .eq('id', refundId);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم رفض طلب الاسترداد' });
      fetchData();
    }
  };

  // Stock handlers
  const openStockModal = (productId: string, optionId?: string) => {
    setCurrentStockProductId(productId);
    setCurrentStockOptionId(optionId || null);
    setNewStockItems('');
    setShowStockModal(true);
  };

  const handleAddStock = async () => {
    if (!newStockItems.trim() || !currentStockProductId) return;

    const items = newStockItems.split('\n').filter(item => item.trim());
    if (items.length === 0) return;

    const stockToInsert = items.map(content => ({
      product_option_id: currentStockOptionId || currentStockProductId,
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

  const getProductStockCount = (productId: string) => {
    return stockItems.filter(s => s.product_option_id === productId && !s.is_sold).length;
  };

  const getOptionStockCount = (optionId: string) => {
    return stockItems.filter(s => s.product_option_id === optionId && !s.is_sold).length;
  };

  // Filter orders
  const filteredOrders = orderStatusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === orderStatusFilter);

  // Filter refunds
  const filteredRefunds = refundStatusFilter === 'all'
    ? refundRequests
    : refundRequests.filter(r => r.status === refundStatusFilter);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
                  notificationsEnabled
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                title={notificationsEnabled ? 'إيقاف تحديث الإشعارات' : 'تفعيل تحديث الإشعارات'}
              >
                {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                <span className="hidden sm:inline">{notificationsEnabled ? 'الإشعارات' : 'موقوفة'}</span>
              </button>

              <button
                onClick={() => {
                  if (!soundEnabled) {
                    toggleSound();
                    toast({
                      title: "تم تفعيل الصوت 🔔",
                      description: "عند وصول طلب جديد أو طلب شحن هتسمع إشعار صوتي.",
                    });
                  } else {
                    toggleSound();
                    toast({ title: "تم إيقاف الصوت" });
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  soundEnabled
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                title={soundEnabled ? 'إيقاف صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <span className="hidden sm:inline">{soundEnabled ? 'الصوت مفعل' : 'الصوت مغلق'}</span>
              </button>

              <button
                onClick={async () => {
                  const success = await testSound();
                  toast({
                    title: success ? "تم تشغيل الصوت ✅" : "فشل تشغيل الصوت ❌",
                    description: success
                      ? "الصوت يعمل بشكل صحيح!"
                      : "تأكد من أن المتصفح يسمح بتشغيل الصوت وأن الجهاز ليس على كتم.",
                  });
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                title="اختبار الصوت"
              >
                <Zap className="w-5 h-5" />
                <span className="hidden sm:inline">اختبار</span>
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/admin/login');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Professional Tabs */}
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-1.5 mb-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {[
              { id: 'orders', label: 'الطلبات', icon: ShoppingBag, count: orders.length, permission: 'can_manage_orders' },
              { id: 'recharges', label: 'طلبات الشحن', icon: CreditCard, count: null, permission: 'can_manage_tokens' },
              { id: 'products', label: 'الأقسام', icon: Package, count: products.length, permission: 'can_manage_products' },
              { id: 'tokens', label: 'التوكنات', icon: Key, count: tokens.length, permission: 'can_manage_tokens' },
              { id: 'token_log', label: 'سجل التوكنات', icon: Database, count: null, permission: 'can_manage_tokens' },
              { id: 'refunds', label: 'الاستردادات', icon: RotateCcw, count: refundRequests.filter(r => r.status === 'pending').length, permission: 'can_manage_refunds' },
              { id: 'payment_methods', label: 'طرق الدفع', icon: Wallet, count: null, permission: 'can_manage_tokens' },
              { id: 'coupons', label: 'الكوبونات', icon: Ticket, count: null, permission: 'can_manage_coupons' },
              { id: 'news', label: 'الأخبار', icon: Newspaper, count: null, permission: 'can_manage_products' },
              { id: 'admin_users', label: 'مدراء النظام', icon: Users, count: null, permission: 'can_manage_users' },
            ].filter(tab => isAdmin || (userPermissions && userPermissions[tab.permission as keyof UserPermissions])).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'products' | 'tokens' | 'orders' | 'refunds' | 'users' | 'coupons' | 'recharges' | 'payment_methods' | 'admin_users' | 'news' | 'token_log')}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`min-w-5 h-5 flex items-center justify-center px-1.5 rounded-full text-xs font-bold ${
                      isActive 
                        ? 'bg-primary-foreground/20 text-primary-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-success mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">أرباح اليوم</span>
            </div>
            <span className="text-xl font-bold text-success">${todayStats.totalEarnings}</span>
          </div>
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs font-medium">الطلبات</span>
            </div>
            <span className="text-xl font-bold text-primary">{todayStats.totalOrders}</span>
          </div>
          <div className="bg-gradient-to-br from-info/10 to-info/5 border border-info/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-info mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">مكتملة</span>
            </div>
            <span className="text-xl font-bold text-info">{todayStats.completedOrders}</span>
          </div>
          <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-warning mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium">شحنات</span>
            </div>
            <span className="text-xl font-bold text-warning">{todayStats.totalRecharges}</span>
          </div>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOrderStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  orderStatusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                الكل ({orders.length})
              </button>
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setOrderStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    orderStatusFilter === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
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
              <button
                onClick={() => openProductModal()}
                className="btn-primary px-4 py-2 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة منتج
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد منتجات</p>
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
                    onManageStock={() => openStockModal(product.id)}
                    onManageOptionStock={(optId) => openStockModal(product.id, optId)}
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
              {/* Search Box */}
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
              <button
                onClick={() => openTokenModal()}
                className="btn-primary px-4 py-2 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة توكن
              </button>
            </div>

            {(() => {
              const filteredTokens = tokens.filter(t =>
                t.token.toLowerCase().includes(tokenSearch.toLowerCase())
              );

              return filteredTokens.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <Key className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {tokenSearch ? 'لا توجد نتائج للبحث' : 'لا توجد توكنات'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTokens.map(token => (
                    <div key={token.id} className={`bg-card rounded-xl border p-4 ${token.is_blocked ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Key className={`w-4 h-4 ${token.is_blocked ? 'text-destructive' : 'text-primary'}`} />
                          <span className="font-mono text-sm truncate max-w-[150px]">{token.token}</span>
                          {token.is_blocked && (
                            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-md">محظور</span>
                          )}
                        </div>
                        <span className={`text-lg font-bold ${token.is_blocked ? 'text-muted-foreground' : 'text-primary'}`}>${token.balance}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openTokenModal(token)}
                          className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleToggleBlockToken(token)}
                          className={`px-3 py-2 border rounded-lg transition-colors ${
                            token.is_blocked
                              ? 'border-success/30 text-success hover:bg-success/10'
                              : 'border-warning/30 text-warning hover:bg-warning/10'
                          }`}
                          title={token.is_blocked ? 'فك الحظر' : 'حظر التوكن'}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteToken(token.id)}
                          className="px-3 py-2 border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Refunds Tab */}
        {activeTab === 'refunds' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary" />
                طلبات الاسترداد
              </h2>
            </div>

            {/* Refund Status Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRefundStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  refundStatusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                الكل ({refundRequests.length})
              </button>
              <button
                onClick={() => setRefundStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  refundStatusFilter === 'pending' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                قيد المراجعة ({refundRequests.filter(r => r.status === 'pending').length})
              </button>
              <button
                onClick={() => setRefundStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  refundStatusFilter === 'approved' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                تم الاسترداد ({refundRequests.filter(r => r.status === 'approved').length})
              </button>
              <button
                onClick={() => setRefundStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  refundStatusFilter === 'rejected' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                مرفوض ({refundRequests.filter(r => r.status === 'rejected').length})
              </button>
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
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl my-8">
            {/* Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {editingProduct ? 'تعديل القسم' : 'إضافة قسم جديد'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">القسم يحتوي على المنتجات المتشابهة (مثل: حسابات جيميل)</p>
            </div>

            <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
              {/* Section 1: Basic Info */}
              <div className="bg-muted/20 rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
                  معلومات القسم
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">اسم القسم *</label>
                    <input
                      type="text"
                      placeholder="مثال: حسابات جيميل"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Add Products (Only for new product) */}
              {!editingProduct && (
                <div className="bg-muted/20 rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
                      المنتجات داخل القسم
                    </h3>
                    <button
                      type="button"
                      onClick={addNewProductOption}
                      className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة منتج
                    </button>
                  </div>

                  {newProductOptions.length === 0 ? (
                    <div className="text-center py-8 bg-background/50 rounded-lg border-2 border-dashed border-border">
                      <LayoutGrid className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">لا توجد منتجات</p>
                      <p className="text-xs text-muted-foreground mt-1">اضغط على "إضافة منتج" لإضافة خيارات للقسم</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {newProductOptions.map((opt, index) => (
                        <div key={index} className="bg-background rounded-lg p-4 border border-border shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-foreground flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">{index + 1}</span>
                              المنتج #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeNewProductOption(index)}
                              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Row 1: Name, Duration, Price */}
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">اسم المنتج *</label>
                              <input
                                type="text"
                                placeholder="مثال: نتفليكس برايم"
                                value={opt.name}
                                onChange={(e) => updateNewProductOption(index, 'name', e.target.value)}
                                className="input-field text-sm w-full"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">مدة الاشتراك</label>
                              <input
                                type="text"
                                placeholder="مثال: شهر واحد"
                                value={opt.duration}
                                onChange={(e) => updateNewProductOption(index, 'duration', e.target.value)}
                                className="input-field text-sm w-full"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">السعر ($) *</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={opt.price || ''}
                                onChange={(e) => updateNewProductOption(index, 'price', parseFloat(e.target.value) || 0)}
                                className="input-field text-sm w-full"
                              />
                            </div>
                          </div>

                          {/* Row 2: Delivery Type */}
                          <div className="mb-3">
                            <label className="text-xs text-muted-foreground mb-2 block">نوع التسليم</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => updateNewProductOption(index, 'delivery_type', 'manual')}
                                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  opt.delivery_type === 'manual'
                                    ? 'bg-warning/10 border-warning text-warning'
                                    : 'border-border hover:bg-muted'
                                }`}
                              >
                                <Clock className="w-4 h-4" />
                                يدوي (خدمات)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateNewProductOption(index, 'delivery_type', 'auto')}
                                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  opt.delivery_type === 'auto'
                                    ? 'bg-success/10 border-success text-success'
                                    : 'border-border hover:bg-muted'
                                }`}
                              >
                                <Zap className="w-4 h-4" />
                                تلقائي (اكونتات)
                              </button>
                            </div>
                          </div>

                          {/* Manual: Show input type required from customer */}
                          {opt.delivery_type === 'manual' && (
                            <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">البيانات المطلوبة من العميل</label>
                                <select
                                  value={opt.input_type}
                                  onChange={(e) => updateNewProductOption(index, 'input_type', e.target.value)}
                                  className="input-field text-sm w-full"
                                >
                                  <option value="email_password">إيميل وباسورد</option>
                                  <option value="link">رابط فقط</option>
                                  <option value="text">نص</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">الوقت المتوقع للتنفيذ</label>
                                <input
                                  type="text"
                                  placeholder="مثال: 24 ساعة"
                                  value={opt.estimated_time}
                                  onChange={(e) => updateNewProductOption(index, 'estimated_time', e.target.value)}
                                  className="input-field text-sm w-full"
                                />
                              </div>
                            </div>
                          )}

                          {/* Auto: Show stock content input */}
                          {opt.delivery_type === 'auto' && (
                            <div className="p-3 bg-success/5 rounded-lg border border-success/20 mb-3">
                              <label className="text-xs text-muted-foreground mb-1 block">
                                الداتا للعميل (كل سطر = منتج واحد)
                              </label>
                              <textarea
                                placeholder={`مثال:\nemail1@gmail.com:password123\nemail2@gmail.com:password456`}
                                value={opt.stock_content}
                                onChange={(e) => updateNewProductOption(index, 'stock_content', e.target.value)}
                                className="input-field text-sm w-full h-24 resize-none font-mono"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                المخزون الحالي: {opt.stock_content.split('\n').filter(line => line.trim()).length} منتج
                              </p>
                            </div>
                          )}

                          {/* Description */}
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">وصف (اختياري)</label>
                            <input
                              type="text"
                              placeholder="وصف مختصر للمنتج..."
                              value={opt.description}
                              onChange={(e) => updateNewProductOption(index, 'description', e.target.value)}
                              className="input-field w-full text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-muted/20 flex gap-3">
              <button onClick={handleSaveProduct} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-base">
                <Save className="w-5 h-5" />
                {editingProduct ? 'حفظ التغييرات' : 'إنشاء القسم'}
              </button>
              <button onClick={() => setShowProductModal(false)} className="px-8 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {showOptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold">{editingOption ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Row 1: Name, Duration, Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">اسم المنتج *</label>
                  <input
                    type="text"
                    placeholder="مثال: نتفليكس برايم"
                    value={optionForm.name}
                    onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">مدة الاشتراك</label>
                  <input
                    type="text"
                    placeholder="مثال: شهر واحد"
                    value={optionForm.duration}
                    onChange={(e) => setOptionForm({ ...optionForm, duration: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">السعر ($) *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={optionForm.price}
                    onChange={(e) => setOptionForm({ ...optionForm, price: parseFloat(e.target.value) || 0 })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Delivery Type */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">نوع التسليم</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOptionForm({ ...optionForm, delivery_type: 'manual', type: optionForm.type === 'none' ? 'email_password' : optionForm.type })}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      optionForm.delivery_type === 'manual'
                        ? 'bg-warning/10 border-warning text-warning'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    يدوي (خدمات)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionForm({ ...optionForm, delivery_type: 'auto' })}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      optionForm.delivery_type === 'auto'
                        ? 'bg-success/10 border-success text-success'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    تلقائي (اكونتات)
                  </button>
                </div>
              </div>

              {/* Manual: Show input type required from customer */}
              {optionForm.delivery_type === 'manual' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">البيانات المطلوبة من العميل</label>
                    <select
                      value={optionForm.type}
                      onChange={(e) => setOptionForm({ ...optionForm, type: e.target.value })}
                      className="input-field w-full"
                    >
                      <option value="email_password">إيميل وباسورد</option>
                      <option value="link">رابط فقط</option>
                      <option value="text">نص</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">الوقت المتوقع للتنفيذ</label>
                    <input
                      type="text"
                      placeholder="مثال: 24 ساعة"
                      value={optionForm.estimated_time}
                      onChange={(e) => setOptionForm({ ...optionForm, estimated_time: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                </div>
              )}

              {/* Auto: Show stock management */}
              {optionForm.delivery_type === 'auto' && (
                <div className="p-3 bg-success/5 rounded-lg border border-success/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-success font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        استلام فوري من المخزون
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        المخزون الحالي: {editingOption ? getOptionStockCount(editingOption.id) : 0} عنصر
                      </p>
                    </div>
                    {editingOption && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionModal(false);
                          openStockModal(currentProductId!, editingOption.id);
                        }}
                        className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                      >
                        <Database className="w-4 h-4" />
                        إدارة المخزون
                      </button>
                    )}
                  </div>
                  {!editingOption && (
                    <p className="text-xs text-muted-foreground">
                      يمكنك إضافة المخزون بعد حفظ المنتج من خلال زر "إدارة المخزون"
                    </p>
                  )}
                </div>
              )}

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">حالة الخدمة</p>
                  <p className="text-xs text-muted-foreground">
                    {optionForm.is_active ? 'نشط - العملاء يرون أنك متاح' : 'غير نشط - العملاء يرون أنك غير متاح'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOptionForm({ ...optionForm, is_active: !optionForm.is_active })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    optionForm.is_active ? 'bg-success' : 'bg-muted-foreground/30'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    optionForm.is_active ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">الوصف (اختياري)</label>
                <input
                  type="text"
                  placeholder="وصف مختصر للمنتج..."
                  value={optionForm.description}
                  onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                  className="input-field w-full"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button onClick={handleSaveOption} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {editingOption ? 'حفظ التغييرات' : 'إضافة المنتج'}
              </button>
              <button onClick={() => setShowOptionModal(false)} className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">{editingToken ? 'تعديل التوكن' : 'إضافة توكن جديد'}</h2>
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
                  placeholder="TOKEN123"
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
              <button onClick={() => setShowTokenModal(false)} className="flex-1 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors">
                إلغاء
              </button>
              <button onClick={handleSaveToken} className="btn-primary flex-1 py-2.5">
                حفظ
              </button>
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
                <label className="block text-sm font-medium mb-2">المحتوى (كل سطر = عنصر واحد)</label>
                <textarea
                  value={newStockItems}
                  onChange={(e) => setNewStockItems(e.target.value)}
                  className="input-field w-full h-40 font-mono text-sm"
                  placeholder="email1@example.com:password1&#10;email2@example.com:password2&#10;..."
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {newStockItems.split('\n').filter(l => l.trim()).length} عنصر
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t border-border">
              <button onClick={() => setShowStockModal(false)} className="flex-1 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors">
                إلغاء
              </button>
              <button onClick={handleAddStock} className="btn-primary flex-1 py-2.5">
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Coupons Tab */}
      {activeTab === 'coupons' && <CouponManagement />}

      {/* Recharges Tab */}
      {activeTab === 'recharges' && <RechargeManagement />}

      {/* Payment Methods Tab */}
      {activeTab === 'payment_methods' && <PaymentMethodsManagement />}

      {/* Admin Users Tab */}
      {activeTab === 'admin_users' && <AdminUsersManagement />}

      {/* News Tab */}
      {activeTab === 'news' && <NewsManagement />}

      {/* Token Activity Log Tab */}
      {activeTab === 'token_log' && <TokenActivityLog />}
    </div>
  );
};

export default Admin;
