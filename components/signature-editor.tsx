"use client";

import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import { fontFamilyMap } from "@/lib/fonts";
import { splitName } from "@/lib/templates";
import type { AssetUploadResponse, SignatureDocument, SocialLink, SocialPlatform } from "@/lib/types";

import { InlineField } from "./inline-field";

interface SignatureEditorProps {
  document: SignatureDocument;
  imageUrl: string | null;
  unlocked: boolean;
  token: string | null;
  onChange: (mutator: (current: SignatureDocument) => SignatureDocument) => void;
  onFieldFocus: (label: string | null) => void;
  onImageUploaded: (asset: AssetUploadResponse["asset"]) => void;
  onImageRemoved: () => void;
  onUpsell: (source: string) => void;
}

type OptionalFieldKey = "phone" | "website" | "linkedin" | "x" | "instagram" | "github" | "cta";
type CropDraft = {
  file: File;
  url: string;
  x: number;
  y: number;
  scale: number;
};
type CropDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

const CROP_PREVIEW_SIZE = 224;
const CROP_OUTPUT_SIZE = 512;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCroppedImageBlob(draft: CropDraft): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = window.document.createElement("canvas");
      canvas.width = CROP_OUTPUT_SIZE;
      canvas.height = CROP_OUTPUT_SIZE;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas unavailable"));
        return;
      }

      context.clearRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
      const baseScale = Math.max(CROP_OUTPUT_SIZE / image.naturalWidth, CROP_OUTPUT_SIZE / image.naturalHeight);
      const drawScale = baseScale * draft.scale;
      const drawWidth = image.naturalWidth * drawScale;
      const drawHeight = image.naturalHeight * drawScale;
      const offsetScale = CROP_OUTPUT_SIZE / CROP_PREVIEW_SIZE;
      const dx = (CROP_OUTPUT_SIZE - drawWidth) / 2 + draft.x * offsetScale;
      const dy = (CROP_OUTPUT_SIZE - drawHeight) / 2 + draft.y * offsetScale;

      context.drawImage(image, dx, dy, drawWidth, drawHeight);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Crop failed"));
          return;
        }
        resolve(blob);
      }, "image/png");
    };
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = draft.url;
  });
}

