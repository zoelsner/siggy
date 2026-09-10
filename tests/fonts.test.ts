import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function fontFixture() {
  const subsets: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.startsWith("https://fonts.googleapis.com/")) {
      const text = new URL(url).searchParams.get("text") ?? "";
      subsets.push(text);
      return { ok: true, text: async () => `src: url(https://fonts.test/${encodeURIComponent(text)}) format('truetype')` };
    }
    const text = decodeURIComponent(new URL(url).pathname.slice(1));
    return { ok: true, arrayBuffer: async () => new TextEncoder().encode(text).buffer };
  }));
  const { fetchFontData } = await import("@/lib/fonts");
  return { fetchFontData, subsets };
}

describe("font subset cache", () => {
  it("fetches the glyphs for a second name, including accents", async () => {
    const { fetchFontData, subsets } = await fontFixture();
    await fetchFontData("dm-sans", "SARAH CHEN");
    const result = await fetchFontData("dm-sans", "ZOË QUINN");
    expect(subsets).toHaveLength(2);
    const glyphs = new TextDecoder().decode(result.data);
    for (const character of "ZOË QUINN") expect(glyphs).toContain(character);
  });

  it("reuses a subset when the characters match, regardless of order or repetition", async () => {
    const { fetchFontData, subsets } = await fontFixture();
    const first = await fetchFontData("dm-sans", "Anna");
    const second = await fetchFontData("dm-sans", "naAn");
    expect(second.data).toBe(first.data);
    expect(subsets).toHaveLength(1);
  });

  it("bounds cached subsets while keeping recent entries reusable", async () => {
    const { fetchFontData, subsets } = await fontFixture();
    for (let i = 0; i < 65; i++) await fetchFontData("dm-sans", String.fromCodePoint(0x100 + i));
    await fetchFontData("dm-sans", String.fromCodePoint(0x140));
    expect(subsets).toHaveLength(65);
    await fetchFontData("dm-sans", String.fromCodePoint(0x100));
    expect(subsets).toHaveLength(66);
  });
});


it("retries a rejected font weight at 400 and retains the requested glyph subset", async () => {
  const requested: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    requested.push(url);
    if (url.includes("fonts.googleapis.com")) {
      if (url.includes("@900")) return { ok: false };
      return { ok: true, text: async () => "src: url(https://fonts.test/fallback) format('truetype')" };
    }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
  }));
  const { fetchFontData } = await import("@/lib/fonts");
  await fetchFontData("anton", "ZOË", 900);
  expect(requested).toHaveLength(3);
  expect(requested[1]).toContain("@400");
  expect(new URL(requested[1]).searchParams.get("text")).toBe("OZË");
});
