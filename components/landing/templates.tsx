"use client";

import type React from "react";

import { splitName } from "@/lib/templates";
import type { TemplateId } from "@/lib/types";

const DEFAULT_PERSONA = {
  title: "Head of Design",
  company: "Meridian Studio",
  email: "sarah@meridian.design",
  phone: "+1 (415) 555-0142",
  site: "meridian.design"
};

type PreviewProps = {
  name: string;
  accent: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  site?: string;
};

export function UnderlinePreview({
  name,
  accent,
  title = DEFAULT_PERSONA.title,
  company = DEFAULT_PERSONA.company,
  email = DEFAULT_PERSONA.email,
  phone = DEFAULT_PERSONA.phone,
  site = DEFAULT_PERSONA.site
}: PreviewProps) {
  const { first, last } = splitName(name);
  return (
    <div className="tpl-preview tpl-preview--edge">
      <div className="tpl-edge__name-wrap">
        <div className="tpl-edge__name">
          <span>{first}</span>
          {last ? <span className="tpl-edge__last" style={{ color: accent }}>{last}</span> : null}
        </div>
        <div className="tpl-edge__highlight" style={{ background: accent }} />
      </div>
      <div className="tpl-edge__title"><strong>{title.toUpperCase()}</strong><span>&middot;</span>{company}</div>
      <div className="tpl-edge__rule" />
      <div className="tpl-edge__footer">
        <div className="tpl-edge__contact">
          <span className="tpl-edge__link" style={{ color: accent }}>{email}</span>
          <span>{phone}</span>
          <span>{site}</span>
        </div>
        <div className="tpl-edge__socials" style={{ color: accent }}>
          <span>LinkedIn</span>
          <span className="tpl-edge__dot">&middot;</span>
          <span>X</span>
        </div>
      </div>
    </div>
  );
}

export function BoldPreview({
  name,
  accent,
  title = DEFAULT_PERSONA.title,
  company = DEFAULT_PERSONA.company,
  email = DEFAULT_PERSONA.email,
  phone = DEFAULT_PERSONA.phone,
  site = DEFAULT_PERSONA.site
}: PreviewProps) {
  const { first, last } = splitName(name);
  return (
    <div className="tpl-preview tpl-preview--bold">
      <div className="tpl-bold__name">
        <span className="tpl-bold__first">{first}</span>
        {last && <span className="tpl-bold__last" style={{ color: accent }}>{last}</span>}
      </div>
      <div className="tpl-bold__rule" style={{ background: accent }} />
      <div className="tpl-bold__columns">
        <div className="tpl-bold__left">
          <span className="tpl-bold__job">{title}</span>
          {company ? <span className="tpl-bold__company">{company}</span> : null}
          <div className="tpl-bold__socials" style={{ color: accent }}>
            <span>LinkedIn</span>
            <span className="tpl-bold__dot">&middot;</span>
            <span>X</span>
          </div>
        </div>
        <div className="tpl-bold__divider" />
        <div className="tpl-bold__right">
          <span>{phone}</span>
          <span className="tpl-bold__link" style={{ color: accent }}>{email}</span>
          <span className="tpl-bold__link" style={{ color: accent }}>{site}</span>
        </div>
      </div>
    </div>
  );
}

export function CardPreview({
  name,
  accent,
  title = DEFAULT_PERSONA.title,
  company = "Meridian",
  email = DEFAULT_PERSONA.email,
  site = DEFAULT_PERSONA.site,
  img = "/sarah-avatar.png"
}: PreviewProps & { img?: string }) {
  return (
    <div className="tpl-preview tpl-preview--card">
      <div className="tpl-card__frame">
        <div className="tpl-card__photo">
          <img className="tpl-card__avatar-img" src={img} alt="" width={66} height={66} />
        </div>
        <div className="tpl-card__details">
          <div className="tpl-card__name">{name}</div>
          <div className="tpl-card__title">{title} &middot; {company}</div>
          <div className="tpl-card__rule" />
          <span className="tpl-card__link" style={{ color: accent }}>{email}</span>
          <span className="tpl-card__text">{site}</span>
        </div>
      </div>
    </div>
  );
}

function CleanPreview({
  name,
  accent,
  title = DEFAULT_PERSONA.title,
  company = DEFAULT_PERSONA.company,
  email = DEFAULT_PERSONA.email,
  phone = DEFAULT_PERSONA.phone
}: PreviewProps) {
  return (
    <div className="tpl-preview tpl-preview--clean">
      <div className="tpl-clean__name">{name}</div>
      <div className="tpl-clean__title">{title}, {company}</div>
      <div className="tpl-clean__contact">
        <span>{email}</span>
        <span className="tpl-clean__dot">&middot;</span>
        <span>{phone}</span>
      </div>
      <div className="tpl-clean__socials" style={{ color: accent }}>
        <span>LinkedIn</span>
        <span className="tpl-clean__dot">&middot;</span>
        <span>X</span>
        <span className="tpl-clean__dot">&middot;</span>
        <span>GitHub</span>
      </div>
    </div>
  );
}

const templates: { id: TemplateId; name: string; desc: string; Preview: (props: PreviewProps) => React.ReactElement }[] = [
  { id: "bold", name: "Bold", desc: "Massive split-color name as hero", Preview: BoldPreview },
  { id: "edge", name: "Underline", desc: "Soft highlight underline + compact contacts", Preview: UnderlinePreview },
  { id: "card", name: "Card", desc: "Visual anchor with a tinted headshot panel", Preview: CardPreview },
  { id: "clean", name: "Minimal", desc: "Pure text, accent name, zero chrome", Preview: CleanPreview }
];

export function Templates({
  name,
  accent,
  onSelectTemplate,
  title,
  company,
  email
}: {
  name: string;
  accent: string;
  onSelectTemplate: (id: TemplateId) => void;
  title?: string;
  company?: string;
  email?: string;
}) {
  return (
    <section className="templates-section" id="templates">
      <span className="templates-section__eyebrow">Templates</span>
      <h2 className="templates-section__headline">Four styles. Zero compromises.</h2>
      <p className="templates-section__subtitle">
        The name you typed above, in every template — headshot included.
      </p>
      <div className="templates-grid">
        {templates.map((t) => (
          <button
            type="button"
            className="template-card"
            key={t.id}
            onClick={() => onSelectTemplate(t.id)}
          >
            <t.Preview name={name || "Your Name"} accent={accent} title={title} company={company} email={email} />
            <div className="template-card__label">
              <span className="template-card__name">{t.name}</span>
              <span className="template-card__desc">{t.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
