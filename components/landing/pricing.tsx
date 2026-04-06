"use client";

import { CHECKOUT_URL, useUnlocked } from "@/lib/constants";

export function Pricing() {
  const { unlocked, resolved } = useUnlocked();

  const features = [
    "4 editorial-quality templates",
    "Custom fonts rendered as images",
    "Headshot upload & resize",
    "Social icons & CTA button",
    "Gmail, Outlook & Apple Mail ready",
    "Lifetime access — no subscription",
  ];

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-card">
        <div className="pricing-card__header">
          <span className="pricing-card__label">Lifetime deal</span>
          <div className="pricing-card__price">
            <span className="pricing-card__amount">$49</span>
            <span className="pricing-card__term">one-time</span>
          </div>
        </div>
        <ul className="pricing-card__features">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        {!resolved ? (
          <a className="button button--primary button--large pricing-card__cta" href={CHECKOUT_URL}>
            Unlock Siggy — $49 <span className="button__strikethrough">$79</span>
          </a>
        ) : unlocked ? (
          <a className="button button--primary button--large pricing-card__cta" href="/editor">
            Open Editor
          </a>
        ) : (
          <a className="button button--primary button--large pricing-card__cta" href={CHECKOUT_URL}>
            Unlock Siggy — $49 <span className="button__strikethrough">$79</span>
          </a>
        )}
      </div>
    </section>
  );
}
