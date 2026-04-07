import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { licenseKey?: string };
  const licenseKey = body.licenseKey;

  if (!licenseKey || typeof licenseKey !== "string" || licenseKey.length > 200) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    console.error("[verify-license] LEMON_SQUEEZY_API_KEY not configured");
    return NextResponse.json({ valid: false }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: new URLSearchParams({
        license_key: licenseKey,
        instance_name: "siggy-web",
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ valid: false });
    }

    const data = (await res.json()) as { valid?: boolean };
    return NextResponse.json({ valid: data.valid === true });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
