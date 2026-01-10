import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 1;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.log("Could not play notification sound:", err);
      });
    }
  }, [soundEnabled]);

  // Enable sound after user interaction
  const enableSound = useCallback(() => {
    if (audioRef.current) {
      // Play a silent sound to unlock audio
      audioRef.current.volume = 0.1;
      audioRef.current.play().then(() => {
        audioRef.current!.pause();
        audioRef.current!.currentTime = 0;
        audioRef.current!.volume = 1;
        setSoundEnabled(true);
      }).catch(() => {
        // Still enable for next attempt
        setSoundEnabled(true);
      });
    } else {
      setSoundEnabled(true);
    }
  }, []);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
  }, []);

  const toggleSound = useCallback(() => {
    if (soundEnabled) {
      disableSound();
    } else {
      enableSound();
    }
  }, [soundEnabled, enableSound, disableSound]);

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
  }, [playNotificationSound]);

  const clearNotifications = () => {
    setNewOrdersCount(0);
  };

  return { 
    newOrdersCount, 
    clearNotifications, 
    soundEnabled, 
    toggleSound, 
    enableSound, 
    disableSound 
  };
};

export default useOrderNotification;
