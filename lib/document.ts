import { createDefaultDocument } from "./default-document";
import type {
  ClientProfileId,
  SignatureDocument,
  SignatureImageAsset,
  SocialLink,
  SocialPlatform,
  TemplateId
} from "./types";

const templateIds: TemplateId[] = [
  "studio-split",
  "mono-stack",
  "accent-column",
  "compact-row",
  "executive-card",
  "minimal-rail"
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
    fullName: normalizeText(record.fullName, fallback.fullName, 80),
    jobTitle: normalizeText(record.jobTitle, fallback.jobTitle, 80),
    company: normalizeText(record.company, fallback.company, 80),
    email: normalizeEmail(record.email, fallback.email),
    phone: normalizeText(record.phone, fallback.phone, 32),
    website: normalizeUrl(record.website, fallback.website),
    accentColor: normalizeHexColor(record.accentColor, fallback.accentColor),
    image: normalizeImage(record.image),
    socials: normalizeSocials(record.socials),
    meta: {
      updatedAt: normalizeTimestamp(meta.updatedAt, fallback.meta.updatedAt),
      draftName: normalizeText(meta.draftName, fallback.meta.draftName, 60)
    }
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
  if (!url.trim()) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("/") && origin) {
    return new URL(url, origin).toString();
  }

  return `https://${url.replace(/^\/+/, "")}`;
}

export function isLocalOrigin(origin?: string): boolean {
  return Boolean(origin && /localhost|127\.0\.0\.1/i.test(origin));
}

export function getFilledSocials(document: SignatureDocument): SocialLink[] {
  return document.socials.filter((social) => social.url.trim().length > 0);
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

function normalizeText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : "";
}

function normalizeEmail(value: unknown, fallback: string): string {
  const normalized = normalizeText(value, fallback, 120).toLowerCase();
  return normalized;
}

function normalizeUrl(value: unknown, fallback: string): string {
  const raw = normalizeText(value, fallback, 160);
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
