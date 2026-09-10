import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignatureEditor } from "../components/signature-editor";
import { createFixture } from "../lib/fixtures";
import type { TemplateId } from "../lib/types";

// The app's automatic JSX runtime is configured by Next; Vitest compiles JSX
// in these existing client components with the classic runtime.
afterEach(() => vi.unstubAllGlobals());
function renderEditor(templateId: TemplateId) {
  vi.stubGlobal("React", React);
  return renderToStaticMarkup(React.createElement(SignatureEditor, {
    document: { ...createFixture("full"), templateId, fontFamily: "anton" },
    imageUrl: null, unlocked: true, token: null,
    onChange: () => {}, onFieldFocus: () => {}, onImageUploaded: () => {}, onImageRemoved: () => {}, onUpsell: () => {},
  }));
}

describe("editable signature parity", () => {
  it.each(["bold", "edge", "card", "clean"] as TemplateId[])("keeps %s body email-safe while retaining chosen name font", (templateId) => {
    const html = renderEditor(templateId);
    expect(html).toMatch(/class="sig-editor" style="font-family:Arial,/);
    expect(html).toContain("--name-font:&#x27;Anton&#x27;");
  });

  it("groups Bold role/company and socials left of a separate vertical contact block", () => {
    const html = renderEditor("bold");
    const left = html.indexOf('class="sig-editor__bold-identity"');
    const right = html.indexOf('class="sig-editor__bold-contacts"');
    const job = html.indexOf('id="sig-job"');
    const company = html.indexOf('id="sig-company"');
    const phone = html.indexOf('id="sig-phone"');
    const email = html.indexOf('id="sig-email"');
    const website = html.indexOf('id="sig-website"');
    expect(left).toBeGreaterThan(-1);
    expect(job).toBeGreaterThan(left);
    expect(company).toBeGreaterThan(job);
    expect(right).toBeGreaterThan(company);
    expect(phone).toBeGreaterThan(right);
    expect(email).toBeGreaterThan(phone);
    expect(website).toBeGreaterThan(email);
    expect(html).not.toContain('class="sig-editor__role-sep"');
    expect(html).toContain('aria-label="Remove Phone"');
    expect(html).toContain('aria-label="Remove Website"');
  });
});
