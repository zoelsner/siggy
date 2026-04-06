"use client";

import { useState } from "react";

import { splitName } from "@/lib/templates";

const accent = "#4f46e5";
const dark = "#0f172a";
const mid = "#475569";
const light = "#94a3b8";
const rule = "#e2e8f0";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function EdgePreview({ name }: { name: string }) {
  return (
    <div className="tpl-preview tpl-preview--edge">
      <div className="tpl-edge__bar" />
      <div className="tpl-edge__content">
        <div className="tpl-edge__avatar">
          <span>{getInitials(name)}</span>
        </div>
        <div className="tpl-edge__details">
          <div className="tpl-edge__name">{name}</div>
          <div className="tpl-edge__title">Head of Design at Meridian</div>
          <div className="tpl-edge__contact">
            <span className="tpl-edge__link">sarah@meridian.design</span>
            <span className="tpl-edge__phone">+1 (415) 555-0142</span>
          </div>
          <div className="tpl-edge__socials">
            <span>LinkedIn</span>
            <span className="tpl-edge__dot">&middot;</span>
            <span>X</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoldPreview({ name }: { name: string }) {
  const { first, last } = splitName(name);
  return (
    <div className="tpl-preview tpl-preview--bold">
      <div className="tpl-bold__name">
        <span className="tpl-bold__first">{first}</span>
        {last && <span className="tpl-bold__last">{last}</span>}
      </div>
      <div className="tpl-bold__rule" />
      <div className="tpl-bold__columns">
        <div className="tpl-bold__left">
          <span className="tpl-bold__job">Head of Design</span>
          <span className="tpl-bold__company">Meridian Studio</span>
          <div className="tpl-bold__socials">
            <span>LinkedIn</span>
            <span className="tpl-bold__dot">&middot;</span>
            <span>X</span>
          </div>
        </div>
        <div className="tpl-bold__divider" />
        <div className="tpl-bold__right">
          <span>+1 (415) 555-0142</span>
          <span className="tpl-bold__link">sarah@meridian.design</span>
          <span className="tpl-bold__link">meridian.design</span>
        </div>
      </div>
    </div>
  );
}

function CardPreview({ name }: { name: string }) {
  return (
    <div className="tpl-preview tpl-preview--card">
      <div className="tpl-card__frame">
        <div className="tpl-card__photo">
          <div className="tpl-card__avatar">
            <span>{getInitials(name)}</span>
          </div>
        </div>
        <div className="tpl-card__details">
          <div className="tpl-card__name">{name}</div>
          <div className="tpl-card__title">Head of Design &middot; Meridian</div>
          <div className="tpl-card__rule" />
          <span className="tpl-card__link">sarah@meridian.design</span>
          <span className="tpl-card__text">meridian.design</span>
        </div>
      </div>
    </div>
  );
}

function CleanPreview({ name }: { name: string }) {
  return (
    <div className="tpl-preview tpl-preview--clean">
      <div className="tpl-clean__name">{name}</div>
      <div className="tpl-clean__title">Head of Design, Meridian Studio</div>
      <div className="tpl-clean__contact">
        <span>sarah@meridian.design</span>
        <span className="tpl-clean__dot">&middot;</span>
        <span>+1 (415) 555-0142</span>
      </div>
      <div className="tpl-clean__socials">
        <span>LinkedIn</span>
        <span className="tpl-clean__dot">&middot;</span>
        <span>X</span>
        <span className="tpl-clean__dot">&middot;</span>
        <span>GitHub</span>
      </div>
    </div>
  );
}

const templates = [
  { id: "edge", name: "Edge", desc: "Accent bar + photo + icon contacts", Preview: EdgePreview },
  { id: "bold", name: "Bold", desc: "Massive split-color name as hero", Preview: BoldPreview },
  { id: "card", name: "Card", desc: "Framed card with tinted photo panel", Preview: CardPreview },
  { id: "clean", name: "Clean", desc: "Pure text, zero decoration", Preview: CleanPreview },
];

export function Templates() {
  const [name, setName] = useState("Sarah Chen");

  return (
    <section className="templates-section" id="templates">
      <span className="templates-section__eyebrow">Templates</span>
      <h2 className="templates-section__headline">Four styles. Zero compromises.</h2>
      <p className="templates-section__subtitle">Type your name and see it in every template.</p>
      <input
        className="templates-section__input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        type="text"
      />
      <div className="templates-grid">
        {templates.map((t) => (
          <div className="template-card" key={t.id}>
            <t.Preview name={name || "Your Name"} />
            <div className="template-card__label">
              <span className="template-card__name">{t.name}</span>
              <span className="template-card__desc">{t.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
