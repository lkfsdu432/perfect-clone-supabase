import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Prepare audio
  useEffect(() => {
    const audio = new Audio("/notification.mp3");
    audio.preload = "auto";
    audio.volume = 1;
    audioRef.current = audio;

    try {
      audio.load();
    } catch {
      // ignore
    }
  }, []);

  const playBeepFallback = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 880;

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);

      osc.onended = () => {
        ctx.close().catch(() => {});
      };
    } catch (err) {
      console.log("Beep fallback failed:", err);
    }
  }, []);

  const tryPlayMp3 = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    try {
      audio.currentTime = 0;
      await audio.play();
      return true;
    } catch (err) {
      console.log("Could not play notification mp3:", err);
      return false;
    }
  }, []);

  const testSound = useCallback(async () => {
    const ok = await tryPlayMp3();
    if (!ok) playBeepFallback();
  }, [tryPlayMp3, playBeepFallback]);

  // Must be called from a user click
  const enableSound = useCallback(async () => {
    setSoundEnabled(true);
    await testSound();
  }, [testSound]);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
  }, []);

  const toggleSound = useCallback(async () => {
    if (soundEnabled) {
      disableSound();
    } else {
      await enableSound();
    }
  }, [soundEnabled, enableSound, disableSound]);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    void testSound();
  }, [soundEnabled, testSound]);

  useEffect(() => {
    const ordersChannel = supabase
      .channel("new-orders")
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
      .channel("new-recharge")
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
