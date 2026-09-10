import React from "react";
import type { TemplateId } from "./types";

export function splitName(name: string) {
  const parts = name.split(" ");
  return { first: parts.slice(0, -1).join(" ") || parts[0], last: parts.length > 1 ? parts[parts.length - 1] : "" };
}

// Shared by the live template and its email-compatible name image.
export function getNamePresentation(template: TemplateId, name: string, accentColor: string) {
  const { first, last } = splitName(name);
  const split = template === "bold" || template === "edge";
  const lines = template === "bold" && last ? 2 : 1;
  return {
    fontSize: template === "bold" ? 38 : template === "edge" ? 26 : template === "card" ? 24 : 20,
    fontWeight: template === "bold" ? 900 : 800,
    letterSpacing: template === "bold" || template === "edge" ? "-0.06em" : template === "card" ? "-0.02em" : undefined,
    lineHeight: template === "bold" ? 0.84 : template === "edge" ? 1 : 1.2,
    lines,
    first: template === "bold" ? first.toUpperCase() : split ? first : name,
    last: split ? (template === "bold" ? last.toUpperCase() : last) : "",
    firstColor: split ? "#0f172a" : accentColor,
    lastColor: accentColor,
    underline: template === "edge",
  };
}

export function renderNameImageContent(template: TemplateId, name: string, accentColor: string, fontFamily: string, scale = 1) {
  const p = getNamePresentation(template, name, accentColor);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", fontFamily, fontSize: p.fontSize * scale, fontWeight: p.fontWeight, ...(p.letterSpacing ? { letterSpacing: p.letterSpacing } : {}), lineHeight: p.lineHeight, padding: 8 * scale }}>
      <div style={{ display: "flex", flexDirection: p.lines === 2 ? "column" : "row", whiteSpace: "pre", flexShrink: 0 }}>
        <span style={{ color: p.firstColor }}>{p.first}</span>
        {p.last ? <span style={{ color: p.lastColor }}>{p.lines === 2 ? p.last : ` ${p.last}`}</span> : null}
      </div>
      {p.underline ? <div style={{ height: 8 * scale, backgroundColor: accentColor, opacity: 0.22, borderRadius: 2 * scale, marginTop: -6 * scale, width: "100%" }} /> : null}
    </div>
  );
}
