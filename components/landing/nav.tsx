"use client";

import { CHECKOUT_URL, useUnlocked } from "@/lib/constants";

export function LandingNav() {
  const { unlocked, resolved } = useUnlocked();

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
          <a className="button button--primary" href={CHECKOUT_URL}>
            Unlock Siggy — $49 <span className="button__strikethrough">$79</span>
          </a>
        )}
      </div>
    </nav>
  );
}
