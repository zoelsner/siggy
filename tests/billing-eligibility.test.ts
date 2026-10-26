import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { transport } = vi.hoisted(() => ({ transport: vi.fn() }));
vi.mock("stripe", async importOriginal => {
  const { default: Stripe } = await importOriginal<typeof import("stripe")>();
  return { default: class extends Stripe {
    constructor(key: string) { super(key, { httpClient: Stripe.createFetchHttpClient(transport), maxNetworkRetries: 0 }); }
  } };
});
vi.mock("@/lib/billing/email", () => ({ sendAccessEmail: vi.fn().mockResolvedValue(undefined) }));
import { findPaidSessionByEmail, getSessionRedemptionStatus, handleCheckoutCompleted, isEligibleSiggySession } from "@/lib/billing/stripe";
import { sendAccessEmail } from "@/lib/billing/email";
import { signAccessToken, verifyAccessToken } from "@/lib/billing/token";
import { POST as verifySession } from "@/app/api/billing/verify-session/route";
import { POST as restore } from "@/app/api/billing/restore/route";

let session: { id: string; mode: string; payment_status: string; status: string; created: number; customer_details: { email: string }; metadata: { product: string } };
let items: Array<{ id: string; quantity: number; price: { id: string; product: string } }>;
const response = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
const list = (data: unknown[], url: string) => response({ object: "list", data, has_more: false, url });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_offline_fixture");
  vi.stubEnv("STRIPE_PRICE_ID", "price_siggy_current");
  vi.stubEnv("SIGGY_LEGACY_PRICE_IDS", "");
  vi.stubEnv("SIGGY_LEGACY_PRODUCT_IDS", "");
  vi.stubEnv("SIGGY_TOKEN_SECRET", "offline-eligibility-secret");
  vi.stubEnv("RESEND_API_KEY", "offline-receipt-key");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  session = { id: "cs_test_offline", mode: "payment", payment_status: "paid", status: "complete", created: Math.floor(Date.now() / 1000), customer_details: { email: "audit@example.com" }, metadata: { product: "siggy_lifetime_access" } };
  items = [{ id: "li_fixture", quantity: 1, price: { id: "price_siggy_current", product: "prod_siggy" } }];
  transport.mockImplementation(async (input: string) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/line_items")) return list(items, url.pathname);
    if (url.pathname === "/v1/prices/price_siggy_current") return response({ id: "price_siggy_current", object: "price", product: "prod_siggy" });
    if (url.pathname === "/v1/checkout/sessions/cs_test_offline") return response({ ...session, object: "checkout.session" });
    if (url.pathname === "/v1/checkout/sessions") return list([session], url.pathname);
    throw new Error("Unexpected offline Stripe request");
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("shared Siggy purchase eligibility with offline SDK transport", () => {
  it("accepts a real matching price across redemption, restore and webhook", async () => {
    expect(await getSessionRedemptionStatus(session.id)).toBe("ready");
    expect(await findPaidSessionByEmail("audit@example.com")).toBe(true);
    await handleCheckoutCompleted(session as never);
    expect(sendAccessEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "audit@example.com", kind: "receipt" }));
  });
  it("rejects another product even if its session metadata falsely names Siggy", async () => {
    items[0].price = { id: "price_other", product: "prod_other" };
    expect(await getSessionRedemptionStatus(session.id)).toBe("invalid");
    expect(await findPaidSessionByEmail("audit@example.com")).toBe(false);
    await handleCheckoutCompleted(session as never);
    expect(sendAccessEmail).not.toHaveBeenCalled();
  });
  it("preserves historical prices on the configured product without needing session metadata", async () => {
    items[0].price = { id: "price_old_siggy", product: "prod_siggy" };
    session.metadata.product = "";
    expect(await getSessionRedemptionStatus(session.id)).toBe("ready");
    expect(await findPaidSessionByEmail("audit@example.com")).toBe(true);
  });
  it.each(["SIGGY_LEGACY_PRICE_IDS", "SIGGY_LEGACY_PRODUCT_IDS"] as const)("accepts only explicitly configured historical identity via %s", async setting => {
    items[0].price = { id: "price_verified_legacy", product: "prod_verified_legacy" };
    expect(await isEligibleSiggySession(session as never)).toBe(false);
    vi.stubEnv(setting, setting === "SIGGY_LEGACY_PRICE_IDS" ? "price_verified_legacy" : "prod_verified_legacy");
    expect(await isEligibleSiggySession(session as never)).toBe(true);
  });
  it.each([{ mode: "subscription" }, { payment_status: "unpaid" }, { status: "open" }])("fails closed before line-item reads for %j", async changes => {
    expect(await isEligibleSiggySession({ ...session, ...changes } as never)).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });
  it("preserves the replay limit but offers mailbox recovery for older verified purchases", async () => {
    session.created -= 7200;
    expect(await getSessionRedemptionStatus(session.id)).toBe("restore_required");
    expect(await findPaidSessionByEmail("audit@example.com")).toBe(true);
    const result = await verifySession(new Request("http://localhost/api/billing/verify-session", { method: "POST", body: JSON.stringify({ sessionId: session.id }) }));
    expect(await result.json()).toEqual({ valid: false, restoreRequired: true });
    expect(sendAccessEmail).not.toHaveBeenCalled();
    const recovery = await restore(new Request("http://localhost/api/billing/restore", { method: "POST", body: JSON.stringify({ email: "audit@example.com" }) }));
    expect(await recovery.json()).toEqual({ ok: true });
    expect(sendAccessEmail).toHaveBeenCalledTimes(1);
    const mail = vi.mocked(sendAccessEmail).mock.calls[0][0];
    expect(mail).toMatchObject({ to: "audit@example.com", kind: "restore" });
    expect((await verifyAccessToken(mail.token))?.sid).toBe("audit@example.com");
  });
  it("does not use a hardcoded amount as product identity", async () => {
    Object.assign(session, { amount_total: 100, currency: "usd" });
    expect(await isEligibleSiggySession(session as never)).toBe(true);
  });
  it("rejects malformed legacy configuration rather than silently broadening eligibility", async () => {
    vi.stubEnv("SIGGY_LEGACY_PRICE_IDS", "unverified-product-name");
    await expect(isEligibleSiggySession(session as never)).rejects.toThrow("SIGGY_LEGACY_PRICE_IDS");
    expect(transport).not.toHaveBeenCalled();
  });
  it("checks the full paginated line-item list instead of only the initial handful", async () => {
    transport.mockImplementation(async (input: string) => {
      const url = new URL(input);
      if (url.pathname === "/v1/prices/price_siggy_current") return response({ id: "price_siggy_current", product: "prod_siggy" });
      if (url.pathname.endsWith("/line_items")) {
        const second = url.searchParams.has("starting_after");
        const data = second ? items : Array.from({ length: 100 }, (_, index) => ({ id: `li_other_${index}`, quantity: 1, price: { id: "price_other", product: "prod_other" } }));
        return response({ object: "list", data, has_more: !second, url: url.pathname });
      }
      throw new Error("Unexpected pagination fixture request");
    });
    expect(await isEligibleSiggySession(session as never)).toBe(true);
    const lineRequests = transport.mock.calls.map(call => new URL(call[0])).filter(url => url.pathname.endsWith("/line_items"));
    expect(lineRequests).toHaveLength(2);
    expect(lineRequests[1].searchParams.get("starting_after")).toBe("li_other_99");
  });
  it("fails closed without configured identity or on Stripe lookup failure", async () => {
    vi.stubEnv("STRIPE_PRICE_ID", "");
    await expect(isEligibleSiggySession(session as never)).rejects.toThrow("STRIPE_PRICE_ID");
    expect(transport).not.toHaveBeenCalled();
    vi.stubEnv("STRIPE_PRICE_ID", "price_siggy_current");
    transport.mockRejectedValue(new Error("Offline fixture outage"));
    const result = await verifySession(new Request("http://localhost/api/billing/verify-session", { method: "POST", body: JSON.stringify({ sessionId: session.id }) }));
    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({ valid: false });
    await expect(handleCheckoutCompleted(session as never)).rejects.toThrow();
    expect(sendAccessEmail).not.toHaveBeenCalled();
    expect(await findPaidSessionByEmail("audit@example.com")).toBe(false);
  });
  it("keeps already-issued lifetime tokens valid without any Stripe request", async () => {
    const token = await signAccessToken("historical-existing-license");
    expect((await verifyAccessToken(token))?.sid).toBe("historical-existing-license");
    expect(transport).not.toHaveBeenCalled();
  });
});
