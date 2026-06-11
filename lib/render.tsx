import React from "react";

import { clientProfiles } from "./client-profiles";
import { coerceSignatureDocument, getFilledSocials, isLocalOrigin, resolveUrlForHtml } from "./document";
import { DEFAULT_FREE_FONT, isSystemFont } from "./fonts";
import { getTemplateDefinition } from "./templates";
import type { ClientProfileId, RenderResult, RenderWarning, SignatureDocument } from "./types";

interface RenderOptions {
  origin?: string;
  profileId?: ClientProfileId;
  unlocked?: boolean;
}

// Custom fonts (delivered as name images) and headshots are paid features.
// Enforce here, not in the UI — the render API is reachable directly.
function enforceFreeTier(document: SignatureDocument): SignatureDocument {
  return {
    ...document,
    fontFamily: isSystemFont(document.fontFamily) ? document.fontFamily : DEFAULT_FREE_FONT,
    image: null,
    nameImage: null
  };
}

export async function renderSignature(
  input: SignatureDocument | unknown,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const unlocked = options.unlocked ?? false;
  const coerced = coerceSignatureDocument(input);
  const document = unlocked ? coerced : enforceFreeTier(coerced);
  const profile = clientProfiles[options.profileId ?? document.targetProfileId];
  const template = getTemplateDefinition(document.templateId);
  const imageUrl = document.image ? resolveUrlForHtml(document.image.url, options.origin) : null;
  const nameImageUrl = document.nameImage ? resolveUrlForHtml(document.nameImage.url, options.origin) : null;

  const canonicalHtml = renderToStaticMarkup(
    <div data-siggy-profile={profile.id} data-siggy-template={template.id}>
      {template.render(document, {
        accentColor: document.accentColor,
        imageUrl,
        nameImageUrl,
        nameImageWidth: document.nameImage?.width ?? null,
        nameImageHeight: document.nameImage?.height ?? null,
        profileId: profile.id,
        unlocked
      })}
    </div>
  );

  const html = profile.transform(canonicalHtml);
  const warnings = dedupeWarnings([
    ...profile.validate(html, document),
    ...createOriginWarnings(document, options.origin),
    ...createContentWarnings(document)
  ]);

  const charCount = html.length;
  const sizeBudget = {
    charCount,
    softLimit: profile.softLimit,
    hardLimit: profile.hardLimit,
    status: charCount > profile.hardLimit ? "overflow" : charCount > profile.softLimit ? "warn" : "ok"
  } as const;

  return {
    html,
    plainText: buildPlainText(document),
    warnings,
    sizeBudget,
    assetRefs: document.image
      ? [
          {
            ...document.image,
            url: imageUrl ?? document.image.url
          }
        ]
      : []
  };
}

function createOriginWarnings(document: SignatureDocument, origin?: string): RenderWarning[] {
  if (!document.image || !origin || !isLocalOrigin(origin)) {
    return [];
  }

  return [
    {
      code: "localhost-image-hosting",
      severity: "warn",
      message:
        "Uploaded images are currently hosted on localhost. Deploy Siggy before using image-based signatures in production.",
      profileIds: ["gmail_web", "outlook_web", "outlook_windows_classic", "apple_mail"]
    }
  ];
}

function createContentWarnings(document: SignatureDocument): RenderWarning[] {
  const warnings: RenderWarning[] = [];

  if (document.website.length > 60) {
    warnings.push({
      code: "long-website",
      severity: "info",
      message: "Long website URLs can make compact templates wrap earlier than expected."
    });
  }

  if (document.fullName.length + document.jobTitle.length + document.company.length > 120) {
    warnings.push({
      code: "dense-header",
      severity: "info",
      message: "This content is fairly dense. Check the preview before copying."
    });
  }

  if (getFilledSocials(document).length > 3) {
    warnings.push({
      code: "social-density",
      severity: "info",
      message: "More than three social links can push signatures toward wrapping in tighter clients."
    });
  }

  return warnings;
}

function buildPlainText(document: SignatureDocument): string {
  const lines = [
    document.fullName,
    [document.jobTitle, document.company].filter(Boolean).join(" · "),
    document.phone,
    document.email,
    document.website,
    ...getFilledSocials(document).map((social) => `${social.platform}: ${resolveUrlForHtml(social.url)}`)
  ].filter(Boolean);

  return lines.join("\n");
}

function dedupeWarnings(warnings: RenderWarning[]): RenderWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
