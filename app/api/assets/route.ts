import { NextResponse } from "next/server";
import sharp from "sharp";

import { verifyAccessToken } from "@/lib/billing/token";
import { saveAsset } from "@/lib/runtime";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const altValue = formData.get("alt");

  // Headshot upload is a paid feature — verify the access token server-side
  // so free users can't consume blob storage by calling the API directly.
  const tokenValue = formData.get("token");
  const claims = typeof tokenValue === "string" ? await verifyAccessToken(tokenValue) : null;
  if (!claims) {
    return NextResponse.json({ error: "unlock_required" }, { status: 403 });
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
  const pipeline = sharp(buffer).rotate().resize({
    width: 128,
    height: 128,
    fit: "cover"
  });
  const metadata = await pipeline.metadata();
  const id = crypto.randomUUID();
  const alt = typeof altValue === "string" && altValue.trim() ? altValue.trim() : "Profile image";

  let outputBuffer: Buffer;
  let extension: "jpg" | "png";
  let contentType: string;

  if (metadata.hasAlpha) {
    outputBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    extension = "png";
    contentType = "image/png";
  } else {
    outputBuffer = await pipeline.jpeg({ quality: 82 }).toBuffer();
    extension = "jpg";
    contentType = "image/jpeg";
  }

  const normalized = await sharp(outputBuffer).metadata();
  const asset = await saveAsset(id, outputBuffer, {
    extension,
    contentType,
    width: normalized.width ?? 128,
    height: normalized.height ?? 128,
    alt
  });

  return NextResponse.json({ asset });
}
