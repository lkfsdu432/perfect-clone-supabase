import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(soundEnabled);

  // Keep ref in sync
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Nice iPhone-style notification sound
  const playNotificationBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      
      const playTone = (freq: number, start: number, dur: number, vol: number = 0.3) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.value = freq;
        osc.type = "triangle"; // Softer sound
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(vol, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        
        osc.start(start);
        osc.stop(start + dur);
      };

      const now = audioCtx.currentTime;
      
      // Pleasant 3-note chime like iPhone
      playTone(1396.91, now, 0.12, 0.25);       // F6
      playTone(1760.00, now + 0.1, 0.12, 0.3);  // A6  
      playTone(2093.00, now + 0.2, 0.2, 0.25);  // C7
      
      return true;
    } catch (err) {
      console.log("Notification sound failed:", err);
      return false;
    }
  }, []);

  const playSound = useCallback(() => {
    if (soundEnabledRef.current) {
      playNotificationBeep();
    }
  }, [playNotificationBeep]);

  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    soundEnabledRef.current = true;
    playNotificationBeep();
  }, [playNotificationBeep]);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
    soundEnabledRef.current = false;
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
    // Subscribe to ALL changes on orders table
    const ordersChannel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "orders" 
        },
        () => {
          setNewOrdersCount((prev) => prev + 1);
          if (soundEnabledRef.current) {
            playNotificationBeep();
          }
        }
      )
      .subscribe();

    // Subscribe to ALL changes on recharge_requests table
    const rechargeChannel = supabase
      .channel("realtime-recharge")
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "recharge_requests" 
        },
        () => {
          setNewOrdersCount((prev) => prev + 1);
          if (soundEnabledRef.current) {
            playNotificationBeep();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(rechargeChannel);
    };
  }, [playNotificationBeep]);

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
    playSound,
  };
};

export default useOrderNotification;