export function SignatureEditor({
  document,
  imageUrl,
  unlocked,
  token,
  onChange,
  onFieldFocus,
  onImageUploaded,
  onImageRemoved,
  onUpsell,
}: SignatureEditorProps) {
  const [revealed, setRevealed] = useState<Set<OptionalFieldKey>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropDragRef = useRef<CropDrag | null>(null);
  const cropDraftRef = useRef<CropDraft | null>(null);

  cropDraftRef.current = cropDraft;
  useEffect(() => {
    return () => {
      if (cropDraftRef.current) URL.revokeObjectURL(cropDraftRef.current.url);
    };
  }, []);

  const isBold = document.templateId === "bold";
  const isEdge = document.templateId === "edge";
  const isCard = document.templateId === "card";
  const isClean = document.templateId === "clean";
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

  function clearCropDraft() {
    if (cropDraft) URL.revokeObjectURL(cropDraft.url);
    setCropDraft(null);
    cropDragRef.current = null;
  }

  function handleImageSelected(file: File) {
    setImageError(null);
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      setImageError("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 4_000_000) {
      setImageError("Image must be smaller than 4MB.");
      return;
    }

    if (cropDraft) URL.revokeObjectURL(cropDraft.url);
    setCropDraft({
      file,
      url: URL.createObjectURL(file),
      x: 0,
      y: 0,
      scale: 1,
    });
  }

  async function handleImagePicked(file: File) {
    setUploading(true);
    setImageError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("alt", `${document.fullName} headshot`);
      if (token) form.append("token", token);
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

  async function applyCrop() {
    if (!cropDraft || isUploading) return;

    try {
      const blob = await getCroppedImageBlob(cropDraft);
      const croppedFile = new File([blob], "siggy-headshot-crop.png", { type: "image/png" });
      clearCropDraft();
      await handleImagePicked(croppedFile);
    } catch {
      setImageError("Crop failed — try a different image.");
    }
  }

  function handleCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!cropDraft) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cropDraft.x,
      originY: cropDraft.y,
    };
  }

  function handleCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;
    if (!cropDraft || !drag || drag.pointerId !== event.pointerId) return;

    const limit = 96 * cropDraft.scale;
    setCropDraft({
      ...cropDraft,
      x: clamp(drag.originX + event.clientX - drag.startX, -limit, limit),
      y: clamp(drag.originY + event.clientY - drag.startY, -limit, limit),
    });
  }

  function handleCropPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (cropDragRef.current?.pointerId === event.pointerId) {
      cropDragRef.current = null;
    }
  }

  const { first, last } = splitName(document.fullName || "Your name");
  const initials = (document.fullName || "Your name")
    .split(" ")
    .slice(0, 2)
    .map((c) => c[0] ?? "")
    .join("")
    .toUpperCase();
  const websiteDisplay = document.website.replace(/^https?:\/\//i, "");
  const socialPlatforms = ["linkedin", "x", "instagram", "github"] as SocialPlatform[];
  const hasSocials = socialPlatforms.some((p) => visible.has(p));

  const avatarSlot = supportsImage ? (
    <div className="sig-editor__avatar-slot">
      {imageUrl ? (
        <div className="sig-editor__avatar sig-editor__avatar--photo">
          <img alt={document.image?.alt ?? document.fullName} src={imageUrl} />
          <button
            aria-label="Change headshot"
            className="sig-editor__avatar-change"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            Adjust
          </button>
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
          aria-label={unlocked ? "Add headshot" : "Headshot unlocks with Siggy — $19"}
          className="sig-editor__avatar"
          onClick={() => (unlocked ? fileInputRef.current?.click() : onUpsell("editor_headshot"))}
          style={{ background: document.accentColor }}
          type="button"
        >
          <span className="sig-editor__avatar-initials">{initials}</span>
          <span className="sig-editor__avatar-plus" aria-hidden="true">{unlocked ? "+" : "🔒"}</span>
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
              if (file) handleImageSelected(file);
              e.target.value = "";
            }}
          />
        </div>
  ) : null;

  const socialsBlock = hasSocials ? (
    <div className="sig-editor__socials">
      {socialPlatforms
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
  ) : null;

  const ctaBlock = visible.has("cta") ? (
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
  ) : null;

  const addFieldBlock = hidden.length > 0 ? (
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
  ) : null;

  const watermarkBlock = !unlocked ? (
    <div className="sig-editor__watermark">
      Made with Siggy
      <button
        className="sig-editor__watermark-remove"
        onClick={() => onUpsell("editor_watermark")}
        type="button"
      >
        Remove — $19
      </button>
    </div>
  ) : null;

  return (
    <>
    <div className="sig-editor" style={{ fontFamily }}>
      <div
        className={`sig-editor__card sig-editor__card--${document.templateId}${supportsImage ? "" : " sig-editor__card--no-avatar"}`}
        style={{ ["--accent" as string]: document.accentColor }}
      >
        {isEdge ? (
          <>
            <div className="sig-editor__edge-bar" aria-hidden="true" />
            <div className="sig-editor__edge-content">
              {avatarSlot}
              <div className="sig-editor__body sig-editor__edge-body">
                <InlineField
                  id="sig-name"
                  label="Name"
                  value={document.fullName}
                  onChange={setName}
                  onFocus={onFieldFocus}
                  placeholder="Your name"
                  className="sig-editor__edge-name-input sig-editor__edge-name-input--accent"
                  minWidth={120}
                />
                <div className="sig-editor__edge-role">
                  <InlineField
                    id="sig-job"
                    label="Title"
                    value={document.jobTitle}
                    onChange={setJobTitle}
                    onFocus={onFieldFocus}
                    placeholder="Job title"
                    className="sig-editor__edge-role-input"
                  />
                  <span>at</span>
                  <InlineField
                    id="sig-company"
                    label="Company"
                    value={document.company}
                    onChange={setCompany}
                    onFocus={onFieldFocus}
                    placeholder="Company"
                    className="sig-editor__edge-role-input"
                  />
                </div>
                <div className="sig-editor__edge-contacts">
                  <div className="sig-editor__edge-contact-row">
                    <span className="sig-editor__edge-icon" aria-hidden="true">✉</span>
                    <InlineField
                      id="sig-email"
                      label="Email"
                      value={document.email}
                      onChange={setEmail}
                      onFocus={onFieldFocus}
                      placeholder="you@example.com"
                      className="sig-editor__edge-contact-input sig-editor__edge-contact-input--accent"
                      minWidth={140}
                    />
                  </div>
                  {visible.has("phone") ? (
                    <div className="sig-editor__edge-contact-row">
                      <span className="sig-editor__edge-icon" aria-hidden="true">☏</span>
                      <InlineField
                        id="sig-phone"
                        label="Phone"
                        value={document.phone}
                        onChange={setPhone}
                        onFocus={onFieldFocus}
                        placeholder="+1 (555) 000-0000"
                        className="sig-editor__edge-contact-input"
                        autoFocus={!document.phone}
                      />
                    </div>
                  ) : null}
                  {visible.has("website") ? (
                    <div className="sig-editor__edge-contact-row">
                      <span className="sig-editor__edge-icon" aria-hidden="true">⊕</span>
                      <InlineField
                        id="sig-website"
                        label="Website"
                        value={websiteDisplay}
                        onChange={setWebsite}
                        onFocus={onFieldFocus}
                        placeholder="yoursite.com"
                        className="sig-editor__edge-contact-input sig-editor__edge-contact-input--accent"
                        autoFocus={!document.website}
                      />
                    </div>
                  ) : null}
                </div>
                {socialsBlock}
                {ctaBlock}
                {addFieldBlock}
                {watermarkBlock}
              </div>
            </div>
          </>
        ) : null}

        {isCard ? (
          <>
            {avatarSlot}
            <div className="sig-editor__body sig-editor__card-body">
              <InlineField
                id="sig-name"
                label="Name"
                value={document.fullName}
                onChange={setName}
                onFocus={onFieldFocus}
                placeholder="Your name"
                className="sig-editor__card-name-input sig-editor__card-name-input--accent"
                minWidth={120}
              />
              <div className="sig-editor__card-role">
                <InlineField
                  id="sig-job"
                  label="Title"
                  value={document.jobTitle}
                  onChange={setJobTitle}
                  onFocus={onFieldFocus}
                  placeholder="Job title"
                  className="sig-editor__card-role-input"
                />
                <span aria-hidden="true" className="sig-editor__card-role-sep">·</span>
                <InlineField
                  id="sig-company"
                  label="Company"
                  value={document.company}
                  onChange={setCompany}
                  onFocus={onFieldFocus}
                  placeholder="Company"
                  className="sig-editor__card-role-input"
                />
              </div>
              <div className="sig-editor__card-rule" />
              <div className="sig-editor__card-contacts">
                <div className="sig-editor__card-contact-line">
                  <InlineField
                    id="sig-email"
                    label="Email"
                    value={document.email}
                    onChange={setEmail}
                    onFocus={onFieldFocus}
                    placeholder="you@example.com"
                    className="sig-editor__card-contact-input sig-editor__card-contact-input--accent"
                    minWidth={140}
                  />
                  {visible.has("phone") ? (
                    <>
                      <span aria-hidden="true" className="sig-editor__card-contact-sep">|</span>
                      <InlineField
                        id="sig-phone"
                        label="Phone"
                        value={document.phone}
                        onChange={setPhone}
                        onFocus={onFieldFocus}
                        placeholder="+1 (555) 000-0000"
                        className="sig-editor__card-contact-input"
                        autoFocus={!document.phone}
                      />
                    </>
                  ) : null}
                </div>
                {visible.has("website") ? (
                  <InlineField
                    id="sig-website"
                    label="Website"
                    value={websiteDisplay}
                    onChange={setWebsite}
                    onFocus={onFieldFocus}
                    placeholder="yoursite.com"
                    className="sig-editor__card-contact-input sig-editor__card-contact-input--accent"
                    autoFocus={!document.website}
                  />
                ) : null}
              </div>
              {socialsBlock}
              {ctaBlock}
              {addFieldBlock}
              {watermarkBlock}
            </div>
          </>
        ) : null}

        {isBold ? (
          <div className="sig-editor__body">
            <div
              className="sig-editor__bold-name"
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

          {socialsBlock}
          {ctaBlock}
          {addFieldBlock}
          {watermarkBlock}
        </div>
        ) : null}

        {isClean ? (
          <div className="sig-editor__body sig-editor__clean-body">
            <InlineField
              id="sig-name"
              label="Name"
              value={document.fullName}
              onChange={setName}
              onFocus={onFieldFocus}
              placeholder="Your name"
              className="sig-editor__clean-name-input sig-editor__clean-name-input--accent"
              minWidth={120}
            />
            <div className="sig-editor__clean-role">
              <InlineField
                id="sig-job"
                label="Title"
                value={document.jobTitle}
                onChange={setJobTitle}
                onFocus={onFieldFocus}
                placeholder="Job title"
                className="sig-editor__clean-role-input"
              />
              <span aria-hidden="true">,</span>
              <InlineField
                id="sig-company"
                label="Company"
                value={document.company}
                onChange={setCompany}
                onFocus={onFieldFocus}
                placeholder="Company"
                className="sig-editor__clean-role-input"
              />
            </div>
            <div className="sig-editor__clean-contacts">
              <InlineField
                id="sig-email"
                label="Email"
                value={document.email}
                onChange={setEmail}
                onFocus={onFieldFocus}
                placeholder="you@example.com"
                className="sig-editor__clean-contact-input"
                minWidth={140}
              />
              {visible.has("phone") ? (
                <>
                  <span aria-hidden="true" className="sig-editor__clean-contact-sep">·</span>
                  <InlineField
                    id="sig-phone"
                    label="Phone"
                    value={document.phone}
                    onChange={setPhone}
                    onFocus={onFieldFocus}
                    placeholder="+1 (555) 000-0000"
                    className="sig-editor__clean-contact-input"
                    autoFocus={!document.phone}
                  />
                </>
              ) : null}
              {visible.has("website") ? (
                <>
                  <span aria-hidden="true" className="sig-editor__clean-contact-sep">·</span>
                  <InlineField
                    id="sig-website"
                    label="Website"
                    value={websiteDisplay}
                    onChange={setWebsite}
                    onFocus={onFieldFocus}
                    placeholder="yoursite.com"
                    className="sig-editor__clean-contact-input"
                    autoFocus={!document.website}
                  />
                </>
              ) : null}
            </div>
            {socialsBlock}
            {ctaBlock}
            {addFieldBlock}
            {watermarkBlock}
          </div>
        ) : null}
      </div>
    </div>
    {cropDraft ? (
      <div className="image-cropper" role="dialog" aria-modal="true" aria-label="Crop headshot">
        <div className="image-cropper__panel">
          <div className="image-cropper__header">
            <div>
              <h2>Adjust headshot</h2>
              <p>Drag to reposition. Zoom until it feels right.</p>
            </div>
            <button className="image-cropper__close" onClick={clearCropDraft} type="button" aria-label="Close cropper">
              ×
            </button>
          </div>
          <div
            className={`image-cropper__stage image-cropper__stage--${isCard ? "square" : "round"}`}
            onPointerDown={handleCropPointerDown}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
            onPointerCancel={handleCropPointerUp}
          >
            <img
              alt=""
              src={cropDraft.url}
              style={{
                transform: `translate(${cropDraft.x}px, ${cropDraft.y}px) scale(${cropDraft.scale})`,
              }}
            />
          </div>
          <label className="image-cropper__zoom">
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max="2.8"
              step="0.01"
              value={cropDraft.scale}
              onChange={(event) =>
                setCropDraft({
                  ...cropDraft,
                  scale: Number(event.target.value),
                  x: clamp(cropDraft.x, -96 * Number(event.target.value), 96 * Number(event.target.value)),
                  y: clamp(cropDraft.y, -96 * Number(event.target.value), 96 * Number(event.target.value)),
                })
              }
            />
          </label>
          <div className="image-cropper__actions">
            <button className="button button--subtle" onClick={clearCropDraft} type="button">
              Cancel
            </button>
            <button className="button button--primary" disabled={isUploading} onClick={() => void applyCrop()} type="button">
              {isUploading ? "Saving…" : "Use photo"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
