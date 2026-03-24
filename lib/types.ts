import type React from "react";

export type TemplateId =
  | "edge"
  | "bold"
  | "card"
  | "clean";

export type ClientProfileId =
  | "gmail_web"
  | "outlook_web"
  | "outlook_windows_classic"
  | "apple_mail";

export type WarningSeverity = "info" | "warn" | "error";

export type SocialPlatform = "linkedin" | "x" | "instagram" | "github";

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
}

export interface SignatureImageAsset {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  contentType?: string;
}

export interface SignatureDocument {
  version: 1;
  templateId: TemplateId;
  targetProfileId: ClientProfileId;
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  accentColor: string;
  fontFamily: string;
  image: SignatureImageAsset | null;
  nameImage: SignatureImageAsset | null;
  socials: SocialLink[];
  cta: {
    text: string;
    url: string;
  } | null;
  meta: {
    updatedAt: string;
    draftName: string;
  };
}

export interface RenderWarning {
  code: string;
  severity: WarningSeverity;
  message: string;
  profileIds?: ClientProfileId[];
}

export interface SizeBudget {
  charCount: number;
  softLimit: number;
  hardLimit: number;
  status: "ok" | "warn" | "overflow";
}

export interface RenderResult {
  html: string;
  plainText: string;
  warnings: RenderWarning[];
  sizeBudget: SizeBudget;
  assetRefs: SignatureImageAsset[];
}

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  headline: string;
  supportsImage: boolean;
  render: (doc: SignatureDocument, context: TemplateRenderContext) => React.ReactElement;
}

export interface TemplateRenderContext {
  accentColor: string;
  imageUrl: string | null;
  nameImageUrl: string | null;
  nameImageWidth: number | null;
  nameImageHeight: number | null;
  profileId: ClientProfileId;
  unlocked: boolean;
}

export interface ClientProfile {
  id: ClientProfileId;
  label: string;
  launchStatus: "public" | "planned";
  installSurface: string;
  softLimit: number;
  hardLimit: number;
  transform: (html: string) => string;
  validate: (html: string, doc: SignatureDocument) => RenderWarning[];
}

export interface AnalyticsEvent {
  sessionId: string;
  event: string;
  ts: string;
  context?: Record<string, boolean | number | string | null>;
}

export interface PersistenceAdapter {
  load: () => SignatureDocument | null;
  save: (document: SignatureDocument) => void;
  clear: () => void;
}

export interface AssetUploadResponse {
  asset: SignatureImageAsset;
}
