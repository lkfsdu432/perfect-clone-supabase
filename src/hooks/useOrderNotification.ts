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

  const lastOrderIdRef = useRef<string | number | null>(null);
  const lastRechargeIdRef = useRef<string | number | null>(null);
  const lastOrderCountRef = useRef<number | null>(null);
  const lastRechargeCountRef = useRef<number | null>(null);

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
    (id: string | number | null) => {
      if (id === null || id === undefined) return;
      if (lastOrderIdRef.current === id) return;
      lastOrderIdRef.current = id;
      setNewOrdersCount((p) => p + 1);
      playOrder();
    },
    [playOrder]
  );

  const notifyRecharge = useCallback(
    (id: string | number | null) => {
      if (id === null || id === undefined) return;
      if (lastRechargeIdRef.current === id) return;
      lastRechargeIdRef.current = id;
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
        (payload: any) => notifyOrder(payload?.new?.id ?? null)
      )
      .subscribe();

    const rechargeChannel = supabase
      .channel("rt-recharge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recharge_requests" },
        (payload: any) => notifyRecharge(payload?.new?.id ?? null)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(rechargeChannel);
    };
  }, [notifyOrder, notifyRecharge]);

  // ─────────────────────────────────────────────────────────────────────────
  // Polling fallback
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;

    const fetchSnapshot = async () => {
      const [oLatest, rLatest, oCount, rCount] = await Promise.all([
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
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("recharge_requests").select("id", { count: "exact", head: true }),
      ]);
      return {
        latestOrderId: (oLatest.data as any)?.id ?? null,
        latestRechargeId: (rLatest.data as any)?.id ?? null,
        orderCount: oCount.count ?? null,
        rechargeCount: rCount.count ?? null,
      };
    };

    const init = async () => {
      const s = await fetchSnapshot();
      if (!alive) return;
      lastOrderIdRef.current = s.latestOrderId ?? lastOrderIdRef.current;
      lastRechargeIdRef.current = s.latestRechargeId ?? lastRechargeIdRef.current;
      if (typeof s.orderCount === "number") lastOrderCountRef.current = s.orderCount;
      if (typeof s.rechargeCount === "number") lastRechargeCountRef.current = s.rechargeCount;
    };

    const poll = async () => {
      const s = await fetchSnapshot();
      if (!alive) return;

      // ID‑based check
      if (s.latestOrderId && s.latestOrderId !== lastOrderIdRef.current) {
        notifyOrder(s.latestOrderId);
      }
      if (s.latestRechargeId && s.latestRechargeId !== lastRechargeIdRef.current) {
        notifyRecharge(s.latestRechargeId);
      }

      // Count‑based fallback
      if (typeof s.orderCount === "number") {
        const prev = lastOrderCountRef.current;
        if (typeof prev === "number" && s.orderCount > prev) {
          if (!s.latestOrderId || s.latestOrderId === lastOrderIdRef.current) {
            setNewOrdersCount((p) => p + 1);
            playOrder();
          }
        }
        lastOrderCountRef.current = s.orderCount;
      }
      if (typeof s.rechargeCount === "number") {
        const prev = lastRechargeCountRef.current;
        if (typeof prev === "number" && s.rechargeCount > prev) {
          if (!s.latestRechargeId || s.latestRechargeId === lastRechargeIdRef.current) {
            setNewOrdersCount((p) => p + 1);
            playRecharge();
          }
        }
        lastRechargeCountRef.current = s.rechargeCount;
      }
    };

    void init();
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [notifyOrder, notifyRecharge, playOrder, playRecharge]);

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
