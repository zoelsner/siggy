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
import { fontOptions, isSystemFont } from "@/lib/fonts";
import { createBrowserDraftAdapter } from "@/lib/persistence";
import { getTemplateDefinition, templateDefinitions } from "@/lib/templates";
import type { AssetUploadResponse, RenderResult, SignatureDocument } from "@/lib/types";

import { InstallGuide } from "./install-guide";

const accentChoices = ["#4f46e5", "#0f9f68", "#cb7a12", "#d74545", "#2563eb", "#111827"];

const fontFamilyMap: Record<string, string> = {
  "dm-sans": "'DM Sans', sans-serif",
  "montserrat": "'Montserrat', sans-serif",
  "plus-jakarta": "'Plus Jakarta Sans', sans-serif",
  "unbounded": "'Unbounded', sans-serif",
  "georgia": "Georgia, serif",
  "arial": "Arial, sans-serif",
};

function buildPreviewMarkup(html: string) {
  return `<!DOCTYPE html><html lang="en"><head><style>html,body{margin:0;padding:0;background:#fff;}</style></head><body style="padding:24px;"><div id="sig">${html}</div><script>function resize(){var h=document.getElementById('sig');if(h){parent.postMessage({type:'siggy-resize',height:h.offsetHeight+48},'*');}}resize();new MutationObserver(resize).observe(document.body,{childList:true,subtree:true});window.addEventListener('load',resize);</script></body></html>`;
}

function TemplateThumbnail({ templateId }: { templateId: string }) {
  const m = "var(--thumb-muted)";
  const s = "var(--thumb-strong)";
  const a = "var(--thumb-accent)";
  const b = "var(--thumb-bar)";

  const wrap = (children: React.ReactNode) => (
    <div className="template-thumb__inner">{children}</div>
  );

  switch (templateId) {
    case "edge":
      return wrap(
        <div style={{ display: "flex", gap: 4, width: "100%" }}>
          <div style={{ width: 3, borderRadius: 1, background: b, alignSelf: "stretch", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: a, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: "65%", height: 2.5, background: s, borderRadius: 1, marginBottom: 2 }} />
                <div style={{ width: "50%", height: 1.5, background: m, borderRadius: 1 }} />
              </div>
            </div>
          </div>
        </div>
      );
    case "bold":
      return wrap(
        <div style={{ width: "100%" }}>
          <div style={{ width: "75%", height: 3, background: s, borderRadius: 1, marginBottom: 1.5 }} />
          <div style={{ width: "55%", height: 3, background: b, borderRadius: 1, marginBottom: 2 }} />
          <div style={{ width: "100%", height: 1.5, background: b, borderRadius: 1, marginBottom: 3 }} />
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ width: "40%", height: 1.5, background: m, borderRadius: 1 }} />
            <div style={{ width: 1, background: m, alignSelf: "stretch" }} />
            <div style={{ width: "35%", height: 1.5, background: m, borderRadius: 1 }} />
          </div>
        </div>
      );
    case "card":
      return wrap(
        <div style={{ border: "1px solid var(--thumb-muted)", borderRadius: 3, display: "flex", overflow: "hidden", width: "100%" }}>
          <div style={{ width: 14, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: a }} />
          </div>
          <div style={{ flex: 1, padding: "4px 5px", minWidth: 0 }}>
            <div style={{ width: "65%", height: 2, background: s, borderRadius: 1, marginBottom: 2 }} />
            <div style={{ width: "50%", height: 1.5, background: m, borderRadius: 1 }} />
          </div>
        </div>
      );
    case "clean":
      return wrap(
        <div style={{ width: "100%" }}>
          <div style={{ width: "50%", height: 2.5, background: s, borderRadius: 1, marginBottom: 2 }} />
          <div style={{ width: "55%", height: 1.5, background: m, borderRadius: 1, marginBottom: 3 }} />
          <div style={{ width: "70%", height: 1.5, background: m, borderRadius: 1, opacity: 0.6 }} />
        </div>
      );
    default:
      return null;
  }
}

// Update with your real LemonSqueezy product URL after creating the product
const CHECKOUT_URL = "https://siggy.lemonsqueezy.com/buy/TODO";

function useUnlocked() {
  const [unlocked, setUnlocked] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    // Check URL params for purchase redirect
    const params = new URLSearchParams(window.location.search);
    // LemonSqueezy redirect params: {order_id}, {order_uuid}, {checkout_hash}
    const key = params.get("order_id") || params.get("checkout_hash") || params.get("key");
    if (key) {
      localStorage.setItem("siggy_key", key);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    setUnlocked(!!localStorage.getItem("siggy_key"));
    setResolved(true);
  }, []);

  return { unlocked, resolved };
}

