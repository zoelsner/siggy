"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "siggy_access";

export type AccessError = "checkout_failed" | "redeem_failed" | null;

async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/billing/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { valid?: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}

async function redeemSession(sessionId: string): Promise<string | null> {
  try {
    const res = await fetch("/api/billing/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

export function useAccess() {
  const [unlocked, setUnlocked] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<AccessError>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // 1. Check for ?session_id=... from Stripe success_url and redeem it.
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      if (sessionId) {
        const redeemed = await redeemSession(sessionId);
        if (cancelled) return;
        if (redeemed) {
          localStorage.setItem(STORAGE_KEY, redeemed);
          setToken(redeemed);
          setUnlocked(true);
          setResolved(true);
          // Remove session_id from URL without reloading.
          params.delete("session_id");
          const next = window.location.pathname + (params.toString() ? `?${params}` : "");
          window.history.replaceState({}, "", next);
          return;
        }
        // The user just came back from a paid checkout but redemption failed —
        // surface this so the UI can show "we received your payment, contact support".
        setError("redeem_failed");
      }

      // 2. Verify any cached token.
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const valid = await verifyToken(stored);
        if (cancelled) return;
        if (valid) {
          setToken(stored);
          setUnlocked(true);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setResolved(true);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCheckout = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      if (!res.ok) {
        setError("checkout_failed");
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("checkout_failed");
      }
    } catch {
      setError("checkout_failed");
    }
  }, []);

  return { unlocked, resolved, token, error, startCheckout };
}
