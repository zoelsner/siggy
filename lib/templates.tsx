import React from "react";

import { getFilledSocials, resolveUrlForHtml } from "./document";
import { fontFamilyMap } from "./fonts";
import type { SignatureDocument, TemplateDefinition, TemplateId, TemplateRenderContext } from "./types";

const dark = "#0f172a";
const mid = "#475569";
const light = "#94a3b8";
const rule = "#e2e8f0";
const font = "Arial, 'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif";

function resolveNameFontFamily(fontId: string): string | undefined {
  return fontFamilyMap[fontId];
}

function nameImg(doc: SignatureDocument, ctx: TemplateRenderContext, fallbackStyle: React.CSSProperties) {
  if (ctx.nameImageUrl && ctx.nameImageWidth && ctx.nameImageHeight) {
    return <img alt={doc.fullName} src={ctx.nameImageUrl} width={ctx.nameImageWidth} height={ctx.nameImageHeight} style={{ display: "block" }} />;
  }
  const nameFontFamily = resolveNameFontFamily(doc.fontFamily);
  return <div style={{ ...fallbackStyle, color: ctx.accentColor, ...(nameFontFamily ? { fontFamily: nameFontFamily } : {}) }}>{doc.fullName}</div>;
}

function photo(url: string | null, doc: SignatureDocument, size = 72, round = "50%") {
  if (url) return <img alt={doc.image?.alt ?? ""} src={url} width={size} height={size} style={{ borderRadius: round, display: "block" }} />;
  const initials = doc.fullName.split(" ").slice(0, 2).map(c => c[0]).join("").toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: round, background: doc.accentColor, color: "#fff", fontSize: Math.round(size * 0.35), fontWeight: 700, lineHeight: `${size}px`, textAlign: "center" }}>{initials}</div>;
}

function link(href: string, text: string, color: string) {
  return <a href={href} style={{ color, textDecoration: "none" }}>{text}</a>;
}

