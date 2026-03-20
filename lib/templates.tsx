import React from "react";

import { getFilledSocials, resolveUrlForHtml } from "./document";
import type { SignatureDocument, TemplateDefinition, TemplateId, TemplateRenderContext } from "./types";

const textColor = "#0f172a";
const mutedColor = "#475569";
const borderColor = "#dbe4f0";

function linkStyle(accentColor: string): React.CSSProperties {
  return {
    color: accentColor,
    textDecoration: "none"
  };
}

function tableStyle(): React.CSSProperties {
  return {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily:
      "Arial, 'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif",
    color: textColor
  };
}

function imageBlock(imageUrl: string | null, document: SignatureDocument) {
  if (!imageUrl) {
    return (
      <div
        style={{
          width: "96px",
          height: "96px",
          borderRadius: "24px",
          backgroundColor: document.accentColor,
          color: "#ffffff",
          fontSize: "28px",
          fontWeight: 700,
          lineHeight: "96px",
          textAlign: "center"
        }}
      >
        {document.fullName
          .split(" ")
          .slice(0, 2)
          .map((chunk) => chunk.charAt(0))
          .join("")
          .toUpperCase()}
      </div>
    );
  }

  return (
    <img
      alt={document.image?.alt ?? `${document.fullName} headshot`}
      height={document.image?.height ?? 96}
      src={imageUrl}
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: "24px",
        display: "block"
      }}
      width={document.image?.width ?? 96}
    />
  );
}

