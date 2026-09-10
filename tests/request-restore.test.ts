import { afterEach, describe, expect, it, vi } from "vitest";
import { requestAccessRestore } from "@/lib/billing/request-restore";
afterEach(() => vi.unstubAllGlobals());
describe("restore request feedback", () => {
  it("accepts the same generic response regardless of purchase status", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", request);
    await expect(requestAccessRestore(" test@example.com ")).resolves.toBeUndefined();
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ email: "test@example.com" });
  });
  it("does not report success when the server rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(requestAccessRestore("test@example.com")).rejects.toThrow("restore_request_failed");
  });
  it("lets connection failures reach the form's retry state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(requestAccessRestore("test@example.com")).rejects.toThrow("Failed to fetch");
  });
});
