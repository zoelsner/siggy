"use client";

import { openCheckout } from "@/lib/checkout-overlay";
import { useUnlocked } from "@/lib/constants";

export function LandingNav() {
  const { unlocked, resolved, unlock } = useUnlocked();

  return (
    <nav className="landing-nav">
      <div className="wordmark">
        <div className="wordmark__badge">S</div>
        <span className="wordmark__title">Siggy</span>
      </div>
      <div className="landing-nav__links">
        <a href="#how-it-works">How it works</a>
        <a href="#pricing">Pricing</a>
        {!resolved ? null : unlocked ? (
          <a className="button button--primary" href="/editor">
            Open Editor
          </a>
        ) : (
          <button className="button button--primary" onClick={() => openCheckout(unlock)} type="button">
            Unlock Siggy — $19
          </button>
        )}
      </div>
    </nav>
  );
}
