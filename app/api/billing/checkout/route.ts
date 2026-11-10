import { NextResponse } from "next/server";

import { createCheckoutSession } from "@/lib/billing/stripe";

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "ref",
  "landing",
  "ts",
];

const MAX_VALUE_LENGTH = 450;

function sanitizeAttribution(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== "object") return undefined;

  const sanitized: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    sanitized[key] = String(value).slice(0, MAX_VALUE_LENGTH);
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { source?: string; attribution?: unknown }
    | null;
  const source = body?.source === "editor" ? "editor" : "landing";
  const attribution = sanitizeAttribution(body?.attribution);
  try {
    const { url } = await createCheckoutSession(source, attribution);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[billing/checkout] failed", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
