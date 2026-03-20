import type { ClientProfile, ClientProfileId, RenderWarning, SignatureDocument } from "./types";

const unsupportedCssPatterns: Array<[RegExp, string]> = [
  [/display:\s*flex/i, "Avoid flexbox so Outlook compatibility stays clean."],
  [/gap:\s*\d/i, "Avoid CSS gap in rendered HTML for broad email client support."],
  [/position:\s*(absolute|fixed|sticky)/i, "Avoid positioned layout in signature output."],
  [/<style[\s>]/i, "Do not rely on embedded style tags in copied signature HTML."],
  [/font-family:\s*['"][^'"]+['"]/i, "Prefer broadly available system-safe fonts in signature output."]
];

function createCompatibilityWarnings(html: string): RenderWarning[] {
  return unsupportedCssPatterns.flatMap(([pattern, message], index) =>
    pattern.test(html)
      ? [
          {
            code: `compatibility-${index + 1}`,
            severity: "warn" as const,
            message,
            profileIds: ["outlook_web", "outlook_windows_classic", "apple_mail"]
          }
        ]
      : []
  );
}

function createSharedWarnings(html: string, document: SignatureDocument): RenderWarning[] {
  const warnings: RenderWarning[] = [];

  if (!document.fullName.trim()) {
    warnings.push({
      code: "missing-name",
      severity: "error",
      message: "Add a full name before copying the signature.",
      profileIds: ["gmail_web", "outlook_web", "outlook_windows_classic", "apple_mail"]
    });
  }

  if (!document.email.trim()) {
    warnings.push({
      code: "missing-email",
      severity: "error",
      message: "Add an email address so recipients have a reliable reply path.",
      profileIds: ["gmail_web", "outlook_web", "outlook_windows_classic", "apple_mail"]
    });
  }

  return [...warnings, ...createCompatibilityWarnings(html)];
}

function normalizeHtml(html: string): string {
  return html.replace(/\n+/g, "").replace(/>\s+</g, "><").trim();
}

export const clientProfiles: Record<ClientProfileId, ClientProfile> = {
  gmail_web: {
    id: "gmail_web",
    label: "Gmail web",
    launchStatus: "public",
    installSurface: "Gmail settings on desktop",
    softLimit: 7500,
    hardLimit: 10000,
    transform: normalizeHtml,
    validate: (html, document) => {
      const warnings = createSharedWarnings(html, document);

      if (html.length > 7500) {
        warnings.push({
          code: "gmail-size-soft-limit",
          severity: html.length > 10000 ? "error" : "warn",
          message:
            html.length > 10000
              ? "This signature is likely too large for Gmail's signature limit."
              : "This signature is approaching Gmail's signature size limit.",
          profileIds: ["gmail_web"]
        });
      }

      return warnings;
    }
  },
  outlook_web: {
    id: "outlook_web",
    label: "Outlook web",
    launchStatus: "planned",
    installSurface: "Outlook on the web and new Outlook",
    softLimit: 7000,
    hardLimit: 9500,
    transform: normalizeHtml,
    validate: (html, document) => {
      const warnings = createSharedWarnings(html, document);

      if (/border-radius:\s*\d/i.test(html)) {
        warnings.push({
          code: "outlook-border-radius",
          severity: "info",
          message: "Rounded corners may render inconsistently in some Outlook surfaces.",
          profileIds: ["outlook_web", "outlook_windows_classic"]
        });
      }

      return warnings;
    }
  },
  outlook_windows_classic: {
    id: "outlook_windows_classic",
    label: "Outlook classic",
    launchStatus: "planned",
    installSurface: "Classic Outlook for Windows",
    softLimit: 6500,
    hardLimit: 9000,
    transform: normalizeHtml,
    validate: (html, document) => {
      const warnings = createSharedWarnings(html, document);

      if (/border-radius:\s*\d/i.test(html)) {
        warnings.push({
          code: "outlook-classic-radius",
          severity: "warn",
          message: "Classic Outlook may flatten rounded corners. Keep layout table-first.",
          profileIds: ["outlook_windows_classic"]
        });
      }

      return warnings;
    }
  },
  apple_mail: {
    id: "apple_mail",
    label: "Apple Mail",
    launchStatus: "planned",
    installSurface: "Mail on macOS",
    softLimit: 8000,
    hardLimit: 11000,
    transform: normalizeHtml,
    validate: (html, document) => createSharedWarnings(html, document)
  }
};
