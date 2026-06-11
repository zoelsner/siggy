import { NextResponse } from "next/server";

import { createCheckoutSession } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { source?: string } | null;
  const source = body?.source === "editor" ? "editor" : "landing";
  try {
    const { url } = await createCheckoutSession(source);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[billing/checkout] failed", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
