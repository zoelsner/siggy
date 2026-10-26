import { isSystemFont } from "./fonts";
import { normalizeSignatureForOutput } from "./document";
import { validateSignatureDocument } from "./validation";
import type { AssetUploadResponse, RenderResult, SignatureDocument } from "./types";

// Copy and download must use the same email-safe rendering, not the web-font preview.
export async function prepareSignatureOutput(
  document: SignatureDocument,
  token: string | null,
): Promise<RenderResult> {
  const issues = validateSignatureDocument(document);
  if (issues.length) throw new Error(issues[0].message);
  document = normalizeSignatureForOutput(document);
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
    if (!response.ok) {
      if (response.status === 422) {
        const problem = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(problem?.error ?? "Name is too wide for an email signature.");
      }
      throw new Error("name_render_failed");
    }
    const payload = (await response.json()) as AssetUploadResponse & { fallback?: "text" };
    outputDocument = payload.fallback === "text"
      ? { ...document, fontFamily: "arial", nameImage: null }
      : { ...document, nameImage: payload.asset };
  }
  const response = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document: outputDocument, profileId: document.targetProfileId, token }),
  });
  if (!response.ok) throw new Error("render_failed");
  const result = (await response.json()) as RenderResult;
  if (result.warnings?.some(warning => warning.severity === "error") || result.sizeBudget?.status === "overflow") throw new Error("Fix signature errors before copying or exporting.");
  return result;
}
