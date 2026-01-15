import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import FAQ from "./pages/FAQ";
import Refund from "./pages/Refund";
import Maintenance from "./pages/Maintenance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle maintenance mode check
const MaintenanceWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { isMaintenanceMode, loading } = useMaintenanceMode();

  // Allow access to admin routes even in maintenance mode
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show maintenance page for non-admin routes when maintenance mode is on
  if (isMaintenanceMode && !isAdminRoute) {
    return <Maintenance />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  // تتبع الزيارات
  useEffect(() => {
    const trackVisit = async () => {
      try {
        const { error } = await supabase.from("visits").insert({
          page: window.location.pathname,
          user_agent: navigator.userAgent
        });
        if (error) {
          console.error('Visit tracking error:', error);
        }
      } catch (err) {
        console.error('Visit tracking failed:', err);
      }
    };
    trackVisit();
  }, []);

  return (
    <MaintenanceWrapper>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/refund" element={<Refund />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MaintenanceWrapper>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
