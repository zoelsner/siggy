import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", route => route.abort());
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: async (items: ClipboardItem[]) => {
      const payload: Record<string, string> = {};
      for (const item of items) for (const type of item.types) payload[type] = await (await item.getType(type)).text();
      (window as unknown as { auditClipboard: Record<string, string> }).auditClipboard = payload;
    } } });
  });
});

async function openEditor(page: import("@playwright/test").Page) {
  await page.goto("/editor");
  await expect(page.getByRole("button", { name: "Copy signature", exact: true })).toBeEnabled();
  await page.locator(".inspector-font-grid").getByRole("button", { name: "Arial", exact: true }).click();
  await expect(page.locator(".inspector-font--active")).toHaveText("Arial");
}

test("homepage restores demo changes and has an honest editor handoff", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Alex Homepage");
  await expect(page.locator(".hero-mini-footer__status")).toContainText("Draft saved");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Alex Homepage");
  await page.getByRole("link", { name: "Open free editor", exact: true }).click();
  await expect(page.locator("#fullName")).toHaveValue("Alex Homepage");
});

test("homepage save failure is reported honestly", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Denied", "SecurityError"); }; });
  await page.goto("/");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Unsaved Audit");
  await expect(page.locator(".hero-mini-footer__status")).toContainText("Draft not saved");
});

test("template-card handoff keeps the typed name and selected template", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Template Audit");
  await page.locator(".template-card").nth(2).click();
  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.locator("#fullName")).toHaveValue("Template Audit");
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Card");
});

test("malformed contacts immediately block copy and export with accessible errors", async ({ page }) => {
  await openEditor(page);
  await page.locator("#email").fill("not-an-email");
  await page.locator("#website").fill("https://");
  await expect(page.getByRole("button", { name: "Copy signature", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Export HTML" })).toBeDisabled();
  await expect(page.locator("#sig-email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#sig-email")).toHaveAttribute("aria-describedby", "validation-email");
  await expect(page.locator(".preview-status")).toContainText("valid email address");
  await page.locator("#email").fill("alex+audit@example.com");
  await page.locator("#website").fill("example.com/?a=1&b=2");
  await expect(page.getByRole("button", { name: "Copy signature", exact: true })).toBeEnabled();
});

test("saved long drafts survive reload without clipping or silent export", async ({ page }) => {
  await openEditor(page);
  const name = "Alexandria Example ".repeat(10).trim();
  const title = "Senior Product & Brand Design Consultant ".repeat(4).trim();
  const company = "Example Creative Strategy Studio ".repeat(5).trim();
  await page.locator("#fullName").fill(name);
  await page.locator("#jobTitle").fill(title);
  await page.locator("#company").fill(company);
  await page.reload();
  await expect(page.locator("#fullName")).toHaveValue(name);
  await expect(page.locator("#jobTitle")).toHaveValue(title);
  await expect(page.locator("#company")).toHaveValue(company);
  await expect(page.getByRole("button", { name: "Copy signature", exact: true })).toBeDisabled();
  await expect(page.locator(".preview-status")).toContainText("draft is kept in full");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
});

test("immediate edit and profile switch export the current snapshot and guide", async ({ page }) => {
  await openEditor(page);
  await page.locator("#fullName").fill("Current Snapshot");
  await page.getByRole("button", { name: "Apple Mail", exact: true }).click();
  await page.getByRole("button", { name: "Copy signature", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copied!", exact: true })).toBeVisible();
  const payload = await page.evaluate(() => (window as unknown as { auditClipboard: Record<string, string> }).auditClipboard);
  expect(payload["text/html"]).toContain('data-siggy-profile="apple_mail"');
  expect(payload["text/plain"]).toContain("Current Snapshot");
  await expect(page.getByRole("button", { name: "I installed it in Apple Mail" })).toBeVisible();
  await page.getByRole("button", { name: "I installed it in Apple Mail" }).click();
  await page.getByRole("button", { name: "Outlook", exact: true }).click();
  await expect(page.getByRole("button", { name: "I installed it in Outlook", exact: true })).toBeVisible();
});

test("render errors clear stale green status and pause exports", async ({ page }) => {
  await openEditor(page);
  await page.route("**/api/render", route => route.fulfill({ status: 500, body: "Offline fixture" }));
  await page.locator("#company").fill("Render Failure Audit");
  await expect(page.locator(".preview-status")).toContainText("Couldn't check this signature");
  await expect(page.locator(".preview-status")).not.toContainText("Checks passed");
  await expect(page.getByRole("button", { name: "Copy signature", exact: true })).toBeDisabled();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`all templates fit ${viewport.width}px with normal and long input`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openEditor(page);
    for (const [label, id] of [["Bold", "bold"], ["Underline", "edge"], ["Card", "card"], ["Minimal", "clean"]]) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      await expect(page.locator(`.sig-editor__card--${id}`)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: `test-results/${viewport.width}-${id}.png`, fullPage: true });
      await page.locator("#fullName").fill("Alexandria Example ".repeat(10).trim());
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.locator("#fullName").fill("Sarah Chen");
    }
  });
}
