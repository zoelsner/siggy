"use client";

import { LicenseInput } from "@/components/license-input";
import { openCheckout } from "@/lib/checkout-overlay";
import { useUnlocked } from "@/lib/constants";

export function Hero() {
  const { unlocked, resolved, unlock } = useUnlocked();

  return (
    <section className="hero">
      <div className="hero__seal" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <defs>
            <path
              id="sealRingPath"
              d="M 100,100 m -76,0 a 76,76 0 1,1 152,0 a 76,76 0 1,1 -152,0"
              fill="none"
            />
          </defs>
          <circle cx="100" cy="100" r="96" fill="#FEFCF8" stroke="#1d1b19" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="62" fill="none" stroke="#1d1b19" strokeWidth="0.75" />
          <text
            fill="#1d1b19"
            fontSize="10.5"
            letterSpacing="0.22em"
            fontFamily="'Geist Mono', 'SF Mono', Consolas, monospace"
            fontWeight="500"
          >
            <textPath href="#sealRingPath" startOffset="0%">
              NO · SUBSCRIPTION · EVER · SIGGY ·
            </textPath>
          </text>
          <text
            x="100"
            y="108"
            textAnchor="middle"
            fontFamily="'DM Sans', sans-serif"
            fontSize="42"
            fontWeight="900"
            fill="#4f46e5"
          >
            $19
          </text>
          <text
            x="100"
            y="128"
            textAnchor="middle"
            fontFamily="'Geist Mono', 'SF Mono', Consolas, monospace"
            fontSize="9"
            letterSpacing="0.3em"
            fill="#1d1b19"
            fontWeight="500"
          >
            ONCE
          </text>
        </svg>
      </div>
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
              Unlock Siggy — $19
            </button>
            <a className="button button--large" href="/editor">
              Try the editor free
            </a>
            <LicenseInput onUnlock={unlock} />
          </>
        )}
      </div>
      <p className="hero__subtext">$19 · Own it forever · No subscription</p>
    </section>
  );
}
