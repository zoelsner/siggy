import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/billing/email", () => ({ sendAccessEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/billing/stripe", () => ({ findPaidSessionByEmail: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/billing/token", () => ({ signAccessToken: vi.fn().mockResolvedValue("local-test-token") }));

import { POST } from "@/app/api/billing/restore/route";
import { sendAccessEmail } from "@/lib/billing/email";
import { findPaidSessionByEmail } from "@/lib/billing/stripe";
import { signAccessToken } from "@/lib/billing/token";

const required = ["RESEND_API_KEY", "STRIPE_SECRET_KEY", "SIGGY_TOKEN_SECRET"] as const;
function request(email: string) {
  return new Request("http://localhost/api/billing/restore", { method: "POST", body: JSON.stringify({ email }) });
}
beforeEach(() => {
  vi.clearAllMocks();
  for (const name of required) vi.stubEnv(name, "local-test-value");
  vi.mocked(findPaidSessionByEmail).mockResolvedValue(false);
  vi.mocked(signAccessToken).mockResolvedValue("local-test-token");
  vi.mocked(sendAccessEmail).mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("restore configuration availability", () => {
  it.each(required)("does not look up purchases or send mail without %s", async (name) => {
    vi.stubEnv(name, "");
    for (const email of ["buyer@example.com", "unknown@example.com"]) {
      const response = await POST(request(email));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "restore_unavailable" });
    }
    expect(findPaidSessionByEmail).not.toHaveBeenCalled();
    expect(signAccessToken).not.toHaveBeenCalled();
    expect(sendAccessEmail).not.toHaveBeenCalled();
  });

  it("validates the input before checking service availability", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const response = await POST(request("not-an-email"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_email" });
    expect(findPaidSessionByEmail).not.toHaveBeenCalled();
  });

  it("returns identical public responses for configured paid and unpaid emails", async () => {
    vi.mocked(findPaidSessionByEmail).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const paid = await POST(request("buyer@example.com"));
    const unpaid = await POST(request("unknown@example.com"));
    expect(paid.status).toBe(200);
    expect(unpaid.status).toBe(200);
    expect(await paid.json()).toEqual({ ok: true });
    expect(await unpaid.json()).toEqual({ ok: true });
    expect(signAccessToken).toHaveBeenCalledExactlyOnceWith("buyer@example.com");
    expect(sendAccessEmail).toHaveBeenCalledExactlyOnceWith({ to: "buyer@example.com", token: "local-test-token", kind: "restore" });
  });

  it("does not reveal purchase information through a configured lookup failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(findPaidSessionByEmail).mockRejectedValueOnce(new Error("local test failure"));
    const response = await POST(request("buyer@example.com"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sendAccessEmail).not.toHaveBeenCalled();
  });
});
