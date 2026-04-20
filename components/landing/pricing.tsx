"use client";

import { LicenseInput } from "@/components/license-input";
import { openCheckout } from "@/lib/checkout-overlay";
import { useUnlocked } from "@/lib/constants";

export function Pricing() {
  const { unlocked, resolved, unlock } = useUnlocked();

  const features = [
    "Own it forever — no subscription",
    "4 editorial-quality templates",
    "Custom fonts rendered as images",
    "Headshot upload & resize",
    "Social icons & CTA button",
    "Gmail, Outlook & Apple Mail ready",
  ];

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-card">
        <div className="pricing-card__header">
          <span className="pricing-card__label">Own it forever</span>
          <div className="pricing-card__price">
            <span className="pricing-card__amount">$19</span>
            <span className="pricing-card__term">one-time · no subscription</span>
          </div>
        </div>
        <ul className="pricing-card__features">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        {!resolved ? null : unlocked ? (
          <a className="button button--primary button--large pricing-card__cta" href="/editor">
            Open Editor
          </a>
        ) : (
          <>
            <button className="button button--primary button--large pricing-card__cta" onClick={() => openCheckout(unlock)} type="button">
              Unlock Siggy — $19
            </button>
            <LicenseInput onUnlock={unlock} />
          </>
        )}
      </div>
    </section>
  );
}
