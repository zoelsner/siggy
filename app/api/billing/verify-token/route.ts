import { NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/billing/token";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  const token = body.token;

  if (!token || typeof token !== "string" || token.length > 1024) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  try {
    const claims = await verifyAccessToken(token);
    return NextResponse.json({ valid: claims !== null });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
