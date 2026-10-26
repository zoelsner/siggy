import { NextResponse } from "next/server";

import { GATES } from "@/lib/billing/gates";
import { verifyAccessToken } from "@/lib/billing/token";
import { saveAsset } from "@/lib/runtime";
import { normalizeHeadshot } from "@/lib/upload-image";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid upload form." }, { status: 400 });
  const file = formData.get("file");
  const altValue = formData.get("alt");

  // When headshots are gated, verify the access token server-side so free
  // users can't consume blob storage by calling the API directly.
  if (GATES.headshot) {
    const tokenValue = formData.get("token");
    const claims = typeof tokenValue === "string" ? await verifyAccessToken(tokenValue) : null;
    if (!claims) {
      return NextResponse.json({ error: "unlock_required" }, { status: 403 });
    }
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
  }

  if (file.size > 4_000_000) {
    return NextResponse.json({ error: "Image must be smaller than 4MB." }, { status: 400 });
  }

  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, and WebP uploads are supported." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let image: Awaited<ReturnType<typeof normalizeHeadshot>>;
  try {
    image = await normalizeHeadshot(buffer);
  } catch {
    return NextResponse.json({ error: "Invalid image. Use a PNG, JPEG, or WebP smaller than 4MB, up to 16 megapixels and 8192 pixels per side." }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const alt = typeof altValue === "string" && altValue.trim() ? altValue.trim() : "Profile image";

  const asset = await saveAsset(id, image.data, {
    extension: image.extension,
    contentType: image.contentType,
    width: image.width,
    height: image.height,
    alt
  });

  return NextResponse.json({ asset });
}
