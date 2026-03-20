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
        profileId: "gmail_web"
      }
    );

    expect(result.html).toMatchSnapshot();
    expect(result.html).not.toMatch(/display:\s*flex/i);
    expect(result.html).not.toMatch(/<style[\s>]/i);
  });

  it("warns when uploaded images are hosted on localhost", async () => {
    const result = await renderSignature(createFixture("full"), {
      origin: "http://localhost:3000",
      profileId: "gmail_web"
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
