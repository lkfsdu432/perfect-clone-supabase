import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    // Subscribe to new orders
    const channel = supabase
      .channel("new-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        () => {
          setNewOrdersCount((prev) => prev + 1);
          // Play notification sound
          try {
            const audio = new Audio("/notification.mp3");
            audio.play().catch(() => {});
          } catch {}
        }
      )
      .subscribe();

    // Also subscribe to recharge requests
    const rechargeChannel = supabase
      .channel("new-recharge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "recharge_requests",
        },
        () => {
          setNewOrdersCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(rechargeChannel);
    };
  }, []);

  const clearNotifications = () => {
    setNewOrdersCount(0);
  };

  return { newOrdersCount, clearNotifications };
};

export default useOrderNotification;
