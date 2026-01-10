import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio on first user interaction
  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 1;
    audioRef.current.load();
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.log("Could not play notification sound:", err);
      });
    }
  };

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
          playNotificationSound();
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
          playNotificationSound();
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
