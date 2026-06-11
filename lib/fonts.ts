export interface FontOption {
  id: string;
  name: string;
  google?: string;
  system?: boolean;
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
  { id: "anton", name: "Anton", google: "Anton" },
  { id: "instrument-serif", name: "Instrument Serif", google: "Instrument+Serif" },
  { id: "space-grotesk", name: "Space Grotesk", google: "Space+Grotesk" },
  { id: "playfair", name: "Playfair Display", google: "Playfair+Display" },
  { id: "bricolage", name: "Bricolage Grotesque", google: "Bricolage+Grotesque" },
  { id: "jetbrains-mono", name: "JetBrains Mono", google: "JetBrains+Mono" },
];

export function getFontOption(id: string): FontOption {
  return fontOptions.find((f) => f.id === id) ?? fontOptions[0];
}

export function isSystemFont(id: string): boolean {
  return getFontOption(id).system === true;
}

// What free-tier renders fall back to when a document carries a pro font.
export const DEFAULT_FREE_FONT = "georgia";

export const fontFamilyMap: Record<string, string> = {
  "georgia": "Georgia, 'Times New Roman', serif",
  "arial": "Arial, Helvetica, sans-serif",
  "dm-sans": "'DM Sans', sans-serif",
  "fraunces": "'Fraunces', 'Times New Roman', serif",
  "outfit": "'Outfit', sans-serif",
  "anton": "'Anton', 'Arial Narrow', 'Impact', sans-serif",
  "instrument-serif": "'Instrument Serif', Georgia, serif",
  "space-grotesk": "'Space Grotesk', sans-serif",
  "playfair": "'Playfair Display', Georgia, serif",
  "bricolage": "'Bricolage Grotesque', sans-serif",
  "jetbrains-mono": "'JetBrains Mono', 'SF Mono', Consolas, monospace",
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
  const cssUrl = `https://fonts.googleapis.com/css2?family=${font.google}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const cssResponse = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/4.0" }, // non-modern UA → returns TTF
  });
  const css = await cssResponse.text();

  const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!match) {
    throw new Error(`Could not extract font URL for ${font.name}`);
  }

  const fontResponse = await fetch(match[1]);
  if (!fontResponse.ok) {
    throw new Error(`Failed to fetch font file for ${font.name}`);
  }

  const data = await fontResponse.arrayBuffer();
  fontCache.set(cacheKey, data);

  return { data, name: font.name };
}
