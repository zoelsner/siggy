import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { transport } = vi.hoisted(() => ({ transport: vi.fn() }));
vi.mock("stripe", async (importOriginal) => {
  const { default: Stripe } = await importOriginal<typeof import("stripe")>();
  return {
    default: class extends Stripe {
      constructor(key: string) {
        super(key, { httpClient: Stripe.createFetchHttpClient(transport), maxNetworkRetries: 0 });
      }
    },
  };
});
import { findPaidSessionByEmail } from "@/lib/billing/stripe";

const session = (id: string, payment_status = "unpaid") => ({
  id, object: "checkout.session", payment_status, mode: "payment", status: "complete", created: 1,
});
const page = (data: ReturnType<typeof session>[], has_more = false) => new Response(
  JSON.stringify({ object: "list", data, has_more, url: "/v1/checkout/sessions" }),
  { headers: { "Content-Type": "application/json" } },
);

beforeEach(() => {
  transport.mockReset();
  transport.mockImplementation(async (input: string) => {
    if (new URL(input).pathname.endsWith("/line_items")) return new Response(JSON.stringify({ object: "list", has_more: false, data: [{ id: "li_fixture", quantity: 1, price: { id: "price_siggy_fixture", product: "prod_siggy_fixture" } }], url: "/v1/checkout/sessions/cs_fixture/line_items" }));
    throw new Error("Unexpected SDK fixture request");
  });
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local_fixture_only");
  vi.stubEnv("STRIPE_PRICE_ID", "price_siggy_fixture");
});
afterEach(() => vi.unstubAllEnvs());

describe("lifetime purchase restoration pagination", () => {
  it("finds an old paid purchase beyond 100 newer unpaid attempts using the real SDK paginator", async () => {
    transport.mockResolvedValueOnce(page(Array.from({ length: 100 }, (_, i) => session(`cs_${i}`)), true));
    transport.mockResolvedValueOnce(page([session("cs_old_purchase", "paid")]));
    expect(await findPaidSessionByEmail("buyer@example.com")).toBe(true);
    expect(transport).toHaveBeenCalledTimes(3);
    const second = new URL(transport.mock.calls[1][0]);
    expect(second.searchParams.get("starting_after")).toBe("cs_99");
    expect(second.searchParams.get("customer_details[email]")).toBe("buyer@example.com");
  });

  it("stops at the paid purchase without requesting another page", async () => {
    transport.mockResolvedValueOnce(page([session("cs_paid", "paid")], true));
    expect(await findPaidSessionByEmail("buyer@example.com")).toBe(true);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("does not restore from unpaid sessions or a failed subsequent page", async () => {
    transport.mockResolvedValueOnce(page([session("cs_unpaid")]));
    expect(await findPaidSessionByEmail("buyer@example.com")).toBe(false);
    transport.mockResolvedValueOnce(page([session("cs_unpaid")], true));
    transport.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Fixture outage" } }), { status: 500 }));
    expect(await findPaidSessionByEmail("buyer@example.com")).toBe(false);
  });
});
