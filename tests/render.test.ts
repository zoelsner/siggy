import { describe, expect, it } from "vitest";

import { createFixture } from "@/lib/fixtures";
import { renderSignature } from "@/lib/render";
import { templateDefinitions } from "@/lib/templates";

describe("renderSignature", () => {
  it.each(templateDefinitions)("matches snapshot for %s", async (template) => {
    const result = await renderSignature(
      {
        ...createFixture("full"),
        templateId: template.id
      },
      {
        origin: "https://siggy.example",
        profileId: "gmail_web",
        unlocked: true
      }
    );

    expect(result.html).toMatchSnapshot();
    expect(result.html).not.toMatch(/display:\s*flex/i);
    expect(result.html).not.toMatch(/<style[\s>]/i);
  });

  // GATES.proFonts / GATES.headshot are currently off — free renders keep
  // everything and only differ by the watermark. If a gate is flipped on,
  // extend this test to assert the stripping behavior.
  it("keeps fonts and headshots for free renders but adds the watermark", async () => {
    const result = await renderSignature(
      {
        ...createFixture("full"),
        templateId: "card", // the only photo template in the final lineup
        fontFamily: "fraunces"
      },
      {
        origin: "https://siggy.example",
        profileId: "gmail_web"
      }
    );

    expect(result.html).toContain("avatar.jpg");
    expect(result.html).toContain("Fraunces");
    expect(result.html).toContain("Made with Siggy");
  });

  it("drops the watermark for unlocked renders", async () => {
    const result = await renderSignature(
      {
        ...createFixture("full"),
        templateId: "card", // the only photo template in the final lineup
        fontFamily: "fraunces"
      },
      {
        origin: "https://siggy.example",
        profileId: "gmail_web",
        unlocked: true
      }
    );

    expect(result.html).toContain("avatar.jpg");
    expect(result.html).toContain("Fraunces");
    expect(result.html).not.toContain("Made with Siggy");
  });

  it("warns when uploaded images are hosted on localhost", async () => {
    const result = await renderSignature(createFixture("full"), {
      origin: "http://localhost:3000",
      profileId: "gmail_web",
      unlocked: true
    });

    expect(result.warnings.some((warning) => warning.code === "localhost-image-hosting")).toBe(true);
  });

  it("keeps shipped templates compatible with the outlook web validator", async () => {
    for (const template of templateDefinitions) {
      const result = await renderSignature(
        {
          ...createFixture("full"),
          templateId: template.id
        },
        {
          origin: "https://siggy.example",
          profileId: "outlook_web"
        }
      );

      expect(result.warnings.filter((warning) => warning.severity === "error")).toEqual([]);
      expect(result.html).not.toMatch(/display:\s*flex/i);
      expect(result.html).not.toMatch(/position:\s*(absolute|fixed|sticky)/i);
    }
  });

  it("warns when the signature gets close to the Gmail size budget", async () => {
    const result = await renderSignature(
      {
        ...createFixture("long"),
        socials: [
          { id: "1", platform: "linkedin", url: "linkedin.com/in/very-long-signature-link" },
          { id: "2", platform: "x", url: "x.com/very-long-signature-link" },
          { id: "3", platform: "instagram", url: "instagram.com/very-long-signature-link" },
          { id: "4", platform: "github", url: "github.com/very-long-signature-link" }
        ]
      },
      {
        origin: "https://siggy.example",
        profileId: "gmail_web"
      }
    );

    expect(result.sizeBudget.charCount).toBeGreaterThan(0);
    expect(result.sizeBudget.hardLimit).toBe(10000);
    expect(result.warnings.some((warning) => warning.code === "social-density")).toBe(true);
  });
});

describe("social exports", () => {
  it.each(templateDefinitions)("exports handles as profile links in %s", async (template) => {
    const result = await renderSignature({
      ...createFixture("full"), templateId: template.id,
      socials: [
        { id: "1", platform: "x", url: "zachoelsner" },
        { id: "2", platform: "instagram", url: "@zoe.quinn" },
        { id: "3", platform: "linkedin", url: "in/zoe-quinn" },
        { id: "4", platform: "github", url: "https://github.com/zoelsner" },
      ],
    });
    for (const url of ["https://x.com/zachoelsner", "https://www.instagram.com/zoe.quinn", "https://www.linkedin.com/in/zoe-quinn", "https://github.com/zoelsner"]) {
      expect(result.html).toContain(`href="${url}"`);
      expect(result.plainText).toContain(url);
    }
  });
});


describe("call-to-action exports", () => {
  it.each(templateDefinitions)("keeps the CTA destination usable outside the editor in %s", async (template) => {
    const result = await renderSignature({
      ...createFixture("minimal"), templateId: template.id,
      cta: { text: "Book a call", url: "calendly.com/zach/intro?source=signature" },
    }, { origin: "https://siggy.example", unlocked: true });
    expect(result.html).toContain('href="https://calendly.com/zach/intro?source=signature"');
    expect(result.html).not.toContain('href="calendly.com/');
    expect(result.plainText).toContain("Book a call: https://calendly.com/zach/intro?source=signature");
  });

  it("preserves complete CTA URLs and query parameters", async () => {
    const result = await renderSignature({
      ...createFixture("minimal"), cta: { text: "Say hello", url: "https://example.com/contact?from=siggy&lang=en" },
    });
    expect(result.html).toContain('href="https://example.com/contact?from=siggy&amp;lang=en"');
    expect(result.plainText).toContain("Say hello: https://example.com/contact?from=siggy&lang=en");
  });

  it("omits unsafe CTA destinations from both formats", async () => {
    const result = await renderSignature({
      ...createFixture("minimal"), cta: { text: "Unsafe link", url: "javascript:alert(1)" },
    });
    expect(result.html).not.toContain("Unsafe link");
    expect(result.plainText).not.toContain("Unsafe link");
  });
});
