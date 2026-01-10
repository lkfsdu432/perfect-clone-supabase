import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const POLL_INTERVAL_MS = 6000;

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const soundEnabledRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const lastOrderIdRef = useRef<string | null>(null);
  const lastRechargeIdRef = useRef<string | null>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Prepare mp3 audio
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

      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur);
      };

      const now = ctx.currentTime;
      playTone(880, now, 0.12);
      playTone(660, now + 0.12, 0.18);

      // cleanup
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 600);

      return true;
    } catch (err) {
      console.log("Beep fallback failed:", err);
      return false;
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

  const playNotificationSound = useCallback(async () => {
    if (!soundEnabledRef.current) return;

    const ok = await tryPlayMp3();
    if (!ok) playBeepFallback();
  }, [tryPlayMp3, playBeepFallback]);

  // Must be called from a user click
  const enableSound = useCallback(async () => {
    setSoundEnabled(true);
    soundEnabledRef.current = true;

    // Unlock audio with a user gesture
    const ok = await tryPlayMp3();
    if (ok) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    } else {
      playBeepFallback();
    }
  }, [tryPlayMp3, playBeepFallback]);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
    soundEnabledRef.current = false;
  }, []);

  const toggleSound = useCallback(async () => {
    if (soundEnabledRef.current) {
      disableSound();
      return;
    }
    await enableSound();
  }, [enableSound, disableSound]);

  const testSound = useCallback(async () => {
    // test without requiring notifications to be enabled
    const ok = await tryPlayMp3();
    if (ok) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      return true;
    }
    return playBeepFallback();
  }, [tryPlayMp3, playBeepFallback]);

  const notifyOnce = useCallback(
    async (type: "order" | "recharge", id: string | null) => {
      if (!id) return;

      if (type === "order") {
        if (lastOrderIdRef.current === id) return;
        lastOrderIdRef.current = id;
      } else {
        if (lastRechargeIdRef.current === id) return;
        lastRechargeIdRef.current = id;
      }

      setNewOrdersCount((prev) => prev + 1);
      await playNotificationSound();
    },
    [playNotificationSound]
  );

  // Realtime subscriptions
  useEffect(() => {
    const ordersChannel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: any) => {
          const id = payload?.new?.id ?? null;
          void notifyOnce("order", id);
        }
      )
      .subscribe();

    const rechargeChannel = supabase
      .channel("realtime-recharge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recharge_requests" },
        (payload: any) => {
          const id = payload?.new?.id ?? null;
          void notifyOnce("recharge", id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(rechargeChannel);
    };
  }, [notifyOnce]);

  // Polling fallback (covers cases where realtime isn't enabled for some tables)
  useEffect(() => {
    let alive = true;

    const initLastSeen = async () => {
      const [o, r] = await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("recharge_requests")
          .select("id, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!alive) return;
      lastOrderIdRef.current = (o.data as any)?.id ?? lastOrderIdRef.current;
      lastRechargeIdRef.current = (r.data as any)?.id ?? lastRechargeIdRef.current;
    };

    const poll = async () => {
      const [o, r] = await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("recharge_requests")
          .select("id, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!alive) return;

      const latestOrderId = (o.data as any)?.id ?? null;
      const latestRechargeId = (r.data as any)?.id ?? null;

      // Only trigger on change
      if (latestOrderId && latestOrderId !== lastOrderIdRef.current) {
        void notifyOnce("order", latestOrderId);
      }
      if (latestRechargeId && latestRechargeId !== lastRechargeIdRef.current) {
        void notifyOnce("recharge", latestRechargeId);
      }
    };

    void initLastSeen();
    const interval = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [notifyOnce]);

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
