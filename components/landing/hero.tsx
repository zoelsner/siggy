"use client";

import { CHECKOUT_URL, useUnlocked } from "@/lib/constants";

export function Hero() {
  const { unlocked, resolved } = useUnlocked();

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
          <a className="button button--primary button--large" href={CHECKOUT_URL}>
            Unlock Siggy — $49 <span className="button__strikethrough">$79</span>
          </a>
        )}
        {resolved && !unlocked ? (
          <a className="button button--large" href="/editor">
            Try the editor free
          </a>
        ) : null}
      </div>
      <p className="hero__subtext">One-time payment. Lifetime access. No subscription.</p>
    </section>
  );
}
