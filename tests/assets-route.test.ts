import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("@/lib/runtime", () => ({ saveAsset: vi.fn().mockImplementation(async (id, _data, meta) => ({ id, url: "https://example.com/offline-headshot", ...meta })) }));
import { POST } from "@/app/api/assets/route";
import { saveAsset } from "@/lib/runtime";
import { normalizeHeadshot } from "@/lib/upload-image";

function upload(bytes: Buffer, type = "image/png") {
  const data = new FormData();
  data.set("file", new File([Uint8Array.from(bytes)], "offline-headshot", { type }));
  data.set("alt", "Synthetic audit headshot");
  return new Request("http://localhost/api/assets", { method: "POST", body: data });
}
beforeEach(() => vi.clearAllMocks());

describe("headshot upload decoder boundary", () => {
  it.each(["png", "jpeg", "webp"] as const)("preserves normal %s headshots as 128px raster assets", async format => {
    const input = await sharp({ create: { width: 24, height: 32, channels: 4, background: { r: 80, g: 100, b: 180, alpha: 0.7 } } })[format]().toBuffer();
    const response = await POST(upload(input, `image/${format}`));
    expect(response.status).toBe(200);
    expect((await response.json()).asset).toMatchObject({ width: 128, height: 128, alt: "Synthetic audit headshot" });
    expect(saveAsset).toHaveBeenCalledTimes(1);
    const result = await sharp(vi.mocked(saveAsset).mock.calls[0][1]).metadata();
    expect(result).toMatchObject({ width: 128, height: 128 });
    expect(["png", "jpeg"]).toContain(result.format);
  });
  it("rejects harmless SVG mislabeled as PNG before asset storage", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    expect((await POST(upload(svg))).status).toBe(400);
    expect(saveAsset).not.toHaveBeenCalled();
    // The native layer is independently blocked, even if format sniffing is bypassed.
    await expect(sharp(svg).metadata()).rejects.toThrow();
  });
  it.each([Buffer.from("GIF89a"), Buffer.from("not an image"), Buffer.from([255, 216, 255, 0])])("returns 400 for unsupported or corrupt bytes", async bytes => {
    expect((await POST(upload(bytes))).status).toBe(400);
    expect(saveAsset).not.toHaveBeenCalled();
  });
  it("rejects excessive PNG pixel claims before native metadata parsing", async () => {
    const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "white" } }).png().toBuffer();
    const oversized = Buffer.from(png);
    oversized.writeUInt32BE(8193, 16);
    await expect(normalizeHeadshot(oversized)).rejects.toThrow("16 megapixels");
    expect((await POST(upload(oversized))).status).toBe(400);
    expect(saveAsset).not.toHaveBeenCalled();
  });
  it("returns 400 for invalid multipart input", async () => {
    const response = await POST(new Request("http://localhost/api/assets", { method: "POST", body: "invalid multipart" }));
    expect(response.status).toBe(400);
    expect(saveAsset).not.toHaveBeenCalled();
  });
});
