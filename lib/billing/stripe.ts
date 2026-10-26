import Stripe from "stripe";

import { sendAccessEmail } from "@/lib/billing/email";
import { signAccessToken } from "@/lib/billing/token";

let cached: Stripe | null = null;

function client(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  cached = new Stripe(key);
  return cached;
}

// Resolve the canonical base URL from env, never from request headers.
// Trusting Origin/Host would let an attacker craft a Stripe success_url
// pointing at their domain and steal the real session_id post-payment.
function getBaseUrl(): string {
  if (process.env.SIGGY_BASE_URL) return process.env.SIGGY_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

// A paid Stripe session stays paid forever, so its session_id can be replayed
// indefinitely to mint new tokens. Bound direct redemption to recent sessions;
// older verified purchases recover through their purchase mailbox instead.
const MAX_SESSION_AGE_MS = 60 * 60 * 1000; // 1 hour

export type CheckoutSource = "editor" | "landing";

export async function createCheckoutSession(source: CheckoutSource = "landing"): Promise<{ url: string }> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID not configured");

  const base = getBaseUrl();
  const session = await client().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/editor?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: source === "editor" ? `${base}/editor` : `${base}/#pricing`,
    allow_promotion_codes: true,
    automatic_tax: { enabled: false },
    metadata: {
      product: "siggy_lifetime_access",
      source,
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

export function constructWebhookEvent(payload: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  return client().webhooks.constructEvent(payload, signature, secret);
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "payment" || session.payment_status !== "paid") {
    console.warn("[billing/webhook] checkout completed without paid status", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });
    return;
  }
  if (!(await isEligibleSiggySession(session))) return;

  // Siggy is intentionally accountless. The paid session is redeemed into a
  // local HMAC access token when Stripe redirects the customer back to /editor.
  console.info("[billing/webhook] checkout.session.completed", {
    sessionId: session.id,
    amountTotal: session.amount_total,
    currency: session.currency,
  });

  // Also email a permanent access link as a receipt, so the buyer has a way
  // back in if they lose the localStorage token later. Best-effort only — an
  // email failure here must never fail the webhook (Stripe retries on 5xx).
  const email = session.customer_details?.email;
  if (!email) return;

  if (!process.env.RESEND_API_KEY) {
    console.info("[billing/webhook] RESEND_API_KEY not configured, skipping receipt email");
    return;
  }

  try {
    const token = await signAccessToken(session.id);
    await sendAccessEmail({ to: email, token, kind: "receipt" });
  } catch (err) {
    console.error("[billing/webhook] receipt email failed", err);
  }
}

function configuredIds(name: "SIGGY_LEGACY_PRICE_IDS" | "SIGGY_LEGACY_PRODUCT_IDS", prefix: string): Set<string> {
  const ids = (process.env[name] ?? "").split(",").map(id => id.trim()).filter(Boolean);
  if (ids.some(id => !id.startsWith(prefix))) throw new Error(`Invalid ${name} configuration`);
  return new Set(ids);
}

// A paid flag or session metadata alone is not proof of buying this product.
// Price identity is authoritative. Looking up the current price's product also
// preserves older prices on that same product, without hardcoding an amount.
export async function isEligibleSiggySession(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.mode !== "payment" || session.payment_status !== "paid" || session.status !== "complete") return false;
  const currentPrice = process.env.STRIPE_PRICE_ID;
  if (!currentPrice?.startsWith("price_")) throw new Error("STRIPE_PRICE_ID not configured");
  const approvedPrices = configuredIds("SIGGY_LEGACY_PRICE_IDS", "price_");
  approvedPrices.add(currentPrice);
  const approvedProducts = configuredIds("SIGGY_LEGACY_PRODUCT_IDS", "prod_");
  let currentProduct: string | undefined;
  for await (const item of client().checkout.sessions.listLineItems(session.id, { limit: 100 })) {
    const price = item.price;
    if (!price || !item.quantity || item.quantity < 1) continue;
    if (approvedPrices.has(price.id)) return true;
    const product = typeof price.product === "string" ? price.product : price.product?.id;
    if (!product) continue;
    if (approvedProducts.has(product)) return true;
    if (!currentProduct) {
      const canonical = await client().prices.retrieve(currentPrice);
      currentProduct = typeof canonical.product === "string" ? canonical.product : canonical.product?.id;
      if (!currentProduct) throw new Error("Configured Siggy price has no product");
    }
    if (product === currentProduct) return true;
  }
  return false;
}

export async function getSessionRedemptionStatus(sessionId: string): Promise<"ready" | "restore_required" | "invalid"> {
  if (!sessionId.startsWith("cs_")) return "invalid";
  const session = await client().checkout.sessions.retrieve(sessionId);
  if (!(await isEligibleSiggySession(session))) return "invalid";
  if (typeof session.created !== "number") return "invalid";
  const ageMs = Date.now() - session.created * 1000;
  if (ageMs < 0) return "invalid";
  // Keep replay protection. Older verified purchases recover through the
  // purchase mailbox instead of being told their payment could not be verified.
  return ageMs > MAX_SESSION_AGE_MS ? "restore_required" : "ready";
}

export async function isSessionPaid(sessionId: string): Promise<boolean> {
  try { return await getSessionRedemptionStatus(sessionId) === "ready"; }
  catch { return false; }
}

// Restore-by-email has no time window — it's a lifetime product, so a
// purchase from months ago must still qualify. Unlike isSessionPaid, this
// never bounds session age.
export async function findPaidSessionByEmail(email: string): Promise<boolean> {
  try {
    // Iterate through every page: a lifetime purchase can be older than the
    // newest 100 checkout attempts. Stop fetching as soon as a match is found.
    const sessions = client().checkout.sessions.list({
      customer_details: { email },
      limit: 100,
    });
    for await (const session of sessions) {
      if (await isEligibleSiggySession(session)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
