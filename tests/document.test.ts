import { describe, expect, it } from "vitest";

import { coerceSignatureDocument, resolveUrlForHtml } from "@/lib/document";

describe("coerceSignatureDocument", () => {
  it("normalizes imported documents and keeps only four socials", () => {
    const document = coerceSignatureDocument({
      templateId: "minimal-rail",
      targetProfileId: "gmail_web",
      fullName: "  Test User  ",
      accentColor: "#112233",
      socials: [
        { id: "1", platform: "linkedin", url: "linkedin.com/in/test" },
        { id: "2", platform: "x", url: "x.com/test" },
        { id: "3", platform: "instagram", url: "" },
        { id: "4", platform: "github", url: "github.com/test" },
        { id: "5", platform: "linkedin", url: "linkedin.com/in/extra" }
      ]
    });

    expect(document.fullName).toBe("Test User");
    expect(document.accentColor).toBe("#112233");
    expect(document.socials).toHaveLength(4);
    expect(document.socials[0].url).toBe("linkedin.com/in/test");
  });

  it("converts relative asset URLs to absolute URLs for copied HTML", () => {
    expect(resolveUrlForHtml("/api/assets/123", "https://siggy.example")).toBe(
      "https://siggy.example/api/assets/123"
    );
    expect(resolveUrlForHtml("meridian.design")).toBe("https://meridian.design");
  });
});
