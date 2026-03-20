import { put } from "@vercel/blob";

import type { AnalyticsEvent, SignatureImageAsset } from "./types";

export async function saveAsset(
  id: string,
  buffer: Buffer,
  meta: { extension: string; contentType: string; width: number; height: number; alt: string }
): Promise<SignatureImageAsset> {
  const filename = `${id}.${meta.extension}`;

  const blob = await put(filename, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: meta.contentType,
  });

  return {
    id,
    url: blob.url,
    width: meta.width,
    height: meta.height,
    alt: meta.alt,
    contentType: meta.contentType,
  };
}

export async function appendEvent(event: AnalyticsEvent) {
  console.log("[analytics]", JSON.stringify(event));
}
