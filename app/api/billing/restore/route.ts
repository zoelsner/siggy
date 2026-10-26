import { NextResponse } from "next/server";

import { sendAccessEmail } from "@/lib/billing/email";
import { findPaidSessionByEmail } from "@/lib/billing/stripe";
import { signAccessToken } from "@/lib/billing/token";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = body?.email;
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  // This check is identical for every valid email, before any purchase lookup.
  // Do not imply a link was sent when the service cannot send one at all.
  if (!process.env.RESEND_API_KEY || !process.env.STRIPE_SECRET_KEY || !process.env.SIGGY_TOKEN_SECRET || !process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "restore_unavailable" }, { status: 503 });
  }

  // With the service configured, respond { ok: true } regardless of outcome — the response must
  // never reveal whether this email has a purchase on file.
  try {
    const paid = await findPaidSessionByEmail(email);
    if (paid) {
      const token = await signAccessToken(email);
      await sendAccessEmail({ to: email, token, kind: "restore" });
    }
  } catch (err) {
    console.error("[billing/restore] failed", err);
  }

  return NextResponse.json({ ok: true });
}
