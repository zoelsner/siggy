"use client";

import { trackEvent } from "@/lib/analytics";
import { useAccess } from "@/lib/billing";
import { splitName } from "@/lib/templates";

const PALETTE = ["#1d1b19", "#4f46e5", "#c9583d", "#2f6a52", "#a86b2c", "#5a4ba0"];

export function Hero({
  name,
  accent,
  onNameChange,
  onAccentChange
}: {
  name: string;
  accent: string;
  onNameChange: (value: string) => void;
  onAccentChange: (color: string) => void;
}) {
  const { unlocked, resolved, startCheckout } = useAccess();

  return (
    <section className="hero hero--split">
      <div className="hero__left">
        <div className="hero__eyebrow">The 30-second signature</div>
        <h1 className="hero__headline">
          Type your name.<br />Get a sharp signature.
        </h1>
        <p className="hero__subtitle">
          Try it right here — no account, no email, no &ldquo;free 14-day trial.&rdquo;
          Copy the HTML when it looks right and paste into Gmail.
        </p>
        <div className="hero__actions">
          {!resolved ? null : unlocked ? (
            <a className="button button--primary button--large" href="/editor">
              Open editor
            </a>
          ) : (
            <button
              className="button button--primary button--large"
              onClick={() => {
                trackEvent("unlock_click", { source: "hero" });
                void startCheckout();
              }}
              type="button"
            >
              Unlock Siggy — $19
            </button>
          )}
          <a className="button button--large" href="/editor">
            Customize fonts &amp; colors
          </a>
        </div>
        <dl className="hero__stats">
          <div className="hero__stat">
            <dt>4</dt>
            <dd>templates</dd>
          </div>
          <div className="hero__stat">
            <dt>12</dt>
            <dd>fonts &middot; 8 colors</dd>
          </div>
          <div className="hero__stat">
            <dt>$19</dt>
            <dd>one-time, lifetime</dd>
          </div>
        </dl>
      </div>

      <div className="hero__right">
        <div className="hero-card-stack">
          <div className="hero-card-stack__back" />
          <div className="hero-card-stack__front">
            <div className="hero-mini-chrome">
              <span className="hero-mini-chrome__dot hero-mini-chrome__dot--r" />
              <span className="hero-mini-chrome__dot hero-mini-chrome__dot--y" />
              <span className="hero-mini-chrome__dot hero-mini-chrome__dot--g" />
              <span className="hero-mini-chrome__url">trysiggy.com/editor</span>
            </div>
            <div className="hero-mini-editor">
              <div className="hero-mini-editor__rail">
                <span className="hero-mini-editor__eyebrow">Your details</span>
                <HeroMiniField label="Name" value={name} onChange={onNameChange} focused />
                <HeroMiniField label="Title" value="Head of Design" />
                <HeroMiniField label="Email" value="sarah@meridian.design" />
                <span className="hero-mini-editor__eyebrow hero-mini-editor__eyebrow--mt">Color</span>
                <div className="hero-mini-editor__swatches">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`hero-mini-editor__swatch${c === accent ? " hero-mini-editor__swatch--active" : ""}`}
                      style={{ background: c }}
                      aria-label={`Accent color ${c}`}
                      onClick={() => onAccentChange(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="hero-mini-editor__preview">
                <HeroMiniSignature name={name} accent={accent} />
              </div>
            </div>
            <div className="hero-mini-footer">
              <span className="hero-mini-footer__status">Auto-saved · ready to copy</span>
              <span className="hero-mini-footer__copy">Copy HTML</span>
            </div>
          </div>
          <span className="hero-card-stack__sticker">← edit me, it&rsquo;s live</span>
        </div>
      </div>
    </section>
  );
}

function HeroMiniField({
  label,
  value,
  focused = false,
  onChange
}: {
  label: string;
  value: string;
  focused?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="hero-mini-field">
      <span className="hero-mini-field__label">{label}</span>
      <div className={`hero-mini-field__box${focused ? " hero-mini-field__box--focused" : ""}`}>
        {onChange ? (
          <input
            className="hero-mini-field__input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            type="text"
          />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function HeroMiniSignature({ name, accent }: { name: string; accent: string }) {
  const { first, last } = splitName(name);
  return (
    <div className="hero-mini-sig">
      <img className="hero-mini-sig__avatar" src="/sarah-avatar.png" alt="" width={52} height={52} />
      <div className="hero-mini-sig__body">
        <div className="hero-mini-sig__name">
          {first}
          {last ? (
            <>
              {" "}
              <span style={{ color: accent }}>{last}</span>
            </>
          ) : null}
        </div>
        <div className="hero-mini-sig__title">Head of Design · Meridian Studio</div>
        <div className="hero-mini-sig__contact">
          <span style={{ color: accent }}>sarah@meridian.design</span>
          <span className="hero-mini-sig__sep">|</span>
          <span>+1 (415) 555-0142</span>
        </div>
      </div>
    </div>
  );
}
