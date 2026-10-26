import { NextResponse } from "next/server";

import { isSessionPaid } from "@/lib/billing/stripe";
import { signAccessToken } from "@/lib/billing/token";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
  const sessionId = body?.sessionId;

  if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  try {
    const paid = await isSessionPaid(sessionId);
    if (!paid) return NextResponse.json({ valid: false });

    const token = await signAccessToken(sessionId);
    return NextResponse.json({ valid: true, token });
  } catch (err) {
    console.error("[billing/verify-session] failed", err);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
