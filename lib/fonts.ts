export interface FontOption {
  id: string;
  name: string;
  google?: string;
  system?: boolean;
  // Weight to request for name-image rendering. Some Google fonts ship a
  // single 400 weight and the css2 API 400s on any other value.
  nameWeight?: number;
}

export const fontOptions: FontOption[] = [
  // System fonts ship free; Google fonts are part of the paid unlock.
  // Keep a system font first — getFontOption falls back to fontOptions[0],
  // so unknown ids degrade to a free font.
  { id: "georgia", name: "Georgia", system: true },
  { id: "arial", name: "Arial", system: true },
  { id: "dm-sans", name: "DM Sans", google: "DM+Sans" },
  { id: "fraunces", name: "Fraunces", google: "Fraunces" },
  { id: "outfit", name: "Outfit", google: "Outfit" },
  { id: "anton", name: "Anton", google: "Anton", nameWeight: 400 },
  { id: "instrument-serif", name: "Instrument Serif", google: "Instrument+Serif", nameWeight: 400 },
  { id: "libre-baskerville", name: "Libre Baskerville", google: "Libre+Baskerville" },
  { id: "playfair", name: "Playfair Display", google: "Playfair+Display" },
  { id: "bricolage", name: "Bricolage Grotesque", google: "Bricolage+Grotesque" },
  { id: "jetbrains-mono", name: "JetBrains Mono", google: "JetBrains+Mono" },
  { id: "caveat", name: "Caveat", google: "Caveat" },
];

export function getFontOption(id: string): FontOption {
  return fontOptions.find((f) => f.id === id) ?? fontOptions[0];
}

export function isSystemFont(id: string): boolean {
  return getFontOption(id).system === true;
}

// What free-tier renders fall back to when a document carries a pro font.
export const DEFAULT_FREE_FONT = "georgia";

export function getNameImageWeight(id: string): number {
  return getFontOption(id).nameWeight ?? 700;
}

export const fontFamilyMap: Record<string, string> = {
  "georgia": "Georgia, 'Times New Roman', serif",
  "arial": "Arial, Helvetica, sans-serif",
  "dm-sans": "'DM Sans', sans-serif",
  "fraunces": "'Fraunces', 'Times New Roman', serif",
  "outfit": "'Outfit', sans-serif",
  "anton": "'Anton', 'Arial Narrow', 'Impact', sans-serif",
  "instrument-serif": "'Instrument Serif', Georgia, serif",
  "libre-baskerville": "'Libre Baskerville', Georgia, serif",
  "playfair": "'Playfair Display', Georgia, serif",
  "bricolage": "'Bricolage Grotesque', sans-serif",
  "jetbrains-mono": "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  "caveat": "'Caveat', cursive",
};

// Module-level cache for font buffers
const fontCache = new Map<string, ArrayBuffer>();

export async function fetchFontData(
  fontId: string,
  text: string,
  weight: number = 700
): Promise<{ data: ArrayBuffer; name: string }> {
  const font = getFontOption(fontId);

  if (font.system) {
    throw new Error(`System font "${font.name}" does not need rendering`);
  }

  const cacheKey = `${fontId}:${weight}`;
  const cached = fontCache.get(cacheKey);
  if (cached) {
    return { data: cached, name: font.name };
  }

  // Fetch Google Fonts CSS with non-browser user-agent to get TTF URL
  async function fetchTtfUrl(wght: number): Promise<string | null> {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${font.google}:wght@${wght}&text=${encodeURIComponent(text)}`;
    const cssResponse = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/4.0" }, // non-modern UA → returns TTF
    });
    if (!cssResponse.ok) return null;
    const css = await cssResponse.text();
    return css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1] ?? null;
  }

  // Single-weight fonts 400 on any other requested weight — retry at 400
  // rather than silently losing the font on copy.
  const ttfUrl = (await fetchTtfUrl(weight)) ?? (weight !== 400 ? await fetchTtfUrl(400) : null);
  if (!ttfUrl) {
    throw new Error(`Could not extract font URL for ${font.name}`);
  }

  const fontResponse = await fetch(ttfUrl);
  if (!fontResponse.ok) {
    throw new Error(`Failed to fetch font file for ${font.name}`);
  }

  const data = await fontResponse.arrayBuffer();
  fontCache.set(cacheKey, data);

  return { data, name: font.name };
}
