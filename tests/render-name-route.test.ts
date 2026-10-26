import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/fonts", () => ({
  isSystemFont: () => false,
  fetchFontData: vi.fn().mockResolvedValue({ name: "Test Font", data: new ArrayBuffer(0) }),
}));
vi.mock("@/lib/render-name-image", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/render-name-image")>();
  return { ...original, renderNameImage: vi.fn().mockResolvedValue({ data: Buffer.from("png"), width: 130, height: 60 }) };
});
vi.mock("@/lib/runtime", () => ({ saveAsset: vi.fn().mockResolvedValue({ url: "https://example.com/name.png" }) }));

import { POST } from "@/app/api/render-name/route";
import { fetchFontData } from "@/lib/fonts";
import { saveAsset } from "@/lib/runtime";
import { renderNameImage } from "@/lib/render-name-image";

beforeEach(() => vi.clearAllMocks());
describe("name image API", () => {
  it("rejects a combining-mark-heavy single grapheme before font, raster or upload work", async () => {
    const name = "a" + "\u0301".repeat(10_000);
    const response = await POST(new Request("http://localhost/api/render-name", { method: "POST", body: JSON.stringify({ name, fontFamily: "outfit", templateId: "edge" }) }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("too complex");
    expect(fetchFontData).not.toHaveBeenCalled();
    expect(renderNameImage).not.toHaveBeenCalled();
    expect(saveAsset).not.toHaveBeenCalled();
  });
  it("requests the displayed uppercase glyphs and retains generated dimensions", async () => {
    const response = await POST(new Request("http://localhost/api/render-name", { method: "POST", body: JSON.stringify({ name: "Alex Morgan", fontFamily: "outfit", accentColor: "#4f46e5", templateId: "bold" }) }));
    expect(response.status).toBe(200);
    expect(fetchFontData).toHaveBeenCalledWith("outfit", "ALEX MORGAN", 900);
    expect(renderNameImage).toHaveBeenCalledWith("bold", "Alex Morgan", "#4f46e5", expect.objectContaining({ weight: 900 }));
    expect(saveAsset).toHaveBeenCalledWith(expect.any(String), expect.any(Buffer), expect.objectContaining({ width: 130, height: 60 }));
  });
  it("rejects invalid templates before font downloads or uploads", async () => {
    const response = await POST(new Request("http://localhost/api/render-name", { method: "POST", body: JSON.stringify({ name: "Alex", fontFamily: "outfit", templateId: "missing" }) }));
    expect(response.status).toBe(400);
    expect(fetchFontData).not.toHaveBeenCalled();
    expect(saveAsset).not.toHaveBeenCalled();
  });
});
