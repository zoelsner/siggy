"use client";

import {
  type ChangeEvent,
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState
} from "react";

import { trackEvent } from "@/lib/analytics";
import { createDefaultDocument } from "@/lib/default-document";
import { touchDocument } from "@/lib/document";
import { fontFamilyMap, fontOptions, isSystemFont } from "@/lib/fonts";
import { createBrowserDraftAdapter } from "@/lib/persistence";
import { getTemplateDefinition, templateDefinitions } from "@/lib/templates";
import type { AssetUploadResponse, RenderResult, SignatureDocument, TemplateId } from "@/lib/types";

import { useAccess } from "@/lib/billing";
import { InstallGuide } from "./install-guide";

const accentChoices = [
  "#1e3a8a", // Navy       — professional
  "#9f1239", // Burgundy   — professional
  "#4f46e5", // Indigo     — bridge (default)
  "#0d9488", // Teal       — bridge
  "#059669", // Emerald    — creator
  "#ea580c", // Sunset     — creator
];

// Display labels for the top template switcher. IDs stay the same in the
// document model; only the visible label changes ("Edge" → "Profile") to
// match the handoff design.
const TEMPLATE_PILL_LABELS: Record<TemplateId, string> = {
  bold: "Bold",
  edge: "Profile",
  card: "Card",
  clean: "Clean",
};
const TEMPLATE_PILL_ORDER: TemplateId[] = ["bold", "edge", "card", "clean"];

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800;900&family=Fraunces:wght@400;700;800;900&family=Outfit:wght@400;700;800;900&family=Anton&family=Instrument+Serif:wght@400&family=Space+Grotesk:wght@400;700&family=Playfair+Display:wght@400;700;900&family=Bricolage+Grotesque:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap";

function buildPreviewMarkup(html: string) {
  return `<!DOCTYPE html><html lang="en"><head><link rel="stylesheet" href="${GOOGLE_FONTS_CSS}"><style>html,body{margin:0;padding:0;background:#fff;}</style></head><body style="padding:24px;"><div id="sig">${html}</div><script>function resize(){var h=document.getElementById('sig');if(h){parent.postMessage({type:'siggy-resize',height:h.offsetHeight+48},'*');}}resize();new MutationObserver(resize).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',resize);</script></body></html>`;
}

