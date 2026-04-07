"use client";

import { LicenseInput } from "@/components/license-input";
import { openCheckout } from "@/lib/checkout-overlay";
import { useUnlocked } from "@/lib/constants";

export function Hero() {
  const { unlocked, resolved, unlock } = useUnlocked();

  return (
    <section className="hero">
      <h1 className="hero__headline">
        Your name deserves better<br />than Arial 11pt.
      </h1>
      <p className="hero__subtitle">
        Siggy is an email signature builder that makes you look sharp in every inbox.
        Pick a template, customize your details, copy the HTML. Done.
      </p>
      <div className="hero__actions">
        {!resolved ? null : unlocked ? (
          <a className="button button--primary button--large" href="/editor">
            Open Editor
          </a>
        ) : (
          <>
            <button className="button button--primary button--large" onClick={() => openCheckout(unlock)} type="button">
              Unlock Siggy — $49 <span className="button__strikethrough">$79</span>
            </button>
            <a className="button button--large" href="/editor">
              Try the editor free
            </a>
            <LicenseInput onUnlock={unlock} />
          </>
        )}
      </div>
      <p className="hero__subtext">One-time payment. Lifetime access. No subscription.</p>
    </section>
  );
}
