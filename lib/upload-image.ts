import sharp from "sharp";

// Uploads and generated name images only need these Buffer decoders. Apply
// this allowlist before metadata parsing so unused formats cannot reach libvips.
sharp.block({ operation: ["VipsForeignLoad"] });
sharp.unblock({ operation: ["VipsForeignLoadPngBuffer", "VipsForeignLoadJpegBuffer", "VipsForeignLoadWebpBuffer"] });

export const MAX_HEADSHOT_PIXELS = 16_000_000;
export const MAX_HEADSHOT_DIMENSION = 8192;
const PNG_HEADER = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SIZE_ERROR = "Image must be no larger than 16 megapixels or 8192 pixels on either side.";

function rasterFormat(buffer: Buffer): "png" | "jpeg" | "webp" | null {
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(PNG_HEADER) && buffer.toString("ascii", 12, 16) === "IHDR") return "png";
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "jpeg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

function checkDimensions(width: number | undefined, height: number | undefined) {
  if (!width || !height || width > MAX_HEADSHOT_DIMENSION || height > MAX_HEADSHOT_DIMENSION || width > MAX_HEADSHOT_PIXELS / height) throw new Error(SIZE_ERROR);
}

export async function normalizeHeadshot(buffer: Buffer) {
  const format = rasterFormat(buffer);
  if (!format) throw new Error("Upload an actual PNG, JPEG, or WebP image.");
  // PNG exposes dimensions in its fixed header; reject oversized claims before
  // even asking a native decoder for metadata.
  if (format === "png") checkDimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20));

  const pipeline = sharp(buffer, { limitInputPixels: MAX_HEADSHOT_PIXELS, failOn: "warning", pages: 1 })
    .rotate().resize({ width: 128, height: 128, fit: "cover" });
  const metadata = await pipeline.metadata();
  if (metadata.format !== format) throw new Error("Image contents do not match a supported image format.");
  checkDimensions(metadata.width, metadata.height);

  const extension = metadata.hasAlpha ? "png" as const : "jpg" as const;
  const contentType = extension === "png" ? "image/png" : "image/jpeg";
  const data = metadata.hasAlpha
    ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
    : await pipeline.jpeg({ quality: 82 }).toBuffer();
  return { data, extension, contentType, width: 128, height: 128 };
}
