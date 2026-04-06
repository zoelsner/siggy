"use client";

import { useEffect, useState } from "react";

export { CHECKOUT_URL } from "./checkout";

export function useUnlocked() {
  const [unlocked, setUnlocked] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("order_id") || params.get("checkout_hash") || params.get("key");
    if (key) {
      localStorage.setItem("siggy_key", key);
      window.history.replaceState({}, "", window.location.pathname);
    }
    setUnlocked(!!localStorage.getItem("siggy_key"));
    setResolved(true);
  }, []);

  return { unlocked, resolved };
}
