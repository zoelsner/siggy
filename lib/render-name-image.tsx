import React from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { getNamePresentation, renderNameImageContent } from "./template-name";
import type { TemplateId } from "./types";

export function nameFontWeight(fontId: string, requested: number) {
  if (fontId === "anton" || fontId === "instrument-serif") return 400;
  if (["caveat", "libre-baskerville", "jetbrains-mono"].includes(fontId)) return Math.min(requested, 700);
  if (fontId === "bricolage") return Math.min(requested, 800);
  return requested;
}

export async function renderNameImage(
  templateId: TemplateId,
  name: string,
  accentColor: string,
  font: { name: string; data: ArrayBuffer; weight: number },
) {
  const p = getNamePresentation(templateId, name, accentColor);
  const scale = 2;
  // A generous scratch canvas avoids guessed per-character widths clipping
  // wide glyphs. Trim transparent pixels after rasterizing to fit the name.
  const width = Math.ceil(Math.max(p.first.length, p.last.length, 1) * p.fontSize * scale * 2 + 64);
  const height = Math.ceil((p.fontSize * p.lines * 1.5 + 32) * scale);
  const svg = await satori(<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>{renderNameImageContent(templateId, name, accentColor, font.name, scale)}</div>, {
    width,
    height,
    fonts: [{ name: font.name, data: font.data, weight: font.weight as 400 | 700 | 800 | 900, style: "normal" }],
  });
  const png = new Resvg(svg).render().asPng();
  const { data, info } = await sharp(png).trim({ threshold: 0 }).png().toBuffer({ resolveWithObject: true });
  return { data, width: Math.ceil(info.width / scale), height: Math.ceil(info.height / scale) };
}
