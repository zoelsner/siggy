import React from "react";
import { NextResponse } from "next/server";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

import { verifyAccessToken } from "@/lib/billing/token";
import { fetchFontData, isSystemFont } from "@/lib/fonts";
import { saveAsset } from "@/lib/runtime";

interface RenderNameRequest {
  name: string;
  fontFamily: string;
  accentColor: string;
  weight?: number;
  fontSize?: number;
  color?: string;
  token?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as RenderNameRequest;
  const { name, fontFamily, accentColor = "#4f46e5", weight = 700, fontSize: requestedSize = 32, color, token } = body;

  // Name-as-image is a paid feature, and every render uploads a blob —
  // reject unauthenticated calls instead of trusting the client UI.
  const claims = typeof token === "string" ? await verifyAccessToken(token) : null;
  if (!claims) {
    return NextResponse.json({ error: "unlock_required" }, { status: 403 });
  }

  if (!name || !fontFamily) {
    return NextResponse.json({ error: "Missing name or fontFamily." }, { status: 400 });
  }

  if (isSystemFont(fontFamily)) {
    return NextResponse.json({ error: "System fonts don't need rendering." }, { status: 400 });
  }

  try {
    const fontData = await fetchFontData(fontFamily, name, weight);

    // Render at 2x for retina
    const scale = 2;
    const fontSize = requestedSize * scale;
    const textColor = color ?? accentColor;

    // Estimate width based on font characteristics
    const charWidthRatio = fontFamily === "unbounded" ? 0.65 : 0.55;
    const estimatedWidth = Math.ceil(name.length * fontSize * charWidthRatio) + 40;
    const height = Math.ceil(fontSize * 1.5) + 20;

    const svg = await satori(
      <div
        style={{
          fontFamily: fontData.name,
          fontSize: `${fontSize}px`,
          fontWeight: weight,
          color: textColor,
          display: "flex",
          alignItems: "center",
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          padding: "10px 0",
        }}
      >
        {name}
      </div>,
      {
        width: estimatedWidth,
        height,
        fonts: [
          {
            name: fontData.name,
            data: fontData.data,
            weight: weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
            style: "normal" as const,
          },
        ],
      }
    );

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width" as const, value: estimatedWidth },
    });
    const pngData = resvg.render();
    const pngBuffer = Buffer.from(pngData.asPng());

    const id = crypto.randomUUID();
    const asset = await saveAsset(id, pngBuffer, {
      extension: "png",
      contentType: "image/png",
      width: Math.round(estimatedWidth / scale),
      height: Math.round(height / scale),
      alt: `${name} signature`,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Name rendering failed." },
      { status: 500 }
    );
  }
}
