"use client";

import { useMemo, useRef, useState } from "react";

import { fontFamilyMap } from "@/lib/fonts";
import { splitName } from "@/lib/templates";
import type { AssetUploadResponse, SignatureDocument, SocialLink, SocialPlatform } from "@/lib/types";

import { InlineField } from "./inline-field";

interface SignatureEditorProps {
  document: SignatureDocument;
  imageUrl: string | null;
  unlocked: boolean;
  onChange: (mutator: (current: SignatureDocument) => SignatureDocument) => void;
  onFieldFocus: (label: string | null) => void;
  onImageUploaded: (asset: AssetUploadResponse["asset"]) => void;
  onImageRemoved: () => void;
}

type OptionalFieldKey = "phone" | "website" | "linkedin" | "x" | "instagram" | "github" | "cta";

const SOCIAL_LABEL: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  x: "X",
  instagram: "Instagram",
  github: "GitHub",
};

const SOCIAL_PLACEHOLDER: Record<SocialPlatform, string> = {
  linkedin: "linkedin.com/in/you",
  x: "x.com/you",
  instagram: "instagram.com/you",
  github: "github.com/you",
};

function getSocial(doc: SignatureDocument, platform: SocialPlatform): SocialLink | undefined {
  return doc.socials.find((s) => s.platform === platform);
}

function updateSocial(doc: SignatureDocument, platform: SocialPlatform, url: string): SignatureDocument {
  const existing = getSocial(doc, platform);
  if (existing) {
    return {
      ...doc,
      socials: doc.socials.map((s) => (s.platform === platform ? { ...s, url } : s)),
    };
  }
  return {
    ...doc,
    socials: [...doc.socials, { id: platform, platform, url }],
  };
}

