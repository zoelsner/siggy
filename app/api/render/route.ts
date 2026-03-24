import { NextRequest, NextResponse } from "next/server";

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

  const unlocked =
    isRecord(payload) && typeof payload.unlocked === "boolean"
      ? payload.unlocked
      : false;

  const result = await renderSignature(document, {
    origin: request.nextUrl.origin,
    profileId,
    unlocked
  });

  return NextResponse.json(result);
}
