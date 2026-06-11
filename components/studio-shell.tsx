"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState
} from "react";

import { trackEvent } from "@/lib/analytics";
import { useAccess } from "@/lib/billing";
import { createDefaultDocument } from "@/lib/default-document";
import { touchDocument } from "@/lib/document";
import { DEFAULT_FREE_FONT, fontFamilyMap, fontOptions, isSystemFont } from "@/lib/fonts";
import { createBrowserDraftAdapter } from "@/lib/persistence";
import { SUPPORT_EMAIL } from "@/lib/site";
import { templateDefinitions } from "@/lib/templates";
import type { AssetUploadResponse, ClientProfileId, RenderResult, SignatureDocument, SignatureImageAsset, TemplateId } from "@/lib/types";

import { InstallGuide } from "./install-guide";
import { SignatureEditor } from "./signature-editor";

const accentChoices = [
  "#1e3a8a", // Navy       — professional
  "#9f1239", // Burgundy   — professional
  "#4f46e5", // Indigo     — bridge (default)
  "#0d9488", // Teal       — bridge
  "#059669", // Emerald    — creator
  "#ea580c", // Sunset     — creator
];

const TEMPLATE_PILL_LABELS: Record<TemplateId, string> = {
  bold: "Bold",
  edge: "Profile",
  card: "Card",
  clean: "Clean",
};
const TEMPLATE_PILL_ORDER: TemplateId[] = ["bold", "edge", "card", "clean"];
const PREVIEW_PROFILES: Array<{ id: ClientProfileId; label: string }> = [
  { id: "gmail_web", label: "Gmail" },
  { id: "outlook_web", label: "Outlook" },
  { id: "apple_mail", label: "Apple Mail" },
];

