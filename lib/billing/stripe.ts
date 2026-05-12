import Stripe from "stripe";

// Pin to the SDK's current typed version. Upgrading `stripe` may surface a TS
// error here, which is intentional — it forces a conscious bump.
const API_VERSION = "2026-04-22.dahlia" as const;

let cached: Stripe | null = null;

function client(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  cached = new Stripe(key, { apiVersion: API_VERSION });
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

export async function createCheckoutSession(): Promise<{ url: string }> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID not configured");

  const base = getBaseUrl();
  const session = await client().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/editor?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/#pricing`,
    allow_promotion_codes: true,
    automatic_tax: { enabled: false },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
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
