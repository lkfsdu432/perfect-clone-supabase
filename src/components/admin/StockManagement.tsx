import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, Plus, Trash2, Package, Loader2, Search, 
  Filter, Eye, EyeOff, Copy, RefreshCw, ChevronDown, ChevronUp 
} from 'lucide-react';

interface StockItem {
  id: string;
  product_option_id: string | null;
  content: string;
  is_sold: boolean;
  created_at: string;
}

interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  price: number;
  type: string | null;
}

interface Product {
  id: string;
  name: string;
}

const StockManagement = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState<string>('all');
  const [showSold, setShowSold] = useState(false);
  const [showContent, setShowContent] = useState<Record<string, boolean>>({});
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [newItems, setNewItems] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [showSold]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [stockRes, productsRes, optionsRes] = await Promise.all([
        supabase
          .from('stock_items')
          .select('*')
          .eq('is_sold', showSold)
          .order('created_at', { ascending: false }),
        supabase.from('products').select('id, name'),
        supabase.from('product_options').select('id, product_id, name, price, type')
      ]);

      if (stockRes.error) throw stockRes.error;
      if (productsRes.error) throw productsRes.error;
      if (optionsRes.error) throw optionsRes.error;

      setStockItems(stockRes.data || []);
      setProducts(productsRes.data || []);
      setProductOptions(optionsRes.data || []);
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!selectedOptionId || !newItems.trim()) {
      toast({ title: 'خطأ', description: 'اختر المنتج وأدخل البيانات', variant: 'destructive' });
      return;
    }

    setIsAdding(true);
    const items = newItems.split('\n').filter(item => item.trim());

    try {
      const stockToInsert = items.map(content => ({
        product_option_id: selectedOptionId,
        content: content.trim(),
        is_sold: false
      }));

      const { error } = await supabase.from('stock_items').insert(stockToInsert);

      if (error) throw error;

      toast({ title: 'تم', description: `تم إضافة ${items.length} عنصر للمخزون` });
      setShowAddModal(false);
      setNewItems('');
      setSelectedOptionId('');
      fetchData();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('stock_items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'تم', description: 'تم حذف العنصر' });
      setStockItems(prev => prev.filter(item => item.id !== id));
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteAllForOption = async (optionId: string) => {
    if (!confirm('هل أنت متأكد من حذف كل المخزون لهذا المنتج؟')) return;
    
    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('product_option_id', optionId)
        .eq('is_sold', showSold);
      
      if (error) throw error;
      toast({ title: 'تم', description: 'تم حذف كل المخزون' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'تم النسخ', description: 'تم نسخ المحتوى' });
  };

  const toggleContent = (id: string) => {
    setShowContent(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpand = (optionId: string) => {
    setExpandedOptions(prev => ({ ...prev, [optionId]: !prev[optionId] }));
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'غير معروف';
  };

  const getOptionName = (optionId: string) => {
    const option = productOptions.find(o => o.id === optionId);
    if (!option) return 'غير معروف';
    return `${getProductName(option.product_id)} - ${option.name}`;
  };

  // Filter auto-delivery options only
  const autoDeliveryOptions = productOptions.filter(o => o.type === 'auto');

  // Group stock by option
  const groupedStock = stockItems.reduce((acc, item) => {
    const optionId = item.product_option_id || 'unknown';
    if (!acc[optionId]) acc[optionId] = [];
    acc[optionId].push(item);
    return acc;
  }, {} as Record<string, StockItem[]>);

  // Filter by selected option
  const filteredGroups = filterOption === 'all' 
    ? groupedStock 
    : { [filterOption]: groupedStock[filterOption] || [] };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            إدارة المخزون
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            إجمالي: {stockItems.length} عنصر {showSold ? '(مباع)' : '(متاح)'}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
          <button
            onClick={() => setShowSold(!showSold)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              showSold ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
            }`}
          >
            {showSold ? 'عرض المتاح' : 'عرض المباع'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            إضافة مخزون
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث في المحتوى..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full pr-10"
          />
        </div>
        <select
          value={filterOption}
          onChange={(e) => setFilterOption(e.target.value)}
          className="input-field min-w-[200px]"
        >
          <option value="all">كل المنتجات</option>
          {autoDeliveryOptions.map(opt => (
            <option key={opt.id} value={opt.id}>
              {getProductName(opt.product_id)} - {opt.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stock Groups */}
      {Object.keys(filteredGroups).length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Database className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد مخزون</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredGroups).map(([optionId, items]) => {
            if (!items || items.length === 0) return null;
            
            const isExpanded = expandedOptions[optionId] ?? true;
            const filteredItems = searchQuery
              ? items.filter(item => item.content.toLowerCase().includes(searchQuery.toLowerCase()))
              : items;

            return (
              <div key={optionId} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Group Header */}
                <div 
                  className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer"
                  onClick={() => toggleExpand(optionId)}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{getOptionName(optionId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {filteredItems.length} عنصر
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAllForOption(optionId);
                      }}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                      title="حذف الكل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Items List */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {filteredItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-3 hover:bg-muted/20"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm truncate">
                            {showContent[item.id] ? item.content : '••••••••••••••••'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.created_at).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 mr-2">
                          <button
                            onClick={() => toggleContent(item.id)}
                            className="p-2 hover:bg-muted rounded-lg"
                            title={showContent[item.id] ? 'إخفاء' : 'إظهار'}
                          >
                            {showContent[item.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(item.content)}
                            className="p-2 hover:bg-muted rounded-lg"
                            title="نسخ"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">إضافة مخزون جديد</h2>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 hover:bg-muted rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اختر المنتج</label>
                <select
                  value={selectedOptionId}
                  onChange={(e) => setSelectedOptionId(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">اختر منتج...</option>
                  {autoDeliveryOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {getProductName(opt.product_id)} - {opt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  المحتوى (كل سطر = عنصر واحد)
                </label>
                <textarea
                  value={newItems}
                  onChange={(e) => setNewItems(e.target.value)}
                  className="input-field w-full h-48 font-mono text-sm"
                  placeholder="email1@example.com:password1&#10;email2@example.com:password2&#10;..."
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {newItems.split('\n').filter(l => l.trim()).length} عنصر سيتم إضافته
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-border">
              <button 
                onClick={() => setShowAddModal(false)} 
                className="flex-1 py-2.5 border border-border rounded-lg hover:bg-muted"
              >
                إلغاء
              </button>
              <button 
                onClick={handleAddStock} 
                disabled={isAdding}
                className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
