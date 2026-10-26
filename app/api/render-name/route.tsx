import { NextResponse } from "next/server";

import { GATES } from "@/lib/billing/gates";
import { verifyAccessToken } from "@/lib/billing/token";
import { fetchFontData, isSystemFont } from "@/lib/fonts";
import { getNamePresentation } from "@/lib/template-name";
import { nameFontWeight, renderNameImage, UnsupportedNameGlyphsError, NameImageSizeError } from "@/lib/render-name-image";
import { characterCount, FIELD_LIMITS, normalizeOutputText } from "@/lib/validation";
import type { TemplateId } from "@/lib/types";
import { saveAsset } from "@/lib/runtime";

interface RenderNameRequest {
  name: string;
  fontFamily: string;
  accentColor: string;
  templateId?: TemplateId;
  token?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RenderNameRequest | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const { name, fontFamily, accentColor = "#4f46e5", templateId = "clean", token } = body;

  // When pro fonts are gated, reject unauthenticated calls instead of
  // trusting the client UI — every render here uploads a blob.
  if (GATES.proFonts) {
    const claims = typeof token === "string" ? await verifyAccessToken(token) : null;
    if (!claims) {
      return NextResponse.json({ error: "unlock_required" }, { status: 403 });
    }
  }

  if (typeof name !== "string" || !name.trim() || characterCount(normalizeOutputText(name)) > FIELD_LIMITS.fullName || typeof fontFamily !== "string" || !/^#[0-9a-f]{6}$/i.test(accentColor) || !["bold", "edge", "card", "clean"].includes(templateId)) {
    return NextResponse.json({ error: "Invalid name, fontFamily, or templateId." }, { status: 400 });
  }

  if (isSystemFont(fontFamily)) {
    return NextResponse.json({ error: "System fonts don't need rendering." }, { status: 400 });
  }

  try {
    const normalizedName = normalizeOutputText(name);
    const presentation = getNamePresentation(templateId, normalizedName, accentColor);
    const weight = nameFontWeight(fontFamily, presentation.fontWeight);
    // Bold uppercases the name, so its subset must include uppercase glyphs.
    const fontData = await fetchFontData(fontFamily, `${presentation.first} ${presentation.last}`, weight);
    const rendered = await renderNameImage(templateId, normalizedName, accentColor, { ...fontData, weight });

    const id = crypto.randomUUID();
    const asset = await saveAsset(id, rendered.data, {
      extension: "png",
      contentType: "image/png",
      width: rendered.width,
      height: rendered.height,
      alt: `${normalizedName} signature`,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof UnsupportedNameGlyphsError) return NextResponse.json({ fallback: "text" });
    if (error instanceof NameImageSizeError) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Name rendering failed." },
      { status: 500 }
    );
  }
}
