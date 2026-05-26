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
    <div style={{ marginTop: "10px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>
      {filled.map((s, i) => (
        <React.Fragment key={s.id}>
          {i > 0 ? <span style={{ color: light, margin: "0 6px" }}>·</span> : null}
          <a href={resolveUrlForHtml(s.url)} style={{ color, textDecoration: "none" }}>{s.platform.toUpperCase()}</a>
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
        letterSpacing: "0.04em",
      }}>
        <a href={doc.cta.url} style={{ color: "#ffffff", textDecoration: "none" }}>
          {doc.cta.text.toUpperCase()}
        </a>
      </td></tr></tbody>
    </table>
  );
}

function watermark() {
  return (
    <div style={{ marginTop: "10px", fontSize: "12px" }}>
      <a href="https://siggy.app" style={{ color: "#64748b", textDecoration: "none", fontWeight: 600 }}>
        Made with Siggy
      </a>
    </div>
  );
}

// ━━━ UNDERLINE HIGHLIGHT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Split-color name with a soft accent underline and compact contact rows.
function edge(doc: SignatureDocument, ctx: TemplateRenderContext) {
  const { first, last } = splitName(doc.fullName);
  const nameFontFamily = resolveNameFontFamily(doc.fontFamily);
  const socialBlock = socials(doc, ctx.accentColor);

  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, color: dark, minWidth: "420px" }}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: "top" }}>
            {ctx.nameImageUrl && ctx.nameImageWidth && ctx.nameImageHeight ? (
              <img alt={doc.fullName} src={ctx.nameImageUrl} width={ctx.nameImageWidth} height={ctx.nameImageHeight} style={{ display: "block" }} />
            ) : (
              <div style={{ display: "inline-block", ...(nameFontFamily ? { fontFamily: nameFontFamily } : {}) }}>
                <div style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.06em", lineHeight: "1" }}>
                  <span style={{ color: dark }}>{first}</span>
                  {last ? <> <span style={{ color: ctx.accentColor }}>{last}</span></> : null}
                </div>
                <div style={{ height: "8px", backgroundColor: ctx.accentColor, opacity: 0.22, borderRadius: "2px", marginTop: "-6px", width: "100%" }} />
              </div>
            )}
            <div style={{ marginTop: "8px", fontSize: "13px", color: mid }}>
              <span style={{ color: dark, fontSize: "12px", fontWeight: 800, letterSpacing: "0.06em" }}>{doc.jobTitle.toUpperCase()}</span>
              <span style={{ color: light, margin: "0 6px" }}>·</span>
              <span>{doc.company}</span>
            </div>
            <div style={{ height: "1px", background: rule, margin: "8px 0 9px", width: "100%" }} />
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "top" }}>
                    <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, fontSize: "13px", color: mid }}>
                      <tbody>
                        {doc.email ? <tr><td style={{ paddingRight: "8px", color: light, fontSize: "13px" }}>✉</td><td style={{ paddingBottom: "3px" }}>{link(`mailto:${doc.email}`, doc.email, ctx.accentColor)}</td></tr> : null}
                        {doc.phone ? <tr><td style={{ paddingRight: "8px", color: light, fontSize: "13px" }}>☏</td><td style={{ paddingBottom: "3px" }}>{doc.phone}</td></tr> : null}
                        {doc.website ? <tr><td style={{ paddingRight: "8px", color: light, fontSize: "13px" }}>⊕</td><td>{link(resolveUrlForHtml(doc.website), doc.website.replace(/^https?:\/\//i, ""), ctx.accentColor)}</td></tr> : null}
                      </tbody>
                    </table>
                  </td>
                  {socialBlock ? <td style={{ verticalAlign: "bottom", textAlign: "right" as const, paddingLeft: "24px" }}>{socialBlock}</td> : null}
                </tr>
              </tbody>
            </table>
            {ctaButton(doc, ctx.accentColor)}
            {ctx.unlocked ? null : watermark()}
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
      <div style={{ fontSize: "38px", fontWeight: 900, letterSpacing: "-0.06em", lineHeight: "0.84", ...(nameFontFamily ? { fontFamily: nameFontFamily } : {}) }}>
        <span style={{ color: dark }}>{firstName.toUpperCase()}</span>
        {lastName ? <><br /><span style={{ color: ctx.accentColor }}>{lastName.toUpperCase()}</span></> : null}
      </div>
    );

  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, color: dark, width: "100%" }}>
      <tbody>
        <tr>
          <td colSpan={2} style={{ paddingBottom: "4px" }}>
            {nameElement}
            <div style={{ height: "3px", background: ctx.accentColor, width: "100%", margin: "5px 0 0", borderRadius: "2px" }} />
          </td>
        </tr>
        <tr>
          <td style={{ verticalAlign: "top", paddingTop: "8px", paddingRight: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.06em", color: dark }}>{doc.jobTitle.toUpperCase()}</div>
            <div style={{ fontSize: "13px", color: mid, marginTop: "2px" }}>{doc.company}</div>
            {socials(doc, ctx.accentColor)}
            {ctaButton(doc, ctx.accentColor)}
          </td>
          <td style={{ verticalAlign: "top", paddingTop: "8px", borderLeft: `1px solid ${rule}`, paddingLeft: "24px" }}>
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
// Large tinted visual panel with an anchored photo and clean details.
function card(doc: SignatureDocument, ctx: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, color: dark }}>
      <tbody>
        <tr>
          <td style={{ background: "#f4f4f8", borderRadius: "12px", padding: "34px 28px", verticalAlign: "middle", textAlign: "center" as const }}>
            {photo(ctx.imageUrl, doc, 94, "14px")}
          </td>
          <td style={{ padding: "20px 0 20px 28px", verticalAlign: "top", minWidth: "360px" }}>
            {nameImg(doc, ctx, { fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em", color: ctx.accentColor })}
            <div style={{ fontSize: "14px", color: dark, marginTop: "2px" }}>{doc.jobTitle} <span style={{ color: light }}>·</span> {doc.company}</div>
            <div style={{ height: "1px", background: rule, margin: "14px 0", width: "100%" }} />
            <div style={{ fontSize: "13px", color: dark, lineHeight: "20px" }}>
              {link(`mailto:${doc.email}`, doc.email, ctx.accentColor)}
              {doc.phone ? <> <span style={{ color: light, margin: "0 10px" }}>|</span> {doc.phone}</> : null}
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
// Pure text, accent name, compact separators.
function clean(doc: SignatureDocument, ctx: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontFamily: font, color: dark }}>
      <tbody>
        <tr>
          <td>
            {nameImg(doc, ctx, { fontSize: "20px", fontWeight: 800, color: ctx.accentColor })}
            <div style={{ fontSize: "14px", color: dark, marginTop: "2px" }}>{doc.jobTitle}, {doc.company}</div>
            <div style={{ marginTop: "16px", fontSize: "13px", color: dark, lineHeight: "1.7" }}>
              <a href={`mailto:${doc.email}`} style={{ color: dark, textDecoration: "none" }}>{doc.email}</a>
              {doc.phone ? <> <span style={{ color: "#d1d5db", margin: "0 8px" }}>·</span> <span style={{ color: dark }}>{doc.phone}</span></> : null}
              {doc.website ? <> <span style={{ color: "#d1d5db", margin: "0 8px" }}>·</span> <a href={resolveUrlForHtml(doc.website)} style={{ color: dark, textDecoration: "none" }}>{doc.website.replace(/^https?:\/\//i, "")}</a></> : null}
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
  { id: "bold", name: "Bold", description: "Massive split-color name as hero.", headline: "Maximum typographic impact.", supportsImage: false, render: bold },
  { id: "edge", name: "Underline", description: "Soft highlight underline with compact icon contacts.", headline: "Personality without bulk.", supportsImage: false, render: edge },
  { id: "card", name: "Card", description: "Visual anchor with a tinted headshot panel.", headline: "Structured and memorable.", supportsImage: true, render: card },
  { id: "clean", name: "Minimal", description: "Pure text, accent name, zero chrome.", headline: "Quiet and portable.", supportsImage: false, render: clean },
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
