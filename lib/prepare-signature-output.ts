import { isSystemFont } from "./fonts";
import type { AssetUploadResponse, RenderResult, SignatureDocument } from "./types";

// Copy and download must use the same email-safe rendering, not the web-font preview.
export async function prepareSignatureOutput(
  document: SignatureDocument,
  token: string | null,
): Promise<RenderResult> {
  let outputDocument = { ...document, nameImage: null } as SignatureDocument;
  if (!isSystemFont(document.fontFamily)) {
    const response = await fetch("/api/render-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.fullName,
        fontFamily: document.fontFamily,
        accentColor: document.accentColor,
        templateId: document.templateId,
        token,
      }),
    });
    if (!response.ok) throw new Error("name_render_failed");
    const payload = (await response.json()) as AssetUploadResponse;
    outputDocument = { ...document, nameImage: payload.asset };
  }
  const response = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document: outputDocument, profileId: document.targetProfileId, token }),
  });
  if (!response.ok) throw new Error("render_failed");
  return (await response.json()) as RenderResult;
}
