import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchMaintenanceStatus();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("maintenance-mode")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
          filter: "key=eq.maintenance_mode"
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            setIsMaintenanceMode(payload.new.value === "true");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isMaintenanceMode, loading };
};
