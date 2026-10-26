import type { RenderWarning, SignatureDocument } from "./types";

export const FIELD_LIMITS = {
  fullName: 80, jobTitle: 80, company: 80, email: 120, phone: 32,
  website: 160, social: 160, ctaText: 60, ctaUrl: 160,
} as const;

export type ValidationIssue = RenderWarning & { field: string };

export function normalizeOutputText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function characterCount(value: string): number {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)).length;
  }
  return Array.from(value).length;
}

export function safeWebUrl(value: string, origin?: string): string {
  const raw = value.trim();
  if (!raw || /\s/.test(raw)) return "";
  try {
    const relative = raw.startsWith("/") && origin;
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
    const candidate = relative ? new URL(raw, origin) : new URL(hasScheme ? raw : `https://${raw.replace(/^\/+/, "")}`);
    if (!["http:", "https:"].includes(candidate.protocol) || !candidate.hostname || candidate.username || candidate.password) return "";
    // Preserve intentional URL spelling/query parameters; normalize only a bare domain.
    return relative ? candidate.toString() : hasScheme ? raw : `https://${raw.replace(/^\/+/, "")}`;
  } catch {
    return "";
  }
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@<>?&#]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(value.trim());
}

export function validateSignatureDocument(document: SignatureDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (field: string, code: string, message: string) => issues.push({ field, code, severity: "error", message });
  const labels: Record<string, string> = { fullName: "Full name", jobTitle: "Title", company: "Company", email: "Email", phone: "Phone", website: "Website" };
  for (const field of ["fullName", "jobTitle", "company", "email", "phone", "website"] as const) {
    if (characterCount(normalizeOutputText(document[field])) > FIELD_LIMITS[field]) {
      error(field, `${field}-too-long`, `${labels[field]} must be ${FIELD_LIMITS[field]} characters or fewer. Your draft is kept in full.`);
    }
  }
  if (!document.fullName.trim()) error("fullName", "missing-name", "Add a full name before copying the signature.");
  if (!document.email.trim()) error("email", "missing-email", "Add an email address so recipients have a reliable reply path.");
  else if (!isValidEmail(document.email)) error("email", "invalid-email", "Enter a valid email address, such as you@example.com.");
  if (document.website.trim() && !safeWebUrl(document.website)) error("website", "invalid-website", "Enter a valid website, such as example.com or https://example.com, without spaces.");
  for (const social of document.socials) {
    const raw = social.url.trim();
    if (!raw) continue;
    const handle = raw.replace(/^@/, "");
    const validHandle = social.platform === "instagram" ? /^[a-z0-9_.]+$/i.test(handle) : /^[a-z0-9_-]+$/i.test(handle);
    const linkedInPath = social.platform === "linkedin" && /^(?:in|company)\/[a-z0-9_-]+\/?$/i.test(raw);
    if (characterCount(raw) > FIELD_LIMITS.social || (!validHandle && !linkedInPath && !safeWebUrl(raw))) {
      error(`social-${social.platform}`, `invalid-social-${social.platform}`, `Enter a valid ${social.platform} handle or profile URL (${FIELD_LIMITS.social} characters or fewer).`);
    }
  }
  if (document.cta) {
    if (characterCount(normalizeOutputText(document.cta.text)) > FIELD_LIMITS.ctaText) error("cta-text", "cta-too-long", `Button text must be ${FIELD_LIMITS.ctaText} characters or fewer.`);
    if ((document.cta.text.trim() || document.cta.url.trim()) && (!document.cta.text.trim() || !safeWebUrl(document.cta.url) || characterCount(document.cta.url) > FIELD_LIMITS.ctaUrl)) {
      error("cta-url", "invalid-cta", "Add button text and a valid http or https link (160 characters or fewer).");
    }
  }
  return issues;
}
