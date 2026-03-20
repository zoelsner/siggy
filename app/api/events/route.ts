import { NextResponse } from "next/server";

import { appendEvent } from "@/lib/runtime";
import type { AnalyticsEvent } from "@/lib/types";

export async function POST(request: Request) {
  const raw = await request.text();

  try {
    const event = JSON.parse(raw) as AnalyticsEvent;
    await appendEvent(event);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
  }
}
