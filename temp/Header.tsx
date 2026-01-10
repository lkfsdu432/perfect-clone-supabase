import { useState, useEffect } from 'react';
import { RotateCcw, HelpCircle, Coins, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RechargeRequest, getSavedToken, saveToken } from '@/components/RechargeRequest';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeToken, setRechargeToken] = useState('');
  const [tokenData, setTokenData] = useState<{ id: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [savedToken, setSavedToken] = useState<string | null>(null);

  // تحميل التوكن المحفوظ عند فتح الـ dialog
  useEffect(() => {
    if (showRechargeDialog) {
      const token = getSavedToken();
      setSavedToken(token);
      if (token) {
        setRechargeToken(token);
      }
    }
  }, [showRechargeDialog]);

  const handleVerifyToken = async () => {
    if (!rechargeToken.trim()) {
      toast.error('ادخل التوكن');
      return;
    }
    setIsVerifying(true);
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('id')
        .eq('token', rechargeToken.trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('التوكن غير موجود');
        return;
      }
      setTokenData(data);
      // حفظ التوكن في localStorage
      saveToken(rechargeToken.trim());
    } catch (error) {
      toast.error('حدث خطأ');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCloseDialog = () => {
    setShowRechargeDialog(false);
    setRechargeToken('');
    setTokenData(null);
  };

  return (
    <>
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-xl md:text-3xl font-bold">
                <span className="text-primary">BOOM</span>
                <span className="text-foreground">PAY</span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                منصتك الموثوقة للخدمات الرقمية
              </p>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
              <Link to="/refund" className="nav-btn bg-secondary text-secondary-foreground hover:bg-muted flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                طلب استرداد
              </Link>
              <Link to="/faq" className="nav-btn bg-secondary text-secondary-foreground hover:bg-muted flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                الأسئلة
              </Link>
              <button
                onClick={() => setShowRechargeDialog(true)}
                className="nav-btn bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2"
              >
                <Coins className="w-4 h-4" />
                شراء توكن
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-border space-y-2">
              <Link
                to="/refund"
                onClick={() => setIsMenuOpen(false)}
                className="w-full nav-btn bg-secondary text-secondary-foreground hover:bg-muted flex items-center gap-2 justify-center py-3"
              >
                <RotateCcw className="w-4 h-4" />
                طلب استرداد
              </Link>
              <Link
                to="/faq"
                onClick={() => setIsMenuOpen(false)}
                className="w-full nav-btn bg-secondary text-secondary-foreground hover:bg-muted flex items-center gap-2 justify-center py-3"
              >
                <HelpCircle className="w-4 h-4" />
                الأسئلة
              </Link>
              <button
                onClick={() => { setIsMenuOpen(false); setShowRechargeDialog(true); }}
                className="w-full nav-btn bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 justify-center py-3"
              >
                <Coins className="w-4 h-4" />
                شراء توكن
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">شحن الرصيد</DialogTitle>
          </DialogHeader>

          {!tokenData ? (
            <div className="space-y-4">
              {/* إدخال التوكن */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={rechargeToken}
                  onChange={(e) => setRechargeToken(e.target.value)}
                  placeholder={savedToken ? savedToken : "التوكن (اتركه فارغ لو جديد)"}
                  className="flex-1"
                />
                {rechargeToken.trim() && (
                  <Button
                    onClick={handleVerifyToken}
                    disabled={isVerifying}
                    size="sm"
                  >
                    {isVerifying ? '...' : 'شحن'}
                  </Button>
                )}
              </div>

              {!rechargeToken.trim() && (
                <RechargeRequest
                  onTokenGenerated={(token) => {
                    console.log('New token:', token);
                  }}
                />
              )}
            </div>
          ) : (
            <RechargeRequest
              tokenId={tokenData.id}
              onSuccess={handleCloseDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
