"use client";

import { trackEvent } from "@/lib/analytics";
import { useAccess } from "@/lib/billing";
import { SUPPORT_EMAIL } from "@/lib/site";

export function Pricing() {
  const { unlocked, resolved, error, startCheckout } = useAccess();

  const features = [
    "No “Made with Siggy” watermark",
    "9 pro fonts, rendered as images so email clients can't break them",
    "Headshot upload with crop & resize",
    "Lifetime access — no subscription",
  ];

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-card">
        <div className="pricing-card__header">
          <span className="pricing-card__label">Lifetime deal</span>
          <div className="pricing-card__price">
            <span className="pricing-card__amount">$19</span>
            <span className="pricing-card__term">one-time</span>
          </div>
        </div>
        <ul className="pricing-card__features">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <p className="pricing-card__note">
          The free editor includes all 4 templates, system fonts, social links &amp; CTA buttons —
          with a small Siggy watermark.
        </p>
        {!resolved ? null : unlocked ? (
          <a className="button button--primary button--large pricing-card__cta" href="/editor">
            Open Editor
          </a>
        ) : (
          <>
            <button
              className="button button--primary button--large pricing-card__cta"
              onClick={() => {
                trackEvent("unlock_click", { source: "pricing" });
                void startCheckout();
              }}
              type="button"
            >
              Unlock Siggy — $19
            </button>
            {error === "checkout_failed" ? (
              <p className="pricing-card__error">
                Couldn&apos;t open checkout. Try again, or email{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
            ) : null}
            {error === "redeem_failed" ? (
              <p className="pricing-card__error">
                We received your payment but couldn&apos;t verify it. Email{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your receipt.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
