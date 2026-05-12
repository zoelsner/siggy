"use client";

import { trackEvent } from "@/lib/analytics";
import { useAccess } from "@/lib/billing";

export function LandingNav() {
  const { unlocked, resolved, startCheckout } = useAccess();

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
          <button
            className="button button--primary"
            onClick={() => {
              trackEvent("unlock_click", { source: "nav" });
              void startCheckout();
            }}
            type="button"
          >
            Unlock Siggy — $19
          </button>
        )}
      </div>
    </nav>
  );
}
