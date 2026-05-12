import { NextRequest, NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/billing/token";
import { renderSignature } from "@/lib/render";
import type { ClientProfileId } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as unknown;
  const document = isRecord(payload) && "document" in payload ? payload.document : payload;
  const profileId =
    isRecord(payload) && typeof payload.profileId === "string"
      ? (payload.profileId as ClientProfileId)
      : undefined;

  // Server-derived unlock: verify the access token instead of trusting a client boolean.
  // Without this, anyone could POST { unlocked: true } and bypass the watermark.
  const token =
    isRecord(payload) && typeof payload.token === "string" ? payload.token : null;
  const claims = token ? await verifyAccessToken(token) : null;
  const unlocked = claims !== null;

  const result = await renderSignature(document, {
    origin: request.nextUrl.origin,
    profileId,
    unlocked
  });

  return NextResponse.json(result);
}
