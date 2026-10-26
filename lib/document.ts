import { createDefaultDocument } from "./default-document";
import { fontOptions } from "./fonts";
import { normalizeOutputText, safeWebUrl } from "./validation";
import type {
  ClientProfileId,
  SignatureDocument,
  SignatureImageAsset,
  SocialLink,
  SocialPlatform,
  TemplateId
} from "./types";

const templateIds: TemplateId[] = [
  "edge",
  "bold",
  "card",
  "clean"
];

const clientProfileIds: ClientProfileId[] = [
  "gmail_web",
  "outlook_web",
  "outlook_windows_classic",
  "apple_mail"
];

const socialPlatforms: SocialPlatform[] = ["linkedin", "x", "instagram", "github"];

export function coerceSignatureDocument(input: unknown): SignatureDocument {
  const fallback = createDefaultDocument();
  const record = isRecord(input) ? input : {};
  const meta = isRecord(record.meta) ? record.meta : {};

  return {
    version: 1,
    templateId: pickTemplate(record.templateId, fallback.templateId),
    targetProfileId: pickClientProfile(record.targetProfileId, fallback.targetProfileId),
    fullName: normalizeText(record.fullName, fallback.fullName),
    jobTitle: normalizeText(record.jobTitle, fallback.jobTitle),
    company: normalizeText(record.company, fallback.company),
    email: normalizeEmail(record.email, fallback.email),
    phone: normalizeText(record.phone, fallback.phone),
    website: normalizeUrl(record.website, fallback.website),
    accentColor: normalizeHexColor(record.accentColor, fallback.accentColor),
    fontFamily: pickFontFamily(record.fontFamily, fallback.fontFamily),
    image: normalizeImage(record.image),
    nameImage: normalizeImage(record.nameImage),
    socials: normalizeSocials(record.socials),
    cta: record.cta && typeof record.cta === "object"
      ? { text: normalizeText((record.cta as Record<string, unknown>).text, ""), url: normalizeText((record.cta as Record<string, unknown>).url, "") }
      : null,
    meta: {
      updatedAt: normalizeTimestamp(meta.updatedAt, fallback.meta.updatedAt),
      draftName: normalizeText(meta.draftName, fallback.meta.draftName)
    }
  };
}

// Draft loading preserves user input. Only an export snapshot is normalized;
// validation reports limits instead of silently cutting names or saved fields.
export function normalizeSignatureForOutput(input: unknown): SignatureDocument {
  const document = coerceSignatureDocument(input);
  return {
    ...document,
    fullName: normalizeOutputText(document.fullName),
    jobTitle: normalizeOutputText(document.jobTitle),
    company: normalizeOutputText(document.company),
    email: document.email.trim().toLowerCase(),
    phone: normalizeOutputText(document.phone),
    website: document.website.trim(),
    socials: document.socials.map(social => ({ ...social, url: social.url.trim() })),
    cta: document.cta ? { text: normalizeOutputText(document.cta.text), url: document.cta.url.trim() } : null,
  };
}

export function createImportedDocument(text: string): SignatureDocument {
  return coerceSignatureDocument(JSON.parse(text));
}

export function touchDocument(document: SignatureDocument): SignatureDocument {
  return {
    ...document,
    meta: {
      ...document.meta,
      updatedAt: new Date().toISOString()
    }
  };
}

export function resolveUrlForHtml(url: string, origin?: string): string {
  return safeWebUrl(url, origin);
}

// Accept the handle people naturally type into a platform-specific field,
// while preserving complete profile URLs and existing saved drafts.
export function resolveSocialUrlForHtml(platform: SocialPlatform, value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return safeWebUrl(raw);
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return "";
  if (/^(?:www\.)?(?:linkedin\.com|x\.com|twitter\.com|instagram\.com|github\.com)(?:\/|$)/i.test(raw)) {
    return resolveUrlForHtml(raw);
  }
  if (platform === "linkedin" && /^(?:in|company)\//i.test(raw)) {
    return `https://www.linkedin.com/${raw}`;
  }
  const handle = raw.replace(/^@/, "");
  const isHandle = platform === "instagram" ? /^[a-z0-9_.]+$/i.test(handle) : /^[a-z0-9_-]+$/i.test(handle);
  if (isHandle) {
    const base: Record<SocialPlatform, string> = {
      linkedin: "https://www.linkedin.com/in/",
      x: "https://x.com/",
      instagram: "https://www.instagram.com/",
      github: "https://github.com/",
    };
    return `${base[platform]}${handle}`;
  }
  return resolveUrlForHtml(raw);
}

export function isLocalOrigin(origin?: string): boolean {
  return Boolean(origin && /localhost|127\.0\.0\.1/i.test(origin));
}

export function getFilledSocials(document: SignatureDocument): SocialLink[] {
  return document.socials.filter((social) => resolveSocialUrlForHtml(social.platform, social.url).length > 0);
}

function pickTemplate(value: unknown, fallback: TemplateId): TemplateId {
  return typeof value === "string" && templateIds.includes(value as TemplateId)
    ? (value as TemplateId)
    : fallback;
}

function pickClientProfile(value: unknown, fallback: ClientProfileId): ClientProfileId {
  return typeof value === "string" && clientProfileIds.includes(value as ClientProfileId)
    ? (value as ClientProfileId)
    : fallback;
}

function pickFontFamily(value: unknown, fallback: string): string {
  if (value === "space-grotesk" || value === "syne") return "libre-baskerville";
  return typeof value === "string" && fontOptions.some((font) => font.id === value)
    ? value
    : fallback;
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return value;
}

function normalizeEmail(value: unknown, fallback: string): string {
  return normalizeText(value, fallback);
}

function normalizeUrl(value: unknown, fallback: string): string {
  const raw = normalizeText(value, fallback);
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return raw;
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function normalizeImage(value: unknown): SignatureImageAsset | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : crypto.randomUUID();
  const url = typeof value.url === "string" ? value.url : "";
  const width = typeof value.width === "number" ? value.width : 96;
  const height = typeof value.height === "number" ? value.height : 96;
  const alt = typeof value.alt === "string" ? value.alt : "Profile image";
  const contentType = typeof value.contentType === "string" ? value.contentType : undefined;

  if (!url) {
    return null;
  }

  return {
    id,
    url,
    width,
    height,
    alt,
    contentType
  };
}

function normalizeSocials(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) {
    return createDefaultDocument().socials;
  }

  const normalized = value
    .filter(isRecord)
    .slice(0, 4)
    .map((social, index) => ({
      id: typeof social.id === "string" ? social.id : crypto.randomUUID(),
      platform: pickPlatform(social.platform, socialPlatforms[index] ?? "linkedin"),
      url: normalizeUrl(social.url, "")
    }));

  while (normalized.length < 4) {
    normalized.push({
      id: crypto.randomUUID(),
      platform: socialPlatforms[normalized.length],
      url: ""
    });
  }

  return normalized;
}

function pickPlatform(value: unknown, fallback: SocialPlatform): SocialPlatform {
  return typeof value === "string" && socialPlatforms.includes(value as SocialPlatform)
    ? (value as SocialPlatform)
    : fallback;
}

function normalizeTimestamp(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return Number.isNaN(Date.parse(value)) ? fallback : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