function detailsBlock(document: SignatureDocument, accentColor: string) {
  return (
    <>
      <div style={{ color: textColor, fontSize: "22px", fontWeight: 700, lineHeight: "28px" }}>
        {document.fullName}
      </div>
      <div style={{ color: mutedColor, fontSize: "14px", lineHeight: "20px", marginTop: "4px" }}>
        {document.jobTitle}
        {document.company ? ` · ${document.company}` : ""}
      </div>
      <div
        style={{
          backgroundColor: accentColor,
          height: "2px",
          margin: "12px 0 14px",
          width: "72px"
        }}
      />
      <div style={{ color: mutedColor, fontSize: "13px", lineHeight: "22px" }}>
        {document.phone ? <div>{document.phone}</div> : null}
        {document.email ? (
          <div>
            <a href={`mailto:${document.email}`} style={linkStyle(accentColor)}>
              {document.email}
            </a>
          </div>
        ) : null}
        {document.website ? (
          <div>
            <a href={resolveUrlForHtml(document.website)} style={linkStyle(accentColor)}>
              {document.website.replace(/^https?:\/\//i, "")}
            </a>
          </div>
        ) : null}
      </div>
      {getFilledSocials(document).length > 0 ? (
        <div style={{ marginTop: "12px" }}>
          {getFilledSocials(document).map((social) => (
            <span
              key={social.id}
              style={{
                border: `1px solid ${borderColor}`,
                borderRadius: "999px",
                color: mutedColor,
                display: "inline-block",
                fontSize: "11px",
                lineHeight: "18px",
                marginRight: "6px",
                marginTop: "6px",
                padding: "2px 10px"
              }}
            >
              <a href={resolveUrlForHtml(social.url)} style={linkStyle(accentColor)}>
                {social.platform.toUpperCase()}
              </a>
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

function studioSplit(document: SignatureDocument, context: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={tableStyle()}>
      <tbody>
        <tr>
          <td style={{ paddingRight: "18px", verticalAlign: "top", width: "112px" }}>
            {imageBlock(context.imageUrl, document)}
          </td>
          <td style={{ verticalAlign: "top" }}>{detailsBlock(document, context.accentColor)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function monoStack(document: SignatureDocument, context: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={tableStyle()}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: "top" }}>
            <div style={{ color: textColor, fontSize: "24px", fontWeight: 700 }}>{document.fullName}</div>
            <div style={{ color: mutedColor, fontSize: "14px", marginTop: "4px" }}>
              {document.jobTitle}
            </div>
            <div style={{ color: mutedColor, fontSize: "14px" }}>{document.company}</div>
            <div style={{ color: context.accentColor, fontSize: "12px", marginTop: "12px" }}>
              {document.email} · {document.phone}
            </div>
            <div style={{ color: mutedColor, fontSize: "12px", marginTop: "8px" }}>
              {getFilledSocials(document).map((social, index) => (
                <React.Fragment key={social.id}>
                  {index > 0 ? " · " : ""}
                  <a href={resolveUrlForHtml(social.url)} style={linkStyle(context.accentColor)}>
                    {social.platform}
                  </a>
                </React.Fragment>
              ))}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function accentColumn(document: SignatureDocument, context: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={tableStyle()}>
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: context.accentColor,
              width: "8px"
            }}
          />
          <td style={{ paddingLeft: "16px", verticalAlign: "top" }}>
            {detailsBlock(document, context.accentColor)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function compactRow(document: SignatureDocument, context: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={tableStyle()}>
      <tbody>
        <tr>
          <td style={{ paddingRight: "14px", verticalAlign: "middle", width: "72px" }}>
            {imageBlock(context.imageUrl, {
              ...document,
              image: document.image
                ? {
                    ...document.image,
                    width: 56,
                    height: 56
                  }
                : null
            })}
          </td>
          <td style={{ verticalAlign: "middle" }}>
            <div style={{ color: textColor, fontSize: "18px", fontWeight: 700 }}>{document.fullName}</div>
            <div style={{ color: mutedColor, fontSize: "13px", marginTop: "2px" }}>
              {document.jobTitle}
              {document.company ? ` · ${document.company}` : ""}
            </div>
            <div style={{ color: mutedColor, fontSize: "12px", marginTop: "8px" }}>
              <a href={`mailto:${document.email}`} style={linkStyle(context.accentColor)}>
                {document.email}
              </a>
              {document.phone ? ` · ${document.phone}` : ""}
              {document.website ? (
                <>
                  {" · "}
                  <a href={resolveUrlForHtml(document.website)} style={linkStyle(context.accentColor)}>
                    {document.website.replace(/^https?:\/\//i, "")}
                  </a>
                </>
              ) : null}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function executiveCard(document: SignatureDocument, context: TemplateRenderContext) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{
        ...tableStyle(),
        border: `1px solid ${borderColor}`,
        borderRadius: "20px",
        overflow: "hidden"
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: "#f8fafc",
              padding: "20px",
              verticalAlign: "top",
              width: "140px"
            }}
          >
            {imageBlock(context.imageUrl, document)}
          </td>
          <td style={{ padding: "20px", verticalAlign: "top" }}>
            {detailsBlock(document, context.accentColor)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function minimalRail(document: SignatureDocument, context: TemplateRenderContext) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={tableStyle()}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: "top" }}>
            <div style={{ color: textColor, fontSize: "20px", fontWeight: 700 }}>{document.fullName}</div>
            <div style={{ color: mutedColor, fontSize: "13px", lineHeight: "20px", marginTop: "4px" }}>
              {document.jobTitle}
            </div>
            <div style={{ color: mutedColor, fontSize: "13px", lineHeight: "20px" }}>{document.company}</div>
          </td>
          <td
            style={{
              borderLeft: `1px solid ${borderColor}`,
              paddingLeft: "18px",
              verticalAlign: "top",
              width: "220px"
            }}
          >
            <div style={{ color: mutedColor, fontSize: "12px", lineHeight: "20px" }}>
              <a href={`mailto:${document.email}`} style={linkStyle(context.accentColor)}>
                {document.email}
              </a>
            </div>
            <div style={{ color: mutedColor, fontSize: "12px", lineHeight: "20px" }}>{document.phone}</div>
            <div style={{ color: mutedColor, fontSize: "12px", lineHeight: "20px" }}>
              <a href={resolveUrlForHtml(document.website)} style={linkStyle(context.accentColor)}>
                {document.website.replace(/^https?:\/\//i, "")}
              </a>
            </div>
            <div style={{ color: mutedColor, fontSize: "12px", lineHeight: "20px", marginTop: "6px" }}>
              {getFilledSocials(document).map((social, index) => (
                <React.Fragment key={social.id}>
                  {index > 0 ? " · " : ""}
                  <a href={resolveUrlForHtml(social.url)} style={linkStyle(context.accentColor)}>
                    {social.platform}
                  </a>
                </React.Fragment>
              ))}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export const templateDefinitions: TemplateDefinition[] = [
  {
    id: "studio-split",
    name: "Studio Split",
    description: "Balanced image and content columns.",
    headline: "Polished default for founder and creative roles.",
    supportsImage: true,
    render: studioSplit
  },
  {
    id: "mono-stack",
    name: "Mono Stack",
    description: "Text-heavy with lightweight social links.",
    headline: "Fastest to scan and safest for size budgets.",
    supportsImage: false,
    render: monoStack
  },
  {
    id: "accent-column",
    name: "Accent Column",
    description: "Vertical accent bar for stronger brand signal.",
    headline: "A little bolder without relying on fragile layout.",
    supportsImage: false,
    render: accentColumn
  },
  {
    id: "compact-row",
    name: "Compact Row",
    description: "Tighter footprint for high-volume email senders.",
    headline: "Optimized for frequent senders who want less visual weight.",
    supportsImage: true,
    render: compactRow
  },
  {
    id: "executive-card",
    name: "Executive Card",
    description: "Framed layout with a clear profile anchor.",
    headline: "Most presentation-forward option for client-facing roles.",
    supportsImage: true,
    render: executiveCard
  },
  {
    id: "minimal-rail",
    name: "Minimal Rail",
    description: "Two-column text layout without heavy decoration.",
    headline: "Portable and low-risk for future Outlook expansion.",
    supportsImage: false,
    render: minimalRail
  }
];

export function getTemplateDefinition(id: TemplateId): TemplateDefinition {
  return templateDefinitions.find((template) => template.id === id) ?? templateDefinitions[0];
}
