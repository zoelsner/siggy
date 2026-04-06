export interface FontOption {
  id: string;
  name: string;
  google?: string;
  system?: boolean;
}

export const fontOptions: FontOption[] = [
  { id: "dm-sans", name: "DM Sans", google: "DM+Sans" },
  { id: "montserrat", name: "Montserrat", google: "Montserrat" },
  { id: "plus-jakarta", name: "Plus Jakarta Sans", google: "Plus+Jakarta+Sans" },
  { id: "unbounded", name: "Unbounded", google: "Unbounded" },
  { id: "georgia", name: "Georgia", system: true },
  { id: "arial", name: "Arial", system: true },
];

export function getFontOption(id: string): FontOption {
  return fontOptions.find((f) => f.id === id) ?? fontOptions[0];
}

export function isSystemFont(id: string): boolean {
  return getFontOption(id).system === true;
}

export const fontFamilyMap: Record<string, string> = {
  "dm-sans": "'DM Sans', sans-serif",
  "montserrat": "'Montserrat', sans-serif",
  "plus-jakarta": "'Plus Jakarta Sans', sans-serif",
  "unbounded": "'Unbounded', sans-serif",
  "georgia": "Georgia, 'Times New Roman', serif",
  "arial": "Arial, 'Segoe UI', 'Helvetica Neue', Helvetica, sans-serif",
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
