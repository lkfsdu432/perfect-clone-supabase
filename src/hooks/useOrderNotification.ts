import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const POLL_INTERVAL_MS = 6000;

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const soundEnabledRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const lastOrderIdRef = useRef<string | number | null>(null);
  const lastRechargeIdRef = useRef<string | number | null>(null);
  const lastOrderCountRef = useRef<number | null>(null);
  const lastRechargeCountRef = useRef<number | null>(null);

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
    async (type: "order" | "recharge", id: string | number | null) => {
      if (id === null || id === undefined) return;

      // Deduplicate per-table by id
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

  // Polling fallback (covers cases where realtime isn't enabled / isn't delivered for some tables)
  useEffect(() => {
    let alive = true;

    const fetchLatestAndCounts = async () => {
      const [oLatest, rLatest, oCount, rCount] = await Promise.all([
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
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase
          .from("recharge_requests")
          .select("id", { count: "exact", head: true }),
      ]);

      return {
        latestOrderId: (oLatest.data as any)?.id ?? null,
        latestRechargeId: (rLatest.data as any)?.id ?? null,
        orderCount: oCount.count ?? null,
        rechargeCount: rCount.count ?? null,
        orderCountError: oCount.error ?? null,
        rechargeCountError: rCount.error ?? null,
        latestOrderError: oLatest.error ?? null,
        latestRechargeError: rLatest.error ?? null,
      };
    };

    const initLastSeen = async () => {
      const snapshot = await fetchLatestAndCounts();
      if (!alive) return;

      lastOrderIdRef.current = snapshot.latestOrderId ?? lastOrderIdRef.current;
      lastRechargeIdRef.current = snapshot.latestRechargeId ?? lastRechargeIdRef.current;

      if (typeof snapshot.orderCount === "number") {
        lastOrderCountRef.current = snapshot.orderCount;
      }
      if (typeof snapshot.rechargeCount === "number") {
        lastRechargeCountRef.current = snapshot.rechargeCount;
      }
    };

    const poll = async () => {
      const snapshot = await fetchLatestAndCounts();
      if (!alive) return;

      // 1) Prefer ID-based detection (avoids duplicates)
      if (
        snapshot.latestOrderId !== null &&
        snapshot.latestOrderId !== lastOrderIdRef.current
      ) {
        void notifyOnce("order", snapshot.latestOrderId);
      }
      if (
        snapshot.latestRechargeId !== null &&
        snapshot.latestRechargeId !== lastRechargeIdRef.current
      ) {
        void notifyOnce("recharge", snapshot.latestRechargeId);
      }

      // 2) Count-based fallback detection (covers cases where latest row isn't visible)
      if (typeof snapshot.orderCount === "number") {
        const prev = lastOrderCountRef.current;
        if (typeof prev === "number" && snapshot.orderCount > prev) {
          // If ID-based didn't fire, still alert
          if (snapshot.latestOrderId === null || snapshot.latestOrderId === lastOrderIdRef.current) {
            setNewOrdersCount((p) => p + 1);
            void playNotificationSound();
          }
        }
        lastOrderCountRef.current = snapshot.orderCount;
      } else if (snapshot.orderCountError) {
        console.log("Orders count poll error:", snapshot.orderCountError);
      }

      if (typeof snapshot.rechargeCount === "number") {
        const prev = lastRechargeCountRef.current;
        if (typeof prev === "number" && snapshot.rechargeCount > prev) {
          if (snapshot.latestRechargeId === null || snapshot.latestRechargeId === lastRechargeIdRef.current) {
            setNewOrdersCount((p) => p + 1);
            void playNotificationSound();
          }
        }
        lastRechargeCountRef.current = snapshot.rechargeCount;
      } else if (snapshot.rechargeCountError) {
        console.log("Recharge count poll error:", snapshot.rechargeCountError);
      }

      if (snapshot.latestOrderError) {
        console.log("Orders latest poll error:", snapshot.latestOrderError);
      }
      if (snapshot.latestRechargeError) {
        console.log("Recharge latest poll error:", snapshot.latestRechargeError);
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
  }, [notifyOnce, playNotificationSound]);

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