function socials(doc: SignatureDocument, color: string) {
  const filled = getFilledSocials(doc);
  if (!filled.length) return null;
  return (
    <div style={{ marginTop: "10px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
      {filled.map((s, i) => (
        <React.Fragment key={s.id}>
          {i > 0 ? <span style={{ color: light, margin: "0 6px" }}>·</span> : null}
          <a href={resolveUrlForHtml(s.url)} style={{ color, textDecoration: "none" }}>{s.platform}</a>
        </React.Fragment>
      ))}
    </div>
  );
}

function ctaButton(doc: SignatureDocument, accentColor: string) {
  if (!doc.cta?.text || !doc.cta?.url) return null;
  return (
    <table cellPadding={0} cellSpacing={0} style={{ marginTop: "14px" }}>
      <tbody><tr><td style={{
        backgroundColor: accentColor,
        borderRadius: "6px",
        padding: "8px 18px",
        fontSize: "12px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.04em",
      }}>
        <a href={doc.cta.url} style={{ color: "#ffffff", textDecoration: "none" }}>
          {doc.cta.text}
        </a>
      </td></tr></tbody>
    </table>
  );
}

function watermark() {
  return (
    <div style={{ marginTop: "16px", fontSize: "10px", color: "#c4b5fd" }}>
      <a href="https://siggy.app" style={{ color: "#94a3b8", textDecoration: "none" }}>
        Made with Siggy
      </a>
    </div>
  );
}

// ━━━ EDGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Thick accent bar left, circular photo, icon contacts
function edge(doc: SignatureDocument, ctx: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, color: dark }}>
      <tbody>
        <tr>
          <td style={{ width: "5px", background: ctx.accentColor, borderRadius: "3px" }} />
          <td style={{ paddingLeft: "20px", verticalAlign: "top" }}>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: "16px", verticalAlign: "top" }}>
                    {photo(ctx.imageUrl, doc, 72)}
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    {nameImg(doc, ctx, { fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em", color: dark })}
                    <div style={{ marginTop: "4px", fontSize: "13px", color: mid }}>
                      {doc.jobTitle} at {doc.company}
                    </div>
                    <table cellPadding={0} cellSpacing={0} style={{ marginTop: "12px", borderCollapse: "collapse", fontFamily: font, fontSize: "13px", color: mid }}>
                      <tbody>
                        {doc.email ? <tr><td style={{ paddingRight: "8px", color: light, fontSize: "14px" }}>✉</td><td style={{ paddingBottom: "4px" }}>{link(`mailto:${doc.email}`, doc.email, ctx.accentColor)}</td></tr> : null}
                        {doc.phone ? <tr><td style={{ paddingRight: "8px", color: light, fontSize: "14px" }}>☏</td><td style={{ paddingBottom: "4px" }}>{doc.phone}</td></tr> : null}
                        {doc.website ? <tr><td style={{ paddingRight: "8px", color: light, fontSize: "14px" }}>⊕</td><td>{link(resolveUrlForHtml(doc.website), doc.website.replace(/^https?:\/\//i, ""), ctx.accentColor)}</td></tr> : null}
                      </tbody>
                    </table>
                    {socials(doc, ctx.accentColor)}
                    {ctaButton(doc, ctx.accentColor)}
                    {ctx.unlocked ? null : watermark()}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ━━━ BOLD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Massive uppercase split-color name, full-width accent bar, split details
function bold(doc: SignatureDocument, ctx: TemplateRenderContext) {
  const parts = doc.fullName.split(" ");
  const firstName = parts.slice(0, -1).join(" ") || parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

  const nameFontFamily = resolveNameFontFamily(doc.fontFamily);
  const nameElement = (ctx.nameImageUrl && ctx.nameImageWidth && ctx.nameImageHeight)
    ? <img alt={doc.fullName} src={ctx.nameImageUrl} width={ctx.nameImageWidth} height={ctx.nameImageHeight} style={{ display: "block" }} />
    : (
      <div style={{ fontSize: "40px", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: "0.95", textTransform: "uppercase" as const, ...(nameFontFamily ? { fontFamily: nameFontFamily } : {}) }}>
        <span style={{ color: dark }}>{firstName}</span>
        {lastName ? <><br /><span style={{ color: ctx.accentColor }}>{lastName}</span></> : null}
      </div>
    );

  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, color: dark, width: "100%" }}>
      <tbody>
        <tr>
          <td colSpan={2} style={{ paddingBottom: "4px" }}>
            {nameElement}
            <div style={{ height: "3px", background: ctx.accentColor, width: "100%", margin: "12px 0 0", borderRadius: "2px" }} />
          </td>
        </tr>
        <tr>
          <td style={{ verticalAlign: "top", paddingTop: "14px", paddingRight: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: dark }}>{doc.jobTitle}</div>
            <div style={{ fontSize: "13px", color: mid, marginTop: "2px" }}>{doc.company}</div>
            {socials(doc, ctx.accentColor)}
            {ctaButton(doc, ctx.accentColor)}
          </td>
          <td style={{ verticalAlign: "top", paddingTop: "14px", borderLeft: `1px solid ${rule}`, paddingLeft: "24px" }}>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, fontSize: "13px", color: mid }}>
              <tbody>
                {doc.phone ? <tr><td style={{ paddingRight: "8px", color: light, fontSize: "13px" }}>☏</td><td style={{ paddingBottom: "4px" }}>{doc.phone}</td></tr> : null}
                {doc.email ? <tr><td style={{ paddingRight: "8px", color: light, fontSize: "13px" }}>✉</td><td style={{ paddingBottom: "4px" }}>{link(`mailto:${doc.email}`, doc.email, ctx.accentColor)}</td></tr> : null}
                {doc.website ? <tr><td style={{ paddingRight: "8px", color: light, fontSize: "13px" }}>⊕</td><td>{link(resolveUrlForHtml(doc.website), doc.website.replace(/^https?:\/\//i, ""), ctx.accentColor)}</td></tr> : null}
              </tbody>
            </table>
          </td>
        </tr>
        {ctx.unlocked ? null : <tr><td colSpan={2}>{watermark()}</td></tr>}
      </tbody>
    </table>
  );
}

// ━━━ CARD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Bordered frame, tinted photo panel left, clean details right
function card(doc: SignatureDocument, ctx: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, color: dark, borderRadius: "12px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
      <tbody>
        <tr>
          <td style={{ background: "#f8fafc", padding: "14px", verticalAlign: "middle", textAlign: "center" as const }}>
            {photo(ctx.imageUrl, doc, 80, "12px")}
          </td>
          <td style={{ padding: "18px 20px", verticalAlign: "top" }}>
            {nameImg(doc, ctx, { fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", color: dark })}
            <div style={{ fontSize: "13px", color: mid, marginTop: "3px" }}>{doc.jobTitle} <span style={{ color: light }}>·</span> {doc.company}</div>
            <div style={{ height: "1px", background: rule, margin: "10px 0", width: "140px" }} />
            <div style={{ fontSize: "12px", color: mid, lineHeight: "20px" }}>
              {link(`mailto:${doc.email}`, doc.email, ctx.accentColor)}
              {doc.phone ? <> <span style={{ color: light }}>|</span> {doc.phone}</> : null}
              {doc.website ? <><br />{link(resolveUrlForHtml(doc.website), doc.website.replace(/^https?:\/\//i, ""), ctx.accentColor)}</> : null}
            </div>
            {socials(doc, ctx.accentColor)}
            {ctaButton(doc, ctx.accentColor)}
            {ctx.unlocked ? null : watermark()}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ━━━ CLEAN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Pure text, no decoration
function clean(doc: SignatureDocument, ctx: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, color: dark }}>
      <tbody>
        <tr>
          <td>
            {nameImg(doc, ctx, { fontSize: "16px", fontWeight: 700, color: dark })}
            <div style={{ fontSize: "13px", color: mid, marginTop: "2px" }}>{doc.jobTitle}, {doc.company}</div>
            <div style={{ marginTop: "8px", fontSize: "12px", color: light, lineHeight: "1.7" }}>
              <a href={`mailto:${doc.email}`} style={{ color: mid, textDecoration: "none" }}>{doc.email}</a>
              {doc.phone ? <> <span style={{ color: "#d1d5db" }}>·</span> <span style={{ color: mid }}>{doc.phone}</span></> : null}
              {doc.website ? <> <span style={{ color: "#d1d5db" }}>·</span> <a href={resolveUrlForHtml(doc.website)} style={{ color: mid, textDecoration: "none" }}>{doc.website.replace(/^https?:\/\//i, "")}</a></> : null}
            </div>
            {socials(doc, ctx.accentColor)}
            {ctaButton(doc, ctx.accentColor)}
            {ctx.unlocked ? null : watermark()}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export const templateDefinitions: TemplateDefinition[] = [
  { id: "edge", name: "Edge", description: "Accent bar + photo + icon contacts.", headline: "Bold and structured.", supportsImage: true, render: edge },
  { id: "bold", name: "Bold", description: "Massive split-color name as hero.", headline: "Maximum typographic impact.", supportsImage: false, render: bold },
  { id: "card", name: "Card", description: "Framed card with tinted photo panel.", headline: "Professional and contained.", supportsImage: true, render: card },
  { id: "clean", name: "Clean", description: "Pure text, zero decoration.", headline: "Minimal and portable.", supportsImage: false, render: clean },
];

export function splitName(name: string) {
  const parts = name.split(" ");
  const first = parts.slice(0, -1).join(" ") || parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return { first, last };
}

export function getTemplateDefinition(id: TemplateId): TemplateDefinition {
  return templateDefinitions.find((t) => t.id === id) ?? templateDefinitions[0];
}