function TemplateThumb({ id }: { id: TemplateId }) {
  return (
    <div className={`template-thumb template-thumb--${id}`} aria-hidden="true">
      <span className="template-thumb__mark" />
      <span className="template-thumb__lines">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

export function StudioShell() {
  const { unlocked, resolved, token, error, startCheckout } = useAccess();
  const [document, setDocument] = useState<SignatureDocument>(() => createDefaultDocument());
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [renderState, setRenderState] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [copyLabel, setCopyLabel] = useState("Copy signature");
  const [isCopying, setIsCopying] = useState(false);
  const [isInstallOpen, setInstallOpen] = useState(false);
  const [installConfirmed, setInstallConfirmed] = useState(false);
  const [focusedLabel, setFocusedLabel] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const adapterRef = useRef(createBrowserDraftAdapter());
  const hasTrackedInputRef = useRef(false);
  const deferredDocument = useDeferredValue(document);

  useEffect(() => {
    const stored = adapterRef.current.load();
    if (stored) {
      setDocument({ ...stored, nameImage: null });
    }

    trackEvent("landing_viewed", {
      publicSupport: "gmail_web",
      auth: "deferred"
    });
  }, []);

  useEffect(() => {
    adapterRef.current.save(document);
  }, [document]);

  // Once access resolves as free, downgrade any pro features left in the
  // draft (pro font, headshot) so the preview matches what /api/render will
  // actually produce on copy.
  useEffect(() => {
    if (!resolved || unlocked) return;
    setDocument((current) => {
      if (isSystemFont(current.fontFamily) && !current.image) return current;
      return touchDocument({
        ...current,
        fontFamily: isSystemFont(current.fontFamily) ? current.fontFamily : DEFAULT_FREE_FONT,
        image: null
      });
    });
  }, [resolved, unlocked]);

  // Background render — only used to gate Copy; output is not displayed.
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setRenderState("rendering");
      try {
        const response = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document: deferredDocument,
            profileId: "gmail_web",
            token
          }),
          signal: controller.signal
        });

        if (!response.ok) throw new Error("Render request failed.");

        const result = (await response.json()) as RenderResult;

        if (controller.signal.aborted) return;

        setRenderResult(result);
        setRenderState("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        setRenderState("error");
      }
    };

    void run();
    return () => controller.abort();
  }, [deferredDocument, token]);

  function updateDocument(mutator: (current: SignatureDocument) => SignatureDocument) {
    setDocument((current) => {
      const next = touchDocument(mutator(current));

      if (!hasTrackedInputRef.current) {
        hasTrackedInputRef.current = true;
        trackEvent("first_input", { templateId: next.templateId });
      }

      return next;
    });
  }

  function handleUnlock(source: string) {
    trackEvent("unlock_click", { source });
    void startCheckout("editor");
  }

  function handleImageUploaded(asset: SignatureImageAsset) {
    updateDocument((current) => ({ ...current, image: asset }));
    trackEvent("image_uploaded", { bytes: 0 });
  }

  function handleImageRemoved() {
    updateDocument((current) => ({ ...current, image: null }));
  }

  async function handleCopy() {
    if (!renderResult || isCopying) return;

    setIsCopying(true);
    setCopyLabel("Preparing…");

    try {
      let copyDoc = document;
      if (!isSystemFont(document.fontFamily)) {
        const nameRes = await fetch("/api/render-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: document.fullName,
            fontFamily: document.fontFamily,
            accentColor: document.accentColor,
            weight: 700,
            token,
          }),
        });
        if (nameRes.ok) {
          const payload = (await nameRes.json()) as AssetUploadResponse;
          copyDoc = { ...document, nameImage: payload.asset };
        }
      }

      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: copyDoc,
          profileId: document.targetProfileId,
          token,
        }),
      });

      if (!renderRes.ok) throw new Error("Render failed");

      const result = (await renderRes.json()) as RenderResult;
      const htmlBlob = new Blob([result.html], { type: "text/html" });
      const textBlob = new Blob([result.html], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob }),
      ]);

      setCopyLabel("Copied!");
      setInstallOpen(true);
      trackEvent("copy_clicked", { charCount: result.sizeBudget.charCount });
      window.setTimeout(() => setCopyLabel("Copy signature"), 1600);
    } catch {
      setCopyLabel("Copy failed");
      window.setTimeout(() => setCopyLabel("Copy signature"), 1800);
    } finally {
      setIsCopying(false);
    }
  }

  function handleReset() {
    setDocument(createDefaultDocument());
    setFocusedLabel(null);
    trackEvent("reset_clicked", { templateId: document.templateId });
  }

  function handleExportHtml() {
    if (!renderResult) return;

    const blob = new Blob([renderResult.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "siggy-signature.html";
    anchor.click();
    URL.revokeObjectURL(url);
    trackEvent("export_html_clicked", { charCount: renderResult.sizeBudget.charCount });
  }

  function handleInstallConfirm() {
    if (!installConfirmed) {
      trackEvent("install_confirmed", { client: "gmail_web" });
    }
    setInstallConfirmed(true);
  }

  function handleInstallToggle() {
    const next = !isInstallOpen;
    setInstallOpen(next);
    if (next) {
      trackEvent("install_guide_opened", { client: "gmail_web" });
    }
  }

  return (
    <main className="page-shell page-shell--builder">
      <div className="topbar">
        <div className="topbar__left">
          <a href="/" className="wordmark">
            <div className="wordmark__badge">S</div>
            <span className="wordmark__title">Siggy</span>
          </a>
          <span className="topbar__divider" />
          <span className="topbar__eyebrow">Email signature builder</span>
        </div>
        <div className="topbar__right">
          {resolved && !unlocked ? (
            <button
              className="button button--unlock"
              onClick={() => handleUnlock("editor_topbar")}
              type="button"
            >
              Unlock — $19
            </button>
          ) : null}
          <button className="button button--subtle" onClick={handleReset} type="button">
            ↻ Reset
          </button>
          <button
            className="button button--subtle"
            disabled={!renderResult || renderState === "rendering"}
            onClick={handleExportHtml}
            type="button"
          >
            ↓ Export HTML
          </button>
          <button
            className="button button--primary"
            disabled={!renderResult || renderState === "rendering" || isCopying}
            onClick={handleCopy}
            type="button"
          >
            {copyLabel}
          </button>
        </div>
      </div>

      {error === "redeem_failed" ? (
        <div className="builder-banner builder-banner--error" role="alert">
          We received your payment but couldn&apos;t verify it automatically. Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your Stripe receipt and
          we&apos;ll unlock you right away.
        </div>
      ) : null}
      {error === "checkout_failed" ? (
        <div className="builder-banner builder-banner--error" role="alert">
          Couldn&apos;t open checkout. Try again, or email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </div>
      ) : null}

      <section className="builder-grid">
        <aside className="builder-panel template-rail">
          <div className="builder-panel__header">
            <span className="builder-panel__eyebrow">Templates</span>
            <span className="builder-panel__count">{TEMPLATE_PILL_ORDER.length}</span>
          </div>
          <div className="template-list" role="tablist" aria-label="Template">
            {TEMPLATE_PILL_ORDER.map((id) => {
              const template = templateDefinitions.find((t) => t.id === id);
              if (!template) return null;
              const active = document.templateId === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  className={`template-choice${active ? " template-choice--active" : ""}`}
                  onClick={() => {
                    trackEvent("template_selected", { templateId: id });
                    startTransition(() => {
                      setDocument((current) =>
                        touchDocument({ ...current, templateId: id }),
                      );
                    });
                  }}
                  title={`${TEMPLATE_PILL_LABELS[id]} — ${template.description}`}
                  type="button"
                >
                  <TemplateThumb id={id} />
                  <span>{TEMPLATE_PILL_LABELS[id]}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`builder-preview builder-preview--${previewTheme}`}>
          <div className="preview-toolbar">
            <div className="preview-toolbar__group">
              <span className="preview-toolbar__label">Preview as</span>
              <div className="segmented-control" role="tablist" aria-label="Preview profile">
                {PREVIEW_PROFILES.map((profile) => {
                  const active = document.targetProfileId === profile.id;
                  return (
                    <button
                      key={profile.id}
                      className={`segmented-control__item${active ? " segmented-control__item--active" : ""}`}
                      onClick={() =>
                        updateDocument((current) => ({ ...current, targetProfileId: profile.id }))
                      }
                      type="button"
                    >
                      {profile.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="preview-toolbar__group">
              <span className="preview-toolbar__label">Theme</span>
              <div className="segmented-control" role="tablist" aria-label="Preview theme">
                <button
                  className={`segmented-control__item${previewTheme === "light" ? " segmented-control__item--active" : ""}`}
                  onClick={() => setPreviewTheme("light")}
                  type="button"
                >
                  Light
                </button>
                <button
                  className={`segmented-control__item${previewTheme === "dark" ? " segmented-control__item--active" : ""}`}
                  onClick={() => setPreviewTheme("dark")}
                  type="button"
                >
                  Dark
                </button>
              </div>
            </div>
          </div>

          <div className="message-canvas">
            <article className="message-card">
              <div className="message-card__body">
                <span className="message-card__subject">Re: Q4 brand refresh</span>
                <p>Hi team — wrapped the final hand-off doc this morning. Let me know if you'd like to walk through it before Friday's review. Thanks!</p>
                <p>— Sarah</p>
              </div>
              <div className="message-card__rule" />
              <div className="message-card__signature">
                <SignatureEditor
                  document={document}
                  imageUrl={document.image?.url ?? null}
                  unlocked={unlocked}
                  token={token}
                  onChange={updateDocument}
                  onFieldFocus={setFocusedLabel}
                  onImageUploaded={handleImageUploaded}
                  onImageRemoved={handleImageRemoved}
                  onUpsell={handleUnlock}
                />
              </div>
            </article>
          </div>
        </section>

        <aside className="builder-panel inspector-panel">
          <details className="inspector-section" open>
            <summary>
              <span>Style</span>
            </summary>
            <div className="field">
              <label>Font</label>
              <div className="inspector-font-grid">
                {fontOptions.map((font) => {
                  const locked = !unlocked && !font.system;
                  return (
                    <button
                      key={font.id}
                      className={`inspector-font${document.fontFamily === font.id ? " inspector-font--active" : ""}${locked ? " inspector-font--locked" : ""}`}
                      onClick={() => {
                        if (locked) {
                          handleUnlock("editor_font");
                          return;
                        }
                        updateDocument((current) => ({ ...current, fontFamily: font.id }));
                      }}
                      style={{ fontFamily: fontFamilyMap[font.id] ?? "inherit" }}
                      type="button"
                    >
                      {font.name}
                      {locked ? <span className="pro-chip">Pro</span> : null}
                    </button>
                  );
                })}
              </div>
              {resolved && !unlocked ? (
                <p className="helper-text">
                  Pro fonts unlock with Siggy — $19 one-time.
                </p>
              ) : null}
            </div>
            <div className="field">
              <label>Accent</label>
              <div className="inspector-swatches">
                {accentChoices.map((choice) => (
                  <button
                    key={choice}
                    aria-label={`Use ${choice}`}
                    className={`inspector-swatch${document.accentColor === choice ? " inspector-swatch--active" : ""}`}
                    onClick={() =>
                      updateDocument((current) => ({ ...current, accentColor: choice }))
                    }
                    style={{ backgroundColor: choice }}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </details>

          <details className="inspector-section" open>
            <summary>
              <span>Details</span>
            </summary>
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    fullName: event.target.value
                  }))
                }
                value={document.fullName}
              />
            </div>
            <div className="field">
              <label htmlFor="jobTitle">Title</label>
              <input
                id="jobTitle"
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    jobTitle: event.target.value
                  }))
                }
                value={document.jobTitle}
              />
            </div>
            <div className="field">
              <label htmlFor="company">Company</label>
              <input
                id="company"
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    company: event.target.value
                  }))
                }
                value={document.company}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
                value={document.email}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    phone: event.target.value
                  }))
                }
                value={document.phone}
              />
            </div>
            <div className="field">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="url"
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    website: event.target.value
                  }))
                }
                value={document.website}
              />
            </div>
          </details>

          <details className="inspector-section">
            <summary>
              <span>Headshot & links</span>
            </summary>
            <p className="helper-text">
              {unlocked
                ? "Add a headshot directly from the signature preview. Optional fields still live behind the inline + Add field control."
                : "Headshots are part of the $19 unlock. Optional fields still live behind the inline + Add field control."}
            </p>
          </details>

          <div className="inspector-install">
            <InstallGuide
              isConfirmed={installConfirmed}
              isOpen={isInstallOpen}
              onConfirmInstall={handleInstallConfirm}
              onToggle={handleInstallToggle}
            />
          </div>
        </aside>
      </section>

      <div className="editor-hint builder-editing-hint">
        {focusedLabel ? (
          <span className="editor-hint__editing">
            Editing — <strong>{focusedLabel}</strong>
          </span>
        ) : (
          <span>Click signature text in the preview to edit in place</span>
        )}
      </div>

      <div className="builder-mobile-style" role="toolbar" aria-label="Style">
        <span className="style-pill__label">Font</span>
        <div className="style-pill__fonts">
          {fontOptions.map((font) => {
            const locked = !unlocked && !font.system;
            return (
              <button
                key={font.id}
                className={`style-pill__font${document.fontFamily === font.id ? " style-pill__font--active" : ""}${locked ? " style-pill__font--locked" : ""}`}
                onClick={() => {
                  if (locked) {
                    handleUnlock("editor_font_mobile");
                    return;
                  }
                  updateDocument((current) => ({ ...current, fontFamily: font.id }));
                }}
                style={{ fontFamily: fontFamilyMap[font.id] ?? "inherit" }}
                type="button"
              >
                {font.name}
                {locked ? <span className="pro-chip">Pro</span> : null}
              </button>
            );
          })}
        </div>
        <span className="style-pill__divider" />
        <span className="style-pill__label">Color</span>
        <div className="style-pill__swatches">
          {accentChoices.map((choice) => (
            <button
              key={choice}
              aria-label={`Use ${choice}`}
              className={`style-pill__swatch${document.accentColor === choice ? " style-pill__swatch--active" : ""}`}
              onClick={() =>
                updateDocument((current) => ({ ...current, accentColor: choice }))
              }
              style={{ backgroundColor: choice }}
              type="button"
            />
          ))}
        </div>
      </div>

      <footer className="site-footer">
        <a href="/terms">Terms &amp; Conditions</a>
      </footer>
    </main>
  );
}
