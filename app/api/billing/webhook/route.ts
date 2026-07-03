import { NextResponse } from "next/server";
import Stripe from "stripe";

import { constructWebhookEvent, handleCheckoutCompleted } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(await request.text(), signature);
  } catch (err) {
    console.error("[billing/webhook] invalid signature", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    console.error("[billing/webhook] handler failed", err);
    return NextResponse.json({ error: "webhook_handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
