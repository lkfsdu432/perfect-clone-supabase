import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Simple beep using Web Audio API - works everywhere
  const playBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
      
      // Second beep
      setTimeout(() => {
        try {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          
          osc2.frequency.value = 1000;
          osc2.type = "sine";
          
          gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          
          osc2.start(audioCtx.currentTime);
          osc2.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
          console.log("Second beep failed", e);
        }
      }, 150);
      
      return true;
    } catch (err) {
      console.log("Beep failed:", err);
      return false;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      playBeep();
    }
  }, [soundEnabled, playBeep]);

  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    // Play test beep immediately
    playBeep();
  }, [playBeep]);

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
    return playBeep();
  }, [playBeep]);

  useEffect(() => {
    const ordersChannel = supabase
      .channel("admin-orders-notification")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          setNewOrdersCount((prev) => prev + 1);
          playNotificationSound();
        }
      )
      .subscribe();

    const rechargeChannel = supabase
      .channel("admin-recharge-notification")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recharge_requests" },
        () => {
          setNewOrdersCount((prev) => prev + 1);
          playNotificationSound();
        }
      )
      .subscribe();

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
