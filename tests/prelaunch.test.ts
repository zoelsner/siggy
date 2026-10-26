import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createDefaultDocument } from "@/lib/default-document";
import { coerceSignatureDocument, normalizeSignatureForOutput, resolveUrlForHtml } from "@/lib/document";
import { createBrowserDraftAdapter } from "@/lib/persistence";
import { prepareSignatureOutput } from "@/lib/prepare-signature-output";
import { characterCount, validateSignatureDocument } from "@/lib/validation";
import { renderSignature } from "@/lib/render";
import { POST as render } from "@/app/api/render/route";
import { POST as verifyToken } from "@/app/api/billing/verify-token/route";
import { POST as verifySession } from "@/app/api/billing/verify-session/route";

afterEach(() => vi.unstubAllGlobals());

describe("prelaunch input and export regression coverage", () => {
  it("preserves existing long or invalid drafts exactly and reports actionable limits", () => {
    const draft = { ...createDefaultDocument(), fullName: "Alexandria Example ".repeat(10).trim(),
      jobTitle: "Senior Product & Brand Design Consultant ".repeat(4).trim(),
      company: "Example Creative Strategy Studio ".repeat(5).trim(), email: "not-an-email", website: "https://" };
    vi.stubGlobal("window", { localStorage: { getItem: () => JSON.stringify(draft) } });
    expect(createBrowserDraftAdapter().load()).toEqual(draft);
    expect(coerceSignatureDocument(draft)).toEqual(draft);
    const issues = validateSignatureDocument(draft);
    expect(issues.map(issue => issue.field)).toEqual(expect.arrayContaining(["fullName", "jobTitle", "company", "email", "website"]));
    expect(issues.find(issue => issue.field === "fullName")?.message).toContain("80 characters");
  });
  it.each(["javascript:alert(1)", "https://", "https://example .com", "ftp://example.com", "https://user:password@example.com"])("rejects invalid contact destinations: %s", website => {
    expect(resolveUrlForHtml(website)).toBe("");
    expect(validateSignatureDocument({ ...createDefaultDocument(), website })).toEqual(expect.arrayContaining([expect.objectContaining({ field: "website", severity: "error" })]));
  });
  it("accepts plus addresses, bare domains, social handles, and query parameters", () => {
    const doc = { ...createDefaultDocument(), email: "alex+work@example.com", website: "example.com/?a=1&b=2", socials: [
      { id: "x", platform: "x" as const, url: "@alex_audit" },
      { id: "linkedin", platform: "linkedin" as const, url: "in/alex-audit" },
    ], cta: { text: "Book a call", url: "https://example.com/?source=siggy&lang=en" } };
    expect(validateSignatureDocument(doc)).toEqual([]);
    expect(resolveUrlForHtml(doc.website)).toBe("https://example.com/?a=1&b=2");
  });
  it("counts combined names and Unicode graphemes without cutting a saved character", () => {
    const doc = { ...createDefaultDocument(), fullName: "A".repeat(79) + "👩🏽‍💻" };
    expect(characterCount(doc.fullName)).toBe(80);
    expect(validateSignatureDocument(doc)).toEqual([]);
    expect(coerceSignatureDocument(doc).fullName).toBe(doc.fullName);
    expect(validateSignatureDocument({ ...doc, fullName: doc.fullName + " Last" })).toEqual(expect.arrayContaining([expect.objectContaining({ field: "fullName" })]));
  });
  it("normalizes the same snapshot before name rasterization and final HTML", async () => {
    const result = { html: "ok", plainText: "Alex Audit" };
    const request = vi.fn().mockResolvedValueOnce(Response.json({ asset: { id: "image", url: "https://example.com/image.png", width: 120, height: 40, alt: "Alex Audit" } })).mockResolvedValueOnce(Response.json(result));
    vi.stubGlobal("fetch", request);
    const doc = { ...createDefaultDocument(), fullName: "  Alex   Audit  ", targetProfileId: "apple_mail" as const };
    expect(await prepareSignatureOutput(doc, null)).toEqual(result);
    expect(JSON.parse(request.mock.calls[0][1].body).name).toBe("Alex Audit");
    expect(JSON.parse(request.mock.calls[1][1].body).document.fullName).toBe("Alex Audit");
    expect(JSON.parse(request.mock.calls[1][1].body).profileId).toBe("apple_mail");
    expect(doc.fullName).toBe("  Alex   Audit  ");
  });
  it("rejects invalid current input before any export request", async () => {
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    await expect(prepareSignatureOutput({ ...createDefaultDocument(), email: "not-an-email" }, null)).rejects.toThrow("valid email");
    expect(request).not.toHaveBeenCalled();
  });
  it("exports live system-font text instead of missing-glyph boxes", async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json({ fallback: "text" })).mockResolvedValueOnce(Response.json({ html: "李 明", plainText: "李 明" }));
    vi.stubGlobal("fetch", request);
    await prepareSignatureOutput({ ...createDefaultDocument(), fullName: "李 明" }, null);
    expect(JSON.parse(request.mock.calls[1][1].body).document).toMatchObject({ fullName: "李 明", fontFamily: "arial", nameImage: null });
  });
  it("surfaces the controlled oversized-name error instead of exporting a clipped image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "This name is too wide. Choose a system font." }, { status: 422 })));
    await expect(prepareSignatureOutput(createDefaultDocument(), null)).rejects.toThrow("too wide");
  });
  it("does not claim malformed contact information passes compatibility checks", async () => {
    const result = await renderSignature({ ...createDefaultDocument(), email: "not-an-email", website: "https://" });
    expect(result.warnings.filter(warning => warning.severity === "error").map(warning => warning.code)).toEqual(expect.arrayContaining(["invalid-email", "invalid-website"]));
  });
  it("rejects invalid profile overrides and malformed billing bodies cleanly", async () => {
    const response = await render(new NextRequest("http://localhost/api/render", { method: "POST", body: JSON.stringify({ document: createDefaultDocument(), profileId: "missing" }) }));
    expect(response.status).toBe(400);
    expect((await verifyToken(new Request("http://localhost/api/billing/verify-token", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await verifySession(new Request("http://localhost/api/billing/verify-session", { method: "POST", body: "null" }))).status).toBe(400);
  });
});
