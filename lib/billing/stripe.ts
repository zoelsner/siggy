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
// indefinitely to mint new tokens. Bound the abuse window to recent payments —
// legitimate redemption happens within seconds of the redirect.
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
  if (session.mode !== "payment") return;

  if (session.payment_status !== "paid") {
    console.warn("[billing/webhook] checkout completed without paid status", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });
    return;
  }

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

export async function isSessionPaid(sessionId: string): Promise<boolean> {
  if (!sessionId.startsWith("cs_")) return false;
  try {
    const session = await client().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return false;
    if (typeof session.created !== "number") return false;
    const ageMs = Date.now() - session.created * 1000;
    if (ageMs < 0 || ageMs > MAX_SESSION_AGE_MS) return false;
    return true;
  } catch {
    return false;
  }
}

// Restore-by-email has no time window — it's a lifetime product, so a
// purchase from months ago must still qualify. Unlike isSessionPaid, this
// never bounds session age.
export async function findPaidSessionByEmail(email: string): Promise<boolean> {
  try {
    const sessions = await client().checkout.sessions.list({
      customer_details: { email },
      limit: 100,
    });
    return sessions.data.some((session) => session.payment_status === "paid");
  } catch {
    return false;
  }
}
