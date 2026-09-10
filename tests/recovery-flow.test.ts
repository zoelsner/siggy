import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/billing/stripe", () => ({ findPaidSessionByEmail: vi.fn() }));
import { POST as restore } from "@/app/api/billing/restore/route";
import { POST as verify } from "@/app/api/billing/verify-token/route";
import { POST as render } from "@/app/api/render/route";
import { findPaidSessionByEmail } from "@/lib/billing/stripe";
import { sendAccessEmail } from "@/lib/billing/email";
import { createFixture } from "@/lib/fixtures";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

const delivery = vi.fn();
const request = (email: string) => new Request("http://localhost/api/billing/restore", {
  method: "POST", body: JSON.stringify({ email }),
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "offline-test-key");
  vi.stubEnv("STRIPE_SECRET_KEY", "offline-test-key");
  vi.stubEnv("SIGGY_TOKEN_SECRET", "offline-recovery-flow-secret");
  vi.stubGlobal("fetch", delivery);
  delivery.mockResolvedValue(new Response(JSON.stringify({ id: "offline-message" }), { status: 200 }));
  vi.mocked(findPaidSessionByEmail).mockResolvedValue(true);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("recovery email through paid rendering", () => {
  it("puts a usable signed access link in HTML and plain text and unlocks server output", async () => {
    expect((await restore(request("buyer@example.com"))).status).toBe(200);
    const [url, options] = delivery.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const mail = JSON.parse(options.body);
    expect(mail.to).toBe("buyer@example.com");
    const href = mail.html.match(/href="([^"]+)"/)[1];
    const link = new URL(href);
    expect(link.origin).toBe(new URL(SITE_URL).origin);
    expect(link.pathname).toBe("/editor");
    expect(mail.text).toContain(href);
    const token = link.searchParams.get("access_token");
    const verification = await verify(new Request("http://localhost/api/billing/verify-token", {
      method: "POST", body: JSON.stringify({ token }),
    }));
    expect(await verification.json()).toEqual({ valid: true });
    const result = await render(new NextRequest("http://localhost/api/render", {
      method: "POST", body: JSON.stringify({ document: { ...createFixture("full"), fontFamily: "arial" }, token }),
    }));
    expect(result.status).toBe(200);
    expect((await result.json()).html).not.toContain("Made with Siggy");
  });
  it("sends nothing for an unknown buyer without exposing their purchase status", async () => {
    vi.mocked(findPaidSessionByEmail).mockResolvedValue(false);
    const result = await restore(request("unknown@example.com"));
    expect(await result.json()).toEqual({ ok: true });
    expect(delivery).not.toHaveBeenCalled();
  });
  it("keeps delivery failures private while recording the failure", async () => {
    delivery.mockResolvedValue(new Response("Service unavailable", { status: 503 }));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await restore(request("buyer@example.com"));
    expect(await result.json()).toEqual({ ok: true });
    expect(error).toHaveBeenCalled();
  });
  it.each(["receipt", "restore"] as const)("routes replies to %s emails to the configured support address", async kind => {
    await sendAccessEmail({ to: "buyer@example.com", token: "offline-token", kind });
    const mail = JSON.parse(delivery.mock.calls[0][1].body);
    expect(mail.reply_to).toBe(SUPPORT_EMAIL);
  });
});
