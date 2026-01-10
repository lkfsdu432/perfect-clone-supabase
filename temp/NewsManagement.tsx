import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Save, X, Newspaper, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface News {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export const NewsManagement = () => {
  const [news, setNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل تحميل الأخبار', variant: 'destructive' });
    } else {
      setNews(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setForm({ title: '', content: '' });
    setEditingNews(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: News) => {
    setEditingNews(item);
    setForm({ title: item.title, content: item.content });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }

    setSaving(true);

    if (editingNews) {
      const { error } = await supabase
        .from('news')
        .update({ title: form.title, content: form.content })
        .eq('id', editingNews.id);

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث الخبر' });
        setShowModal(false);
        resetForm();
        fetchNews();
      }
    } else {
      const { error } = await supabase
        .from('news')
        .insert({ title: form.title, content: form.content });

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم إضافة الخبر' });
        setShowModal(false);
        resetForm();
        fetchNews();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;

    const { error } = await supabase.from('news').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف الخبر' });
      fetchNews();
    }
  };

  const toggleActive = async (item: News) => {
    const { error } = await supabase
      .from('news')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: item.is_active ? 'تم إخفاء الخبر' : 'تم إظهار الخبر' });
      fetchNews();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Newspaper className="w-5 h-5" />
          الأخبار ({news.length})
        </h2>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          إضافة خبر
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Newspaper className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>لا توجد أخبار</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {news.map((item) => (
            <div
              key={item.id}
              className={`bg-card rounded-xl border p-4 ${
                !item.is_active ? 'border-muted opacity-60' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{item.title}</h3>
                    {!item.is_active && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">مخفي</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(item.created_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(item)}
                    className={`p-2 rounded-lg transition-colors ${
                      item.is_active
                        ? 'text-primary hover:bg-primary/10'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={item.is_active ? 'إخفاء' : 'إظهار'}
                  >
                    {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-lg">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {editingNews ? 'تعديل الخبر' : 'إضافة خبر جديد'}
              </h3>
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
              <div>
                <label className="block text-sm font-medium mb-2">العنوان *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field w-full"
                  placeholder="عنوان الخبر"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المحتوى *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="input-field w-full h-24 resize-none"
                  placeholder="محتوى الخبر..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingNews ? (
                    <>
                      <Save className="w-4 h-4" />
                      حفظ التعديلات
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      إضافة
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsManagement;