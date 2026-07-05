"use client";

import { BoldPreview, CardPreview, UnderlinePreview } from "@/components/landing/templates";
import { trackEvent } from "@/lib/analytics";
import { useAccess } from "@/lib/billing";
import { SUPPORT_EMAIL } from "@/lib/site";

function ReceiptLine({
  label,
  value,
  dim = false,
  strike = false,
  strong = false
}: {
  label: string;
  value: string;
  dim?: boolean;
  strike?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={`pricing-receipt__line${strong ? " pricing-receipt__line--strong" : ""}${dim ? " pricing-receipt__line--dim" : ""}`}>
      <span>{label}</span>
      <span className="pricing-receipt__spacer" />
      <span className={strike ? "pricing-receipt__strike" : undefined}>{value}</span>
    </div>
  );
}

export function Pricing() {
  const { unlocked, resolved, error, startCheckout } = useAccess();

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-header">
        <span className="pricing-header__eyebrow">Pricing</span>
        <h2 className="pricing-header__headline">Four designs. One $19.</h2>
        <p className="pricing-header__subtitle">
          The others charge $6–12 a month for one look. Siggy is every design, every font, every
          accent — once.
        </p>
      </div>

      <div className="pricing-grid">
        <div className="pricing-receipt-col">
          <div className="pricing-receipt">
            <div className="pricing-receipt__brand">Siggy &middot; trysiggy.com</div>
            <div className="pricing-receipt__lifetime">*** lifetime license ***</div>
            <div className="pricing-receipt__lines">
              <ReceiptLine label="All 4 designs" value="$19.00" />
              <ReceiptLine label="12 fonts · 8 accents" value="incl." />
              <ReceiptLine label="Headshots & socials" value="incl." />
              <ReceiptLine label="Watermark" value="removed" />
              <ReceiptLine label="Subscription (the others)" value="$144/yr" dim strike />
              <ReceiptLine label="Renewal, ever" value="$0.00" dim />
            </div>
            <div className="pricing-receipt__divider" />
            <ReceiptLine label="TOTAL, EVER" value="$19.00" strong />
            <div className="pricing-receipt__footer">no account &middot; no renewal &middot; thank you</div>
          </div>

          {!resolved ? null : unlocked ? (
            <a className="button button--primary button--large pricing-receipt-col__cta" href="/editor">
              Open Editor
            </a>
          ) : (
            <>
              <button
                className="button button--primary button--large pricing-receipt-col__cta"
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
          <p className="pricing-receipt-col__caption">
            30-day refund — just reply to your receipt. Free version has everything too, with a
            small watermark.
          </p>
          <p className="pricing-card__error">
            Already bought? <a href="/restore">Restore access</a>
          </p>
        </div>

        <div className="pricing-stack-col">
          <span className="pricing-stack__eyebrow">Every design, unlocked</span>
          <div className="pricing-stack">
            <div className="pricing-stack__card pricing-stack__card--bold">
              <span className="pricing-stack__label">Bold</span>
              <BoldPreview
                name="Diego Torres"
                accent="#2f6a52"
                title="Illustrator"
                company=""
                email="hola@diegodraws.com"
                phone="+1 (646) 555-0113"
                site="diegodraws.com"
              />
            </div>
            <div className="pricing-stack__card pricing-stack__card--underline">
              <span className="pricing-stack__label">Underline</span>
              <UnderlinePreview
                name="Maya Okafor"
                accent="#c9583d"
                title="Brand Designer"
                company="Studio North"
                email="maya@studionorth.co"
                phone="+1 (312) 555-0186"
                site="studionorth.co"
              />
            </div>
            <div className="pricing-stack__card pricing-stack__card--card">
              <span className="pricing-stack__label">Card</span>
              <CardPreview name="Sarah Chen" accent="#4f46e5" img="/sarah-avatar.png" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
