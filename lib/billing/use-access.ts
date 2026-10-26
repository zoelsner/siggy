"use client";

import { useCallback, useEffect, useState } from "react";


const STORAGE_KEY = "siggy_access";

export type AccessError = "checkout_failed" | "redeem_failed" | "restore_required" | "verification_unavailable" | null;

async function verifyToken(token: string): Promise<boolean | null> {
  try {
    const res = await fetch("/api/billing/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { valid?: boolean };
    return typeof data.valid === "boolean" ? data.valid : null;
  } catch {
    return null;
  }
}

async function redeemSession(sessionId: string): Promise<{ token?: string; restoreRequired?: boolean } | null> {
  try {
    const res = await fetch("/api/billing/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string; restoreRequired?: boolean };
    return typeof data.token === "string" ? { token: data.token } : data.restoreRequired === true ? { restoreRequired: true } : null;
  } catch {
    return null;
  }
}

function storeAndCleanUrl(token: string, params: URLSearchParams): boolean {
  let saved = false;
  try {
    localStorage.setItem(STORAGE_KEY, token);
    saved = true;
  } catch {
    // Verified access can still be used in memory for this page session.
  }
  // Never use the URL as a storage fallback for purchase credentials.
  params.delete("session_id");
  params.delete("access_token");
  const next = window.location.pathname + (params.toString() ? `?${params}` : "");
  window.history.replaceState({}, "", next);
  return saved;
}

export function useAccess() {
  const [unlocked, setUnlocked] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<AccessError>(null);
  const [accessSaveFailed, setAccessSaveFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // 1. Check for ?session_id=... from Stripe success_url and redeem it.
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      if (sessionId) {
        const redeemed = await redeemSession(sessionId);
        if (cancelled) return;
        if (redeemed?.token) {
          setAccessSaveFailed(!storeAndCleanUrl(redeemed.token, params));
          setToken(redeemed.token);
          setUnlocked(true);
          setResolved(true);
          return;
        }
        // A checkout return could not be verified. Do not claim the payment
        // succeeded until the server has confirmed it.
        setError(redeemed?.restoreRequired ? "restore_required" : "redeem_failed");
      }

      // 2. Check for ?access_token=... from a restore/receipt email link.
      const accessToken = params.get("access_token");
      if (accessToken) {
        const valid = await verifyToken(accessToken);
        if (cancelled) return;
        if (valid === true) {
          setAccessSaveFailed(!storeAndCleanUrl(accessToken, params));
          setToken(accessToken);
          setUnlocked(true);
          setResolved(true);
          return;
        }
        if (valid === null) setError("verification_unavailable");
      }

      // 3. Verify any cached token.
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch {
        // Storage may be disabled. Resolve normally as free in that case.
      }
      if (stored) {
        const valid = await verifyToken(stored);
        if (cancelled) return;
        if (valid === true) {
          setToken(stored);
          setUnlocked(true);
          setError(null);
        } else if (valid === false) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // An invalid cached token never grants access, even if removal fails.
          }
        } else {
          setError("verification_unavailable");
        }
      }
      setResolved(true);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCheckout = useCallback(async (source: "editor" | "landing" = "landing"): Promise<void> => {
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
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

  return { unlocked, resolved, token, error, accessSaveFailed, startCheckout };
}
