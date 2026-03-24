"use client";

import { useEffect, useState } from "react";

const CHECKOUT_URL = "https://siggy.lemonsqueezy.com/buy/TODO";

export function SiteBanner() {
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("order_id") || params.get("checkout_hash") || params.get("key");
    if (key) {
      localStorage.setItem("siggy_key", key);
    }
    setUnlocked(!!localStorage.getItem("siggy_key"));
    setMounted(true);
  }, []);

  if (!mounted || unlocked) return null;

  return (
    <div className="site-banner">
      Stop sending emails with a default signature —{" "}
      <a href={CHECKOUT_URL}>Get Siggy for $49</a>
    </div>
  );
}
