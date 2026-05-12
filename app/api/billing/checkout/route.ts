import { NextResponse } from "next/server";

import { createCheckoutSession } from "@/lib/billing/stripe";

export async function POST() {
  try {
    const { url } = await createCheckoutSession();
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[billing/checkout] failed", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
