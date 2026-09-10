import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultDocument } from "../lib/default-document";
import { prepareSignatureOutput } from "../lib/prepare-signature-output";

afterEach(() => vi.unstubAllGlobals());

describe("email-safe signature output", () => {
  it("renders a custom name image before producing HTML for copy or download", async () => {
    const asset = { id: "name", url: "https://example.com/name.png", width: 150, height: 50, alt: "Alex" };
    const result = { html: '<img src="https://example.com/name.png">', plainText: "Alex" };
    const request = vi.fn().mockResolvedValueOnce(Response.json({ asset })).mockResolvedValueOnce(Response.json(result));
    vi.stubGlobal("fetch", request);
    const document = { ...createDefaultDocument(), fontFamily: "outfit" };
    expect(await prepareSignatureOutput(document, "access-token")).toEqual(result);
    expect(request.mock.calls.map(([url]) => url)).toEqual(["/api/render-name", "/api/render"]);
    expect(JSON.parse(request.mock.calls[0][1].body).templateId).toBe(document.templateId);
    const rendered = JSON.parse(request.mock.calls[1][1].body);
    expect(rendered.document.nameImage).toEqual(asset);
    expect(rendered.token).toBe("access-token");
    expect(rendered.profileId).toBe(document.targetProfileId);
  });

  it("clears stale name images when using a system font", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ html: "Georgia" }));
    vi.stubGlobal("fetch", request);
    const document = { ...createDefaultDocument(), fontFamily: "georgia", nameImage: { id: "old", url: "https://example.com/old.png", width: 50, height: 20, alt: "Old name" } };
    await prepareSignatureOutput(document, null);
    expect(request).toHaveBeenCalledTimes(1);
    expect(JSON.parse(request.mock.calls[0][1].body).document.nameImage).toBeNull();
    expect(document.nameImage.id).toBe("old");
  });

  it("does not silently copy or export the wrong font when name rendering fails", async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", request);
    await expect(prepareSignatureOutput({ ...createDefaultDocument(), fontFamily: "outfit" }, null)).rejects.toThrow("name_render_failed");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("reports final HTML rendering failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    await expect(prepareSignatureOutput({ ...createDefaultDocument(), fontFamily: "arial" }, null)).rejects.toThrow("render_failed");
  });
});