export function SignatureEditor({
  document,
  imageUrl,
  unlocked,
  onChange,
  onFieldFocus,
  onImageUploaded,
  onImageRemoved,
}: SignatureEditorProps) {
  const [revealed, setRevealed] = useState<Set<OptionalFieldKey>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBold = document.templateId === "bold";
  const supportsImage = document.templateId === "edge" || document.templateId === "card";
  const fontFamily = fontFamilyMap[document.fontFamily] ?? fontFamilyMap["dm-sans"];

  const visible = useMemo(() => {
    const set = new Set<OptionalFieldKey>(revealed);
    if (document.phone) set.add("phone");
    if (document.website) set.add("website");
    for (const s of document.socials) {
      if (s.url) set.add(s.platform);
    }
    if (document.cta?.text || document.cta?.url) set.add("cta");
    return set;
  }, [document.phone, document.website, document.socials, document.cta, revealed]);

  const hidden = useMemo(() => {
    const all: OptionalFieldKey[] = ["phone", "website", "linkedin", "x", "instagram", "github", "cta"];
    return all.filter((k) => !visible.has(k));
  }, [visible]);

  function setName(value: string) {
    onChange((d) => ({ ...d, fullName: value }));
  }
  function setJobTitle(value: string) {
    onChange((d) => ({ ...d, jobTitle: value }));
  }
  function setCompany(value: string) {
    onChange((d) => ({ ...d, company: value }));
  }
  function setEmail(value: string) {
    onChange((d) => ({ ...d, email: value }));
  }
  function setPhone(value: string) {
    onChange((d) => ({ ...d, phone: value }));
  }
  function setWebsite(value: string) {
    onChange((d) => ({ ...d, website: value }));
  }
  function setSocial(platform: SocialPlatform, value: string) {
    onChange((d) => updateSocial(d, platform, value));
  }
  function setCtaText(value: string) {
    onChange((d) => ({ ...d, cta: { text: value, url: d.cta?.url ?? "" } }));
  }
  function setCtaUrl(value: string) {
    onChange((d) => ({ ...d, cta: { text: d.cta?.text ?? "", url: value } }));
  }

  function revealField(key: OptionalFieldKey) {
    const next = new Set(revealed);
    next.add(key);
    setRevealed(next);
    setAddOpen(false);
  }

  async function handleImagePicked(file: File) {
    setUploading(true);
    setImageError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/assets", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as AssetUploadResponse;
      onImageUploaded(data.asset);
    } catch {
      setImageError("Upload failed — try a smaller image.");
    } finally {
      setUploading(false);
    }
  }

  const { first, last } = splitName(document.fullName || "Your name");
  const initials = (document.fullName || "Your name")
    .split(" ")
    .slice(0, 2)
    .map((c) => c[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <div className="sig-editor" style={{ fontFamily }}>
      <div className={`sig-editor__card${supportsImage ? "" : " sig-editor__card--no-avatar"}`}>
        {supportsImage ? (
        <div className="sig-editor__avatar-slot">
          {imageUrl ? (
            <div className="sig-editor__avatar sig-editor__avatar--photo">
              <img alt={document.image?.alt ?? document.fullName} src={imageUrl} />
              <button
                aria-label="Remove headshot"
                className="sig-editor__avatar-remove"
                onClick={() => onImageRemoved()}
                type="button"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              aria-label="Add headshot"
              className="sig-editor__avatar"
              onClick={() => fileInputRef.current?.click()}
              style={{ background: document.accentColor }}
              type="button"
            >
              <span className="sig-editor__avatar-initials">{initials}</span>
              <span className="sig-editor__avatar-plus" aria-hidden="true">+</span>
            </button>
          )}
          {isUploading ? <span className="sig-editor__avatar-status">Uploading…</span> : null}
          {imageError ? <span className="sig-editor__avatar-status sig-editor__avatar-status--error">{imageError}</span> : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImagePicked(file);
              e.target.value = "";
            }}
          />
        </div>
        ) : null}

        <div className="sig-editor__body">
          {isBold ? (
            <div
              className="sig-editor__bold-name"
              style={{ ["--accent" as string]: document.accentColor }}
            >
              <InlineField
                id="sig-name-first"
                label="First name"
                value={first}
                onChange={(v) => setName(last ? `${v} ${last}` : v)}
                onFocus={onFieldFocus}
                placeholder="First"
                className="sig-editor__bold-name-input sig-editor__bold-name-input--first"
                minWidth={120}
              />
              <InlineField
                id="sig-name-last"
                label="Last name"
                value={last}
                onChange={(v) => setName(first ? `${first} ${v}` : v)}
                onFocus={onFieldFocus}
                placeholder="Last"
                className="sig-editor__bold-name-input sig-editor__bold-name-input--last"
                minWidth={120}
              />
              <div className="sig-editor__bold-rule" />
            </div>
          ) : (
            <InlineField
              id="sig-name"
              label="Name"
              value={document.fullName}
              onChange={setName}
              onFocus={onFieldFocus}
              placeholder="Your name"
              className="sig-editor__name-input"
              minWidth={120}
            />
          )}

          <div className="sig-editor__role">
            <InlineField
              id="sig-job"
              label="Title"
              value={document.jobTitle}
              onChange={setJobTitle}
              onFocus={onFieldFocus}
              placeholder="Job title"
              className="sig-editor__role-input"
            />
            <span aria-hidden="true" className="sig-editor__role-sep">·</span>
            <InlineField
              id="sig-company"
              label="Company"
              value={document.company}
              onChange={setCompany}
              onFocus={onFieldFocus}
              placeholder="Company"
              className="sig-editor__role-input"
            />
          </div>

          <div className="sig-editor__contacts">
            <InlineField
              id="sig-email"
              label="Email"
              value={document.email}
              onChange={setEmail}
              onFocus={onFieldFocus}
              placeholder="you@example.com"
              className="sig-editor__contact-input"
              minWidth={140}
            />
            {visible.has("phone") ? (
              <>
                <span aria-hidden="true" className="sig-editor__contact-sep">|</span>
                <InlineField
                  id="sig-phone"
                  label="Phone"
                  value={document.phone}
                  onChange={setPhone}
                  onFocus={onFieldFocus}
                  placeholder="+1 (555) 000-0000"
                  className="sig-editor__contact-input"
                  autoFocus={!document.phone}
                />
              </>
            ) : null}
            {visible.has("website") ? (
              <>
                <span aria-hidden="true" className="sig-editor__contact-sep">|</span>
                <InlineField
                  id="sig-website"
                  label="Website"
                  value={document.website}
                  onChange={setWebsite}
                  onFocus={onFieldFocus}
                  placeholder="yoursite.com"
                  className="sig-editor__contact-input"
                  autoFocus={!document.website}
                />
              </>
            ) : null}
          </div>

          {(["linkedin", "x", "instagram", "github"] as SocialPlatform[]).some((p) => visible.has(p)) ? (
            <div className="sig-editor__socials">
              {(["linkedin", "x", "instagram", "github"] as SocialPlatform[])
                .filter((p) => visible.has(p))
                .map((platform, idx) => (
                  <span className="sig-editor__social" key={platform}>
                    {idx > 0 ? <span aria-hidden="true" className="sig-editor__social-sep">·</span> : null}
                    <span className="sig-editor__social-label">{SOCIAL_LABEL[platform]}</span>
                    <InlineField
                      id={`sig-social-${platform}`}
                      label={SOCIAL_LABEL[platform]}
                      value={getSocial(document, platform)?.url ?? ""}
                      onChange={(v) => setSocial(platform, v)}
                      onFocus={onFieldFocus}
                      placeholder={SOCIAL_PLACEHOLDER[platform]}
                      className="sig-editor__social-input"
                      autoFocus={!getSocial(document, platform)?.url}
                    />
                  </span>
                ))}
            </div>
          ) : null}

          {visible.has("cta") ? (
            <div className="sig-editor__cta">
              <InlineField
                id="sig-cta-text"
                label="CTA label"
                value={document.cta?.text ?? ""}
                onChange={setCtaText}
                onFocus={onFieldFocus}
                placeholder="Book a call"
                className="sig-editor__cta-text"
                autoFocus={!document.cta?.text}
              />
              <span aria-hidden="true" className="sig-editor__cta-arrow">→</span>
              <InlineField
                id="sig-cta-url"
                label="CTA link"
                value={document.cta?.url ?? ""}
                onChange={setCtaUrl}
                onFocus={onFieldFocus}
                placeholder="calendly.com/you"
                className="sig-editor__cta-url"
              />
            </div>
          ) : null}

          {hidden.length > 0 ? (
            <div className="sig-editor__add-wrap">
              <button
                aria-expanded={addOpen}
                className="sig-editor__add"
                onClick={() => setAddOpen(!addOpen)}
                type="button"
              >
                + Add field
              </button>
              {addOpen ? (
                <div className="sig-editor__add-menu" role="menu">
                  {hidden.map((key) => (
                    <button
                      className="sig-editor__add-option"
                      key={key}
                      onClick={() => revealField(key)}
                      role="menuitem"
                      type="button"
                    >
                      {key === "phone" ? "Phone" : null}
                      {key === "website" ? "Website" : null}
                      {key === "linkedin" ? "LinkedIn" : null}
                      {key === "x" ? "X (Twitter)" : null}
                      {key === "instagram" ? "Instagram" : null}
                      {key === "github" ? "GitHub" : null}
                      {key === "cta" ? "Call-to-action button" : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {!unlocked ? (
            <div className="sig-editor__watermark">
              Made with <a href="https://siggy.app">Siggy</a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
