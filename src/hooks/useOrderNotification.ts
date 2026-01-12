import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const POLL_INTERVAL_MS = 5000;

// ═══════════════════════════════════════════════════════════════════════════
// Sound generators – distinct melodies for each event type
// ═══════════════════════════════════════════════════════════════════════════

/** Order notification – ascending 3‑note chime (ding-ding-DING) */
const playOrderSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const play = (freq: number, start: number, dur: number, vol = 0.22) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    const t = ctx.currentTime;
    play(659.25, t, 0.12);       // E5
    play(783.99, t + 0.11, 0.12); // G5
    play(987.77, t + 0.22, 0.18); // B5
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch (e) {
    console.log("Order sound failed", e);
  }
};

/** Recharge notification – two‑tone cash register "ka-ching" */
const playRechargeSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const play = (freq: number, start: number, dur: number, vol = 0.25) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    const t = ctx.currentTime;
    play(1318.5, t, 0.08);         // E6
    play(1760.0, t + 0.07, 0.14);  // A6
    setTimeout(() => ctx.close().catch(() => {}), 400);
  } catch (e) {
    console.log("Recharge sound failed", e);
  }
};

/** Message notification – short single "pop" */
export const playChatSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1200;
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => ctx.close().catch(() => {}), 200);
  } catch (e) {
    console.log("Chat sound failed", e);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

const useOrderNotification = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const soundEnabledRef = useRef(false);

  // Use refs to track last seen IDs - prevents duplicate notifications
  const lastOrderIdRef = useRef<string | number | null>(null);
  const lastRechargeIdRef = useRef<string | number | null>(null);
  // Track if realtime already notified to prevent polling double-notify
  const realtimeNotifiedOrderRef = useRef<Set<string | number>>(new Set());
  const realtimeNotifiedRechargeRef = useRef<Set<string | number>>(new Set());

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // ─────────────────────────────────────────────────────────────────────────
  // Play helpers
  // ─────────────────────────────────────────────────────────────────────────

  const playOrder = useCallback(() => {
    if (soundEnabledRef.current) playOrderSound();
  }, []);

  const playRecharge = useCallback(() => {
    if (soundEnabledRef.current) playRechargeSound();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Enable / disable
  // ─────────────────────────────────────────────────────────────────────────

  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    soundEnabledRef.current = true;
    // play test sound on enable
    playOrderSound();
  }, []);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
    soundEnabledRef.current = false;
  }, []);

  const toggleSound = useCallback(() => {
    if (soundEnabledRef.current) {
      disableSound();
    } else {
      enableSound();
    }
  }, [enableSound, disableSound]);

  const testSound = useCallback(() => {
    playOrderSound();
    setTimeout(() => playRechargeSound(), 500);
    return true;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Notification logic
  // ─────────────────────────────────────────────────────────────────────────

  const notifyOrder = useCallback(
    (id: string | number | null, fromRealtime = false) => {
      if (id === null || id === undefined) return;
      if (lastOrderIdRef.current === id) return;
      // Check if realtime already notified this ID
      if (realtimeNotifiedOrderRef.current.has(id)) return;
      
      lastOrderIdRef.current = id;
      if (fromRealtime) {
        realtimeNotifiedOrderRef.current.add(id);
        // Clean up old entries after 30 seconds
        setTimeout(() => realtimeNotifiedOrderRef.current.delete(id), 30000);
      }
      setNewOrdersCount((p) => p + 1);
      playOrder();
    },
    [playOrder]
  );

  const notifyRecharge = useCallback(
    (id: string | number | null, fromRealtime = false) => {
      if (id === null || id === undefined) return;
      if (lastRechargeIdRef.current === id) return;
      // Check if realtime already notified this ID
      if (realtimeNotifiedRechargeRef.current.has(id)) return;
      
      lastRechargeIdRef.current = id;
      if (fromRealtime) {
        realtimeNotifiedRechargeRef.current.add(id);
        // Clean up old entries after 30 seconds
        setTimeout(() => realtimeNotifiedRechargeRef.current.delete(id), 30000);
      }
      setNewOrdersCount((p) => p + 1);
      playRecharge();
    },
    [playRecharge]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Realtime subscriptions
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const ordersChannel = supabase
      .channel("rt-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: any) => notifyOrder(payload?.new?.id ?? null, true)
      )
      .subscribe();

    const rechargeChannel = supabase
      .channel("rt-recharge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recharge_requests" },
        (payload: any) => notifyRecharge(payload?.new?.id ?? null, true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(rechargeChannel);
    };
  }, [notifyOrder, notifyRecharge]);

// ─────────────────────────────────────────────────────────────────────────
  // Polling fallback - only ID based to prevent double counting
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;

    const fetchLatestIds = async () => {
      const [oLatest, rLatest] = await Promise.all([
        supabase
          .from("orders")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("recharge_requests")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        latestOrderId: (oLatest.data as any)?.id ?? null,
        latestRechargeId: (rLatest.data as any)?.id ?? null,
      };
    };

    const init = async () => {
      const s = await fetchLatestIds();
      if (!alive) return;
      // Initialize refs without triggering notifications
      if (s.latestOrderId && !lastOrderIdRef.current) {
        lastOrderIdRef.current = s.latestOrderId;
      }
      if (s.latestRechargeId && !lastRechargeIdRef.current) {
        lastRechargeIdRef.current = s.latestRechargeId;
      }
    };

    const poll = async () => {
      const s = await fetchLatestIds();
      if (!alive) return;

      // Only ID-based check to prevent duplicate notifications
      if (s.latestOrderId && s.latestOrderId !== lastOrderIdRef.current) {
        notifyOrder(s.latestOrderId);
      }
      if (s.latestRechargeId && s.latestRechargeId !== lastRechargeIdRef.current) {
        notifyRecharge(s.latestRechargeId);
      }
    };

    void init();
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [notifyOrder, notifyRecharge]);

  // ─────────────────────────────────────────────────────────────────────────

  const clearNotifications = () => setNewOrdersCount(0);

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
