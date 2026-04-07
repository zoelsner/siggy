import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { orderId?: string };
  const orderId = body.orderId;

  if (!orderId || typeof orderId !== "string" || !/^\d+$/.test(orderId)) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    console.error("[activate-order] LEMON_SQUEEZY_API_KEY not configured");
    return NextResponse.json({ valid: false }, { status: 500 });
  }

  try {
    // Look up license keys for this order
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/license-keys?filter[order_id]=${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/vnd.api+json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ valid: false });
    }

    const data = (await res.json()) as {
      data?: Array<{ attributes?: { key?: string } }>;
    };

    const licenseKey = data.data?.[0]?.attributes?.key;
    if (!licenseKey) {
      return NextResponse.json({ valid: false });
    }

    // Validate the license key
    const validateRes = await fetch(
      "https://api.lemonsqueezy.com/v1/licenses/validate",
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({
          license_key: licenseKey,
          instance_name: "siggy-web",
        }),
      }
    );

    if (!validateRes.ok) {
      return NextResponse.json({ valid: false });
    }

    const validateData = (await validateRes.json()) as { valid?: boolean };
    if (validateData.valid) {
      return NextResponse.json({ valid: true, licenseKey });
    }

    return NextResponse.json({ valid: false });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