export function StudioShell() {
  const { unlocked, resolved } = useUnlocked();
  const [document, setDocument] = useState<SignatureDocument>(() => createDefaultDocument());
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [renderState, setRenderState] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy HTML");
  const [isInstallOpen, setInstallOpen] = useState(false);
  const [installConfirmed, setInstallConfirmed] = useState(false);
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);
  const [isRenderingName, setRenderingName] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(200);
  const adapterRef = useRef(createBrowserDraftAdapter());
  const hasTrackedInputRef = useRef(false);
  const deferredDocument = useDeferredValue(document);

  useEffect(() => {
    const stored = adapterRef.current.load();
    if (stored) {
      setDocument(stored);
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
            unlocked
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
  }, [deferredDocument, unlocked]);

  // Render name as image when name or font changes (debounced)
  useEffect(() => {
    if (isSystemFont(deferredDocument.fontFamily)) {
      if (deferredDocument.nameImage) {
        setDocument((current) => ({ ...current, nameImage: null }));
      }
      return;
    }

    // Clear stale image immediately so text fallback shows the new color
    setDocument((current) => current.nameImage ? ({ ...current, nameImage: null }) : current);

    const timer = setTimeout(async () => {
      setRenderingName(true);
      try {
        const response = await fetch("/api/render-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: deferredDocument.fullName,
            fontFamily: deferredDocument.fontFamily,
            accentColor: deferredDocument.accentColor,
            weight: 700,
          }),
        });

        if (!response.ok) {
          console.error("Name render failed:", response.status, await response.text());
          return;
        }

        const payload = (await response.json()) as AssetUploadResponse;
        setDocument((current) => ({
          ...current,
          nameImage: payload.asset,
        }));
      } catch {
        // Silently fail — text fallback will be used
      } finally {
        setRenderingName(false);
      }
    }, 600); // debounce 600ms

    return () => clearTimeout(timer);
  }, [deferredDocument.fullName, deferredDocument.fontFamily, deferredDocument.accentColor]);

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

  function handleCopy() {
    if (!renderResult) {
      return;
    }

    navigator.clipboard
      .writeText(renderResult.html)
      .then(() => {
        setCopyLabel("Copied!");
        setInstallOpen(true);
        trackEvent("copy_clicked", {
          charCount: renderResult.sizeBudget.charCount
        });
        window.setTimeout(() => setCopyLabel("Copy HTML"), 1600);
      })
      .catch(() => {
        setCopyLabel("Copy failed");
        window.setTimeout(() => setCopyLabel("Copy HTML"), 1800);
      });
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
          <div className="wordmark">
            <div className="wordmark__badge">S</div>
            <span className="wordmark__title">Siggy</span>
          </div>
          <span className="topbar__divider" />
          <span className="topbar__eyebrow">Email Signature Builder</span>
        </div>
        <div className="topbar__right">
          {!resolved ? null : unlocked ? (
            <button
              className="button button--primary"
              disabled={!renderResult || renderState === "rendering"}
              onClick={handleCopy}
              type="button"
            >
              {copyLabel}
            </button>
          ) : (
            <a className="button button--primary" href={CHECKOUT_URL}>
              Get Siggy — $49
            </a>
          )}
        </div>
      </div>
      <section className="studio-grid">
        <aside className="sidebar">
          <div>
            <h2 className="sidebar__heading">Signature Editor</h2>
            <div className="sidebar__sub">The editorial utility</div>
          </div>

          <div className="sidebar__divider" />

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

          <div className="sidebar__row">
            {document.socials.map((social, index) => (
              <div className="field" key={social.id}>
                <label htmlFor={`social-${social.platform}`}>{social.platform}</label>
                <input
                  id={`social-${social.platform}`}
                  onChange={(event) =>
                    updateDocument((current) => ({
                      ...current,
                      socials: current.socials.map((entry, entryIndex) =>
                        entryIndex === index
                          ? {
                              ...entry,
                              url: event.target.value
                            }
                          : entry
                      )
                    }))
                  }
                  placeholder={`username`}
                  value={social.url}
                />
              </div>
            ))}
          </div>

          <div className="sidebar__row">
            <div className="field">
              <label htmlFor="ctaText">CTA Label</label>
              <input
                id="ctaText"
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    cta: { text: event.target.value, url: current.cta?.url ?? "" }
                  }))
                }
                placeholder="Book a call"
                value={document.cta?.text ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="ctaUrl">CTA Link</label>
              <input
                id="ctaUrl"
                onChange={(event) =>
                  updateDocument((current) => ({
                    ...current,
                    cta: { text: current.cta?.text ?? "", url: event.target.value }
                  }))
                }
                placeholder="calendly.com/you"
                value={document.cta?.url ?? ""}
              />
            </div>
          </div>

          <div className="sidebar__divider" />

          <div className="field">
            <label>Font</label>
            <div className="font-picker">
              {fontOptions.map((font) => (
                <button
                  key={font.id}
                  className={`font-option ${document.fontFamily === font.id ? "font-option--active" : ""}`}
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
            {isRenderingName ? (
              <div className="helper-text">Rendering name...</div>
            ) : null}
          </div>

          <div className="field">
            <label>Accent color</label>
            <div className="swatch-row">
              {accentChoices.map((choice) => (
                <button
                  key={choice}
                  aria-label={`Use ${choice}`}
                  className={`swatch ${document.accentColor === choice ? "swatch--active" : ""}`}
                  onClick={() =>
                    updateDocument((current) => ({
                      ...current,
                      accentColor: choice
                    }))
                  }
                  style={{ backgroundColor: choice }}
                  type="button"
                />
              ))}
            </div>
          </div>

          {getTemplateDefinition(document.templateId).supportsImage ? (
            <div className="field">
              <label htmlFor="imageUpload">Headshot</label>
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
          ) : null}
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

          <div className="template-strip">
            {templateDefinitions.map((template) => (
              <button
                key={template.id}
                className={`template-thumb ${document.templateId === template.id ? "template-thumb--active" : ""}`}
                onClick={() => {
                  trackEvent("template_selected", { templateId: template.id });
                  startTransition(() => {
                    setDocument((current) =>
                      touchDocument({
                        ...current,
                        templateId: template.id
                      })
                    );
                  });
                }}
                title={`${template.name} — ${template.description}`}
                type="button"
              >
                <TemplateThumbnail templateId={template.id} />
                <span className="template-thumb__label">{template.name}</span>
              </button>
            ))}
          </div>

          <InstallGuide
            isConfirmed={installConfirmed}
            isOpen={isInstallOpen}
            onConfirmInstall={handleInstallConfirm}
            onToggle={handleInstallToggle}
          />
        </div>
      </section>
      <footer className="site-footer">
        <a href="/terms">Terms &amp; Conditions</a>
      </footer>
    </main>
  );
}
