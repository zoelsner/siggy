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

  const email = body.email;
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  // Always respond { ok: true } regardless of outcome — the response must
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
