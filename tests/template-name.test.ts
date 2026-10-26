import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getNamePresentation, renderNameImageContent } from "../lib/template-name";
import { nameFontWeight, renderNameImage, UnsupportedNameGlyphsError, NameImageSizeError } from "../lib/render-name-image";
import type { TemplateId } from "../lib/types";

const accent = "#4f46e5";
describe("template-specific exported names", () => {
  it("keeps Underline's translucent accent bar in the actual exported PNG", async () => {
    const bytes = readFileSync(resolve("node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf"));
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const image = await renderNameImage("edge", "Alex Morgan", accent, { name: "Noto Sans", data, weight: 400 });
    const { data: pixels, info } = await sharp(image.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let widestAccentRow = 0;
    for (let y = 0; y < info.height; y++) {
      let accentPixels = 0;
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        // Raster alpha premultiplication can round RGB by a few levels.
        const translucentAccent = Math.abs(pixels[i] - 79) <= 3 && Math.abs(pixels[i + 1] - 70) <= 3 && Math.abs(pixels[i + 2] - 229) <= 3 && pixels[i + 3] >= 50 && pixels[i + 3] <= 62;
        if (translucentAccent) accentPixels++;
      }
      // Descenders can cross the highlight; measure total row coverage.
      widestAccentRow = Math.max(widestAccentRow, accentPixels);
    }
    if (process.env.SIGGY_SAVE_RASTER_EVIDENCE === "1") {
      mkdirSync("test-results", { recursive: true });
      writeFileSync("test-results/underline-export.png", image.data);
    }
    expect(widestAccentRow).toBeGreaterThan(info.width * 0.9);
  });
  it("rejects missing font glyphs and excessive image dimensions before upload", async () => {
    const bytes = readFileSync(resolve("node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf"));
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const font = { name: "Noto Sans", data, weight: 400 };
    await expect(renderNameImage("clean", "李 明", accent, font)).rejects.toBeInstanceOf(UnsupportedNameGlyphsError);
    await expect(renderNameImage("bold", "W".repeat(70), accent, font)).rejects.toBeInstanceOf(NameImageSizeError);
  });
  it("rejects raw name complexity before parsing a font or allocating a raster", async () => {
    await expect(renderNameImage("edge", "a" + "\u0301".repeat(10_000), accent, {
      name: "unread fixture", data: new ArrayBuffer(0), weight: 400,
    })).rejects.toThrow("too complex");
  });
  it.each([ ["bold", 38, 900, 2], ["edge", 26, 800, 1], ["card", 24, 800, 1], ["clean", 20, 800, 1] ] as const)("preserves %s typography", (id, size, weight, lines) => {
    const p = getNamePresentation(id, "Alex Morgan", accent);
    expect(p).toMatchObject({ fontSize: size, fontWeight: weight, lines });
    const html = renderToStaticMarkup(renderNameImageContent(id, "Alex Morgan", accent, "Example"));
    expect(html).toContain(`font-size:${size}px`);
    expect(html).toContain(accent);
    if (id === "bold") {
      expect(html).toContain("ALEX"); expect(html).toContain("MORGAN");
      expect(p.firstColor).toBe("#0f172a");
    } else if (id === "edge") {
      expect(html).toContain("opacity:0.22"); expect(p.firstColor).toBe("#0f172a");
    } else expect(p.first).toBe("Alex Morgan");
  });

  it("does not create an empty second line for a single name", () => {
    expect(getNamePresentation("bold", "Alex", accent)).toMatchObject({ first: "ALEX", last: "", lines: 1 });
  });

  it("uses available weights for regular-only and limited-weight fonts", () => {
    expect(nameFontWeight("anton", 900)).toBe(400);
    expect(nameFontWeight("instrument-serif", 800)).toBe(400);
    expect(nameFontWeight("caveat", 900)).toBe(700);
    expect(nameFontWeight("libre-baskerville", 800)).toBe(700);
    expect(nameFontWeight("jetbrains-mono", 900)).toBe(700);
    expect(nameFontWeight("bricolage", 900)).toBe(800);
    expect(nameFontWeight("outfit", 900)).toBe(900);
  });

  it("rasterizes all four treatments with tight retina dimensions and both split colors", async () => {
    const bytes = readFileSync(resolve("node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf"));
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const dimensions: Record<string, {width: number; height: number}> = {};
    for (const id of ["bold", "edge", "card", "clean"] as TemplateId[]) {
      const image = await renderNameImage(id, "Alex Morgan", accent, { name: "Noto Sans", data, weight: 400 });
      const metadata = await sharp(image.data).metadata();
      expect(image.width).toBe(Math.ceil(metadata.width! / 2));
      expect(image.height).toBe(Math.ceil(metadata.height! / 2));
      expect(image.width).toBeGreaterThan(40);
      expect(image.width).toBeLessThan(300);
      expect(image.height).toBeGreaterThan(10);
      expect(image.height).toBeLessThan(100);
      dimensions[id] = image;
      const pixels = await sharp(image.data).ensureAlpha().raw().toBuffer();
      let dark = false, purple = false;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] < 200) continue;
        dark ||= pixels[i] === 15 && pixels[i + 1] === 23 && pixels[i + 2] === 42;
        purple ||= pixels[i] === 79 && pixels[i + 1] === 70 && pixels[i + 2] === 229;
      }
      expect(purple).toBe(true);
      expect(dark).toBe(id === "bold" || id === "edge");
    }
    expect(dimensions.bold.height).toBeGreaterThan(dimensions.edge.height);
    expect(dimensions.card.height).toBeGreaterThan(dimensions.clean.height);
  });
});
