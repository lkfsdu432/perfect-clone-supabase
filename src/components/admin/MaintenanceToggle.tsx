import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MaintenanceToggle = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching maintenance status:", error);
      }

      setIsMaintenanceMode(data?.value === "true");
    } catch (err) {
      console.error("Failed to fetch maintenance status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          key: "maintenance_mode",
          value: checked.toString(),
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });

      if (error) throw error;

      setIsMaintenanceMode(checked);
      toast({
        title: checked ? "تم تفعيل وضع الصيانة" : "تم إيقاف وضع الصيانة",
        description: checked 
          ? "الموقع الآن في وضع الصيانة ولن يتمكن الزوار من الوصول إليه"
          : "الموقع الآن متاح للجميع",
      });
    } catch (err) {
      console.error("Failed to update maintenance status:", err);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الصيانة",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-700 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-1/3" />
              <div className="h-3 bg-slate-700 rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border transition-colors ${isMaintenanceMode ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isMaintenanceMode ? 'bg-yellow-500/20' : 'bg-slate-700'}`}>
              <Construction className={`w-5 h-5 ${isMaintenanceMode ? 'text-yellow-500' : 'text-slate-400'}`} />
            </div>
            <div>
              <CardTitle className="text-lg text-white">وضع الصيانة</CardTitle>
              <CardDescription className="text-slate-400">
                عند التفعيل، سيتم عرض صفحة الصيانة للزوار
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={isMaintenanceMode}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-yellow-500"
          />
        </div>
      </CardHeader>
      
      {isMaintenanceMode && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-yellow-500 text-sm bg-yellow-500/10 p-3 rounded-lg">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>الموقع حالياً في وضع الصيانة - الزوار لا يمكنهم الوصول</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MaintenanceToggle;
