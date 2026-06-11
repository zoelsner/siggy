import { expect, test } from "@playwright/test";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

async function openFreshEditor(page: import("@playwright/test").Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/editor");
  await expect(page.getByText("Email signature builder")).toBeVisible();
}

// Paid features (headshot, pro fonts) are gated — seed a fake access token
// and mock its verification so the editor resolves as unlocked.
async function openUnlockedEditor(page: import("@playwright/test").Page) {
  await page.route("**/api/billing/verify-token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ valid: true }),
    });
  });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("siggy_access", "e2e-access-token");
  });
  await page.goto("/editor");
  await expect(page.getByText("Email signature builder")).toBeVisible();
}

test.describe("editor", () => {
  test("loads the builder shell and enables copy after render", async ({ page }) => {
    await openFreshEditor(page);

    await expect(page.getByText("Templates")).toBeVisible();
    await expect(page.getByText("Preview as")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy signature" })).toBeEnabled();
    await expect(page.locator(".message-card__signature")).toBeVisible();
  });

  test("inspector fields update the live signature preview", async ({ page }) => {
    await openFreshEditor(page);

    await page.getByLabel("Full name").fill("Alex Morgan");
    await page.getByLabel("Title").fill("Design Lead");
    await page.getByLabel("Company").fill("Northstar Labs");
    await page.getByLabel("Email").fill("alex@northstar.test");
    await page.getByLabel("Phone").fill("+1 (212) 555-0199");
    await page.getByLabel("Website").fill("northstar.test");

    const signature = page.locator(".message-card__signature");
    await expect(signature.locator("#sig-name")).toHaveValue("Alex Morgan");
    await expect(signature.locator("#sig-job")).toHaveValue("Design Lead");
    await expect(signature.locator("#sig-company")).toHaveValue("Northstar Labs");
    await expect(signature.locator("#sig-email")).toHaveValue("alex@northstar.test");
    await expect(signature.locator("#sig-phone")).toHaveValue("+1 (212) 555-0199");
    await expect(signature.locator("#sig-website")).toHaveValue("northstar.test");
  });

  test("template switching renders each editable template surface", async ({ page }) => {
    await openFreshEditor(page);

    const signature = page.locator(".message-card__signature");

    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(signature.locator(".sig-editor__card--edge")).toBeVisible();
    await expect(signature.locator(".sig-editor__edge-bar")).toBeVisible();

    await page.getByRole("tab", { name: "Card" }).click();
    await expect(signature.locator(".sig-editor__card--card")).toBeVisible();
    await expect(signature.locator(".sig-editor__card-rule")).toBeVisible();

    await page.getByRole("tab", { name: "Clean" }).click();
    await expect(signature.locator(".sig-editor__card--clean")).toBeVisible();
    await expect(signature.locator("#sig-name")).toHaveValue("Sarah Chen");

    await page.getByRole("tab", { name: "Bold" }).click();
    await expect(signature.locator(".sig-editor__card--bold")).toBeVisible();
    await expect(signature.locator("#sig-name-first")).toHaveValue("Sarah");
    await expect(signature.locator("#sig-name-last")).toHaveValue("Chen");
  });

  test("optional social fields can be added and edited inline", async ({ page }) => {
    await openFreshEditor(page);

    const signature = page.locator(".message-card__signature");
    await signature.getByRole("button", { name: "+ Add field" }).click();
    await signature.getByRole("menuitem", { name: "LinkedIn" }).click();

    const linkedIn = signature.locator("#sig-social-linkedin");
    await expect(linkedIn).toBeVisible();
    await linkedIn.fill("linkedin.com/in/alexmorgan");
    await expect(linkedIn).toHaveValue("linkedin.com/in/alexmorgan");
  });

  test("headshot upload opens cropper and applies cropped image", async ({ page }) => {
    await page.route("**/api/assets", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          asset: {
            id: "test-headshot",
            url: `data:image/png;base64,${tinyPng.toString("base64")}`,
            width: 128,
            height: 128,
            alt: "Sarah Chen headshot",
            contentType: "image/png",
          },
        }),
      });
    });

    await openUnlockedEditor(page);

    const signature = page.locator(".message-card__signature");
    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(signature.locator(".sig-editor__card--edge")).toBeVisible();

    await signature.locator('input[type="file"]').setInputFiles({
      name: "headshot.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });

    await expect(page.getByRole("dialog", { name: "Crop headshot" })).toBeVisible();
    await page.getByLabel("Zoom").fill("1.4");
    await page.getByRole("button", { name: "Use photo" }).click();

    await expect(signature.locator(".sig-editor__avatar--photo img")).toBeVisible();
  });

  test("free tier shows unlock CTA, keeps fonts usable, and watermark routes to checkout", async ({ page }) => {
    await page.route("**/api/billing/checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/editor?mock_checkout=1" }),
      });
    });

    await openFreshEditor(page);

    await expect(page.getByRole("button", { name: "Unlock — $19" })).toBeVisible();
    await expect(page.locator(".sig-editor__watermark")).toContainText("Made with Siggy");

    // Fonts are not gated (GATES.proFonts off) — free users can select any of them.
    const proFont = page.locator(".inspector-font-grid").getByRole("button", { name: "Fraunces" });
    await proFont.click();
    await expect(proFont).toHaveClass(/inspector-font--active/);

    // The watermark's remove button is the paid upsell.
    await page.locator(".sig-editor__watermark-remove").click();
    await page.waitForURL(/mock_checkout=1/);
  });
});
