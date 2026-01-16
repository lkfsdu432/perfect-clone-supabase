import { useState, useEffect } from 'react';
import { RotateCcw, HelpCircle, Coins, PlayCircle, Sparkles } from 'lucide-react';
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
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
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
      const { data, error } = await supabase.rpc('check_token_balance', { 
        token_input: rechargeToken.trim() 
      });

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
        <div className="container mx-auto px-3 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
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

            {/* Navigation - Always visible */}
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
              <Link 
                to="/refund" 
                className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-muted flex items-center gap-1 sm:gap-2 transition-colors"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">طلب</span> استرداد
              </Link>
              <Link 
                to="/faq" 
                className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-muted flex items-center gap-1 sm:gap-2 transition-colors"
              >
                <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                الأسئلة
              </Link>
              <button
                onClick={() => setShowRechargeDialog(true)}
                className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 flex items-center gap-1 sm:gap-2 transition-all shadow-lg shadow-primary/25 font-semibold"
              >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                شراء توكن
              </button>
            </div>
          </div>
          
          {/* زر كيفية شراء التوكن - ظاهر دائماً */}
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => setShowVideoDialog(true)}
              className="px-4 py-2 text-sm rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 flex items-center gap-2 transition-all shadow-lg shadow-amber-500/30 animate-pulse hover:animate-none font-semibold"
            >
              <PlayCircle className="w-4 h-4" />
              📺 كيفية شراء التوكن
            </button>
          </div>
        </div>
      </header>

      {/* Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
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

      {/* Video Tutorial Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg flex items-center justify-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              كيفية شراء التوكن
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-black/10">
              <iframe
                src="https://www.youtube.com/embed/bQw2G46h31Y"
                title="شرح طريقة شراء التوكن"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <a
              href="https://youtu.be/bQw2G46h31Y"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
            >
              <PlayCircle className="w-4 h-4" />
              شاهد الفيديو على يوتيوب
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;