export function StudioShell() {
  const { unlocked, token } = useAccess();
  const [document, setDocument] = useState<SignatureDocument>(() => createDefaultDocument());
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [renderState, setRenderState] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy Signature HTML");
  const [isCopying, setIsCopying] = useState(false);
  const [isInstallOpen, setInstallOpen] = useState(false);
  const [installConfirmed, setInstallConfirmed] = useState(false);
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(200);
  const adapterRef = useRef(createBrowserDraftAdapter());
  const hasTrackedInputRef = useRef(false);
  const deferredDocument = useDeferredValue(document);

  useEffect(() => {
    const stored = adapterRef.current.load();
    if (stored) {
      // Clear any stale nameImage — preview uses text with web fonts, images generated at copy time
      setDocument({ ...stored, nameImage: null });
    }

    trackEvent("landing_viewed", {
      publicSupport: "gmail_web",
      auth: "deferred"
    });

    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "siggy-resize" && typeof e.data.height === "number") {
        setPreviewHeight(Math.max(120, e.data.height));
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    adapterRef.current.save(document);
  }, [document]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setRenderState("rendering");

      try {
        const response = await fetch("/api/render", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            document: deferredDocument,
            profileId: "gmail_web",
            token
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Render request failed.");
        }

        const result = (await response.json()) as RenderResult;

        if (controller.signal.aborted) {
          return;
        }

        setRenderResult(result);
        setRenderState("ready");
        setRenderError(null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setRenderState("error");
        setRenderError(error instanceof Error ? error.message : "Render request failed.");
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
        trackEvent("first_input", {
          templateId: next.templateId
        });
      }

      return next;
    });
  }

  async function handleCopy() {
    if (!renderResult || isCopying) {
      return;
    }

    setIsCopying(true);
    setCopyLabel("Preparing...");

    try {
      // For custom fonts, generate name image for email client compatibility
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
          }),
        });
        if (nameRes.ok) {
          const payload = (await nameRes.json()) as AssetUploadResponse;
          copyDoc = { ...document, nameImage: payload.asset };
        }
      }

      // Re-render with the name image baked in
      const renderRes = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: copyDoc,
          profileId: document.targetProfileId,
          token,
        }),
      });

      if (!renderRes.ok) {
        throw new Error("Render failed");
      }

      const result = (await renderRes.json()) as RenderResult;
      const htmlBlob = new Blob([result.html], { type: "text/html" });
      const textBlob = new Blob([result.html], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob }),
      ]);

      setCopyLabel("Copied!");
      setInstallOpen(true);
      trackEvent("copy_clicked", {
        charCount: result.sizeBudget.charCount,
      });
      window.setTimeout(() => setCopyLabel("Copy Signature HTML"), 1600);
    } catch {
      setCopyLabel("Copy failed");
      window.setTimeout(() => setCopyLabel("Copy Signature HTML"), 1800);
    } finally {
      setIsCopying(false);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setImageStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt", `${document.fullName} headshot`);

      const response = await fetch("/api/assets", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Image upload failed.");
      }

      const payload = (await response.json()) as AssetUploadResponse;
      updateDocument((current) => ({
        ...current,
        image: payload.asset
      }));

      setImageStatus("Image ready.");
      trackEvent("image_uploaded", {
        bytes: file.size
      });
    } catch (error) {
      setImageStatus(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function handleInstallConfirm() {
    if (!installConfirmed) {
      trackEvent("install_confirmed", {
        client: "gmail_web"
      });
    }

    setInstallConfirmed(true);
  }

  function handleInstallToggle() {
    const next = !isInstallOpen;
    setInstallOpen(next);
    if (next) {
      trackEvent("install_guide_opened", {
        client: "gmail_web"
      });
    }
  }

  const previewMarkup = renderResult ? buildPreviewMarkup(renderResult.html) : "";

  return (
    <main className="page-shell">
      <div className="topbar">
        <div className="topbar__left">
          <a href="/" className="wordmark">
            <div className="wordmark__badge">S</div>
            <span className="wordmark__title">Siggy</span>
          </a>
        </div>
        <div className="template-pill-switcher" role="tablist" aria-label="Template">
          {TEMPLATE_PILL_ORDER.map((id) => {
            const template = templateDefinitions.find((t) => t.id === id);
            if (!template) return null;
            const active = document.templateId === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                className={`template-pill-switcher__item${active ? " template-pill-switcher__item--active" : ""}`}
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
                {TEMPLATE_PILL_LABELS[id]}
              </button>
            );
          })}
        </div>
        <div className="topbar__right">
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
      <div className="editor-hint">Edit details on the left · preview updates live as you type</div>


      <section className="studio-grid">
        {/* Compact sidebar — identity + contact only */}
        <aside className="sidebar">
          <div>
            <h2 className="sidebar__heading">Details</h2>
          </div>

          <div className="field">
            <label htmlFor="fullName">Name</label>
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
            <label htmlFor="jobTitle">Job title</label>
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

          <div className="sidebar__divider" />

          <div className="sidebar__row">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
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
                placeholder="+1 (555) 000-0000"
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    phone: event.target.value
                  }))
                }
                value={document.phone}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="url"
              placeholder="yoursite.com"
              onChange={(event) =>
                updateDocument((current) => ({
                  ...current,
                  website: event.target.value
                }))
              }
              value={document.website}
            />
          </div>
        </aside>

        <div className="main-area">
          <div className="preview-card">
            {renderResult ? (
              <iframe
                className="preview-frame"
                srcDoc={previewMarkup}
                style={{ height: previewHeight }}
                title="Siggy preview"
              />
            ) : renderState === "error" ? (
              <div className="error-state">{renderError}</div>
            ) : (
              <div className="empty-state">Rendering preview...</div>
            )}
          </div>

          <div className="style-pill" role="toolbar" aria-label="Style">
            <span className="style-pill__label">Font</span>
            <div className="style-pill__fonts">
              {fontOptions.map((font) => (
                <button
                  key={font.id}
                  className={`style-pill__font${document.fontFamily === font.id ? " style-pill__font--active" : ""}`}
                  onClick={() =>
                    updateDocument((current) => ({
                      ...current,
                      fontFamily: font.id,
                    }))
                  }
                  style={{ fontFamily: fontFamilyMap[font.id] ?? "inherit" }}
                  type="button"
                >
                  {font.name}
                </button>
              ))}
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
                    updateDocument((current) => ({
                      ...current,
                      accentColor: choice,
                    }))
                  }
                  style={{ backgroundColor: choice }}
                  type="button"
                />
              ))}
            </div>
          </div>

          <InstallGuide
            isConfirmed={installConfirmed}
            isOpen={isInstallOpen}
            onConfirmInstall={handleInstallConfirm}
            onToggle={handleInstallToggle}
          />
        </div>
      </section>

      {/* Secondary fields — headshot only (links/socials moved to inline "+ Add field" pattern) */}
      <div className="secondary-fields">
        {getTemplateDefinition(document.templateId).supportsImage ? (
          <div className="secondary-card">
            <h3 className="secondary-card__heading">Headshot</h3>
            <div className="field">
              <input id="imageUpload" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} type="file" />
              <div className="helper-text">
                {isUploading ? "Processing..." : imageStatus ?? "Optional. Resized to 128px."}
              </div>
              {document.image ? (
                <button
                  className="button button--subtle button--small"
                  onClick={() =>
                    updateDocument((current) => ({
                      ...current,
                      image: null
                    }))
                  }
                  type="button"
                >
                  Remove image
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <footer className="site-footer">
        <a href="/terms">Terms &amp; Conditions</a>
      </footer>
    </main>
  );
}
