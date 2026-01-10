import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Nice notification sound using Web Audio API
  const playNotificationBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      
      // Create a nice "ding dong" notification sound
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        
        // Smooth fade in and out
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Play pleasant "ding-dong" melody
      const now = audioCtx.currentTime;
      playTone(880, now, 0.15);          // A5 - first ding
      playTone(1318.5, now + 0.15, 0.2); // E6 - higher dong
      playTone(1108.7, now + 0.35, 0.25); // C#6 - resolve
      
      return true;
    } catch (err) {
      console.log("Notification sound failed:", err);
      return false;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      console.log("Playing notification sound...");
      playNotificationBeep();
    }
  }, [soundEnabled, playNotificationBeep]);

  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    playNotificationBeep();
  }, [playNotificationBeep]);

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

  const testSound = useCallback(() => {
    return playNotificationBeep();
  }, [playNotificationBeep]);

  useEffect(() => {
    // Subscribe to new orders
    const ordersChannel = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          console.log("New order received:", payload);
          setNewOrdersCount((prev) => prev + 1);
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log("Orders channel status:", status);
      });

    // Subscribe to recharge requests  
    const rechargeChannel = supabase
      .channel("admin-new-recharge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recharge_requests" },
        (payload) => {
          console.log("New recharge request received:", payload);
          setNewOrdersCount((prev) => prev + 1);
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log("Recharge channel status:", status);
      });

    return () => {
      supabase.removeChannel(ordersChannel);
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
    disableSound,
    testSound,
  };
};

export default useOrderNotification;
