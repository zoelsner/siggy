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
import { clientProfiles } from "@/lib/client-profiles";
import { createDefaultDocument } from "@/lib/default-document";
import { createImportedDocument, touchDocument } from "@/lib/document";
import { createBrowserDraftAdapter } from "@/lib/persistence";
import { templateDefinitions } from "@/lib/templates";
import type { AssetUploadResponse, RenderResult, SignatureDocument } from "@/lib/types";

import { InstallGuide } from "./install-guide";

const accentChoices = ["#4f46e5", "#0f9f68", "#cb7a12", "#d74545", "#2563eb", "#111827"];

function buildPreviewMarkup(html: string) {
  return `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:24px;background:#ffffff;">${html}</body></html>`;
}

export function StudioShell() {
  const [document, setDocument] = useState<SignatureDocument>(() => createDefaultDocument());
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [renderState, setRenderState] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy Gmail HTML");
  const [isInstallOpen, setInstallOpen] = useState(false);
  const [installConfirmed, setInstallConfirmed] = useState(false);
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
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
            profileId: "gmail_web"
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
  }, [deferredDocument]);

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
        setCopyLabel("Copied");
        setInstallOpen(true);
        trackEvent("copy_clicked", {
          charCount: renderResult.sizeBudget.charCount
        });
        window.setTimeout(() => setCopyLabel("Copy Gmail HTML"), 1600);
      })
      .catch(() => {
        setCopyLabel("Copy failed");
        window.setTimeout(() => setCopyLabel("Copy Gmail HTML"), 1800);
      });
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = documentRef("a");
    anchor.href = url;
    anchor.download = "siggy-signature.json";
    anchor.click();
    URL.revokeObjectURL(url);
    trackEvent("draft_exported", {
      templateId: document.templateId
    });
  }

  function handleImportTrigger() {
    importInputRef.current?.click();
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const imported = createImportedDocument(text);
      startTransition(() => {
        setDocument(imported);
      });
      trackEvent("draft_imported", {
        templateId: imported.templateId
      });
    } catch {
      setRenderError("That file could not be imported as a Siggy document.");
    } finally {
      event.target.value = "";
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

      setImageStatus("Image processed for email-safe dimensions.");
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

  function handleReset() {
    adapterRef.current.clear();
    setDocument(createDefaultDocument());
    setImageStatus(null);
    setInstallOpen(false);
    setInstallConfirmed(false);
    setRenderError(null);
    trackEvent("draft_reset");
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
  const budgetWidth = renderResult
    ? Math.min(100, (renderResult.sizeBudget.charCount / renderResult.sizeBudget.hardLimit) * 100)
    : 0;

  return (
    <main className="page-shell">
      <div className="topbar">
        <div className="wordmark">
          <div className="wordmark__badge">S</div>
          <div className="wordmark__meta">
            <span className="eyebrow">Gmail-first, Outlook-ready</span>
            <span className="wordmark__title">Siggy MVP</span>
          </div>
        </div>
        <div className="topbar__chips">
          <span className="chip chip--strong">No auth in phase 1</span>
          <span className="chip">Local draft save</span>
          <span className="chip">Deterministic HTML render</span>
        </div>
      </div>

      <section className="hero">
        <div className="hero__copy">
          <div className="eyebrow">Execution path</div>
          <h1 className="hero__title">
            Build the <em>proof loop</em>, not just the editor.
          </h1>
          <p className="hero__desc">
            Siggy is optimized for fast self-serve setup on Gmail today, with conservative render
            rules and client profiles that keep the output portable to Outlook later.
          </p>
          <div className="hero__proof">
            <span className="chip chip--strong">Public support: Gmail web</span>
            <span className="chip">Internal validation: Outlook web, Outlook classic, Apple Mail</span>
            <span className="chip">Export/import before auth</span>
          </div>
        </div>
        <aside className="hero__card">
          <div className="eyebrow">Success criteria</div>
          <h2>What this build is trying to prove</h2>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat__label">Time to copy</span>
              <span className="stat__value">Under 2 min</span>
            </div>
            <div className="stat">
              <span className="stat__label">Public support</span>
              <span className="stat__value">Gmail first</span>
            </div>
            <div className="stat">
              <span className="stat__label">Future surface</span>
              <span className="stat__value">Outlook-ready</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="studio-grid">
        <aside className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Template system</div>
              <p className="panel__sub">
                Six fixed layouts with tokenized styling. No drag-and-drop, no arbitrary HTML.
              </p>
            </div>
          </div>
          <div className="template-grid">
            {templateDefinitions.map((template) => (
              <button
                key={template.id}
                className={`template-card ${document.templateId === template.id ? "template-card--active" : ""}`}
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
                type="button"
              >
                <div className="template-card__preview">
                  <div className="template-card__avatar" />
                  <div className="template-card__lines">
                    <div className="template-card__line" />
                    <div className="template-card__line" />
                    <div className="template-card__line" />
                  </div>
                </div>
                <div className="template-card__meta">
                  <span className="template-card__title">{template.name}</span>
                  <span className="template-card__desc">{template.description}</span>
                  <span className="helper-text">{template.headline}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Signature document</div>
              <p className="panel__sub">
                Browser-local drafts today, cloud persistence later through the same document model.
              </p>
            </div>
            <div className="button-row">
              <button className="button" onClick={handleExport} type="button">
                Export JSON
              </button>
              <button className="button" onClick={handleImportTrigger} type="button">
                Import JSON
              </button>
              <button className="button button--subtle" onClick={handleReset} type="button">
                Reset
              </button>
            </div>
            <input
              accept="application/json"
              hidden
              onChange={handleImport}
              ref={importInputRef}
              type="file"
            />
          </div>

          <div className="form-grid">
            <div className="section-card">
              <div className="section-card__title">Core identity</div>
              <div className="field-grid">
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
                <div className="field">
                  <label htmlFor="draftName">Draft name</label>
                  <input
                    id="draftName"
                    onChange={(event) =>
                      updateDocument((current) => ({
                        ...current,
                        meta: {
                          ...current.meta,
                          draftName: event.target.value
                        }
                      }))
                    }
                    value={document.meta.draftName}
                  />
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="section-card__title">Contact points</div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
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
                    onChange={(event) =>
                      updateDocument((current) => ({
                        ...current,
                        phone: event.target.value
                      }))
                    }
                    value={document.phone}
                  />
                </div>
                <div className="field field-grid--single" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    onChange={(event) =>
                      updateDocument((current) => ({
                        ...current,
                        website: event.target.value
                      }))
                    }
                    value={document.website}
                  />
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="section-card__title">Accent and profile image</div>
              <div className="field-grid field-grid--single">
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
                <div className="field">
                  <label htmlFor="imageUpload">Headshot image</label>
                  <input id="imageUpload" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} type="file" />
                  <div className="helper-text">
                    {isUploading ? "Processing image for email-safe dimensions..." : imageStatus ?? "Optional. Image uploads are resized and normalized server-side."}
                  </div>
                  {document.image ? (
                    <div className="button-row">
                      <a className="button" href={document.image.url} rel="noreferrer" target="_blank">
                        Open asset
                      </a>
                      <button
                        className="button button--subtle"
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
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="section-card__title">Social links</div>
              <div className="field-grid">
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
                      placeholder={`${social.platform}.com/username`}
                      value={social.url}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="panel preview-panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Preview, copy, and proof</div>
              <p className="panel__sub">
                Preview and copied HTML come from the same render route so Gmail behavior is easier to trust.
              </p>
            </div>
            <div className="button-row">
              <button
                className="button button--primary"
                disabled={!renderResult || renderState === "rendering"}
                onClick={handleCopy}
                type="button"
              >
                {copyLabel}
              </button>
            </div>
          </div>

          <div className="preview-shell">
            <div className="preview-card">
              {renderResult ? (
                <iframe className="preview-frame" srcDoc={previewMarkup} title="Siggy preview" />
              ) : renderState === "error" ? (
                <div className="error-state">{renderError}</div>
              ) : (
                <div className="empty-state">Rendering signature preview...</div>
              )}
            </div>

            <div className="section-card">
              <div className="section-card__title">Render status</div>
              <div className="status-row">
                <span className="chip chip--strong">Target: Gmail web</span>
                <span className="chip">State: {renderState}</span>
                {renderResult ? (
                  <span className="chip mono">{renderResult.sizeBudget.charCount} chars</span>
                ) : null}
              </div>
              {renderResult ? (
                <>
                  <div className="meter" style={{ marginTop: "14px" }}>
                    <div
                      className={`meter__fill meter__fill--${renderResult.sizeBudget.status}`}
                      style={{ width: `${budgetWidth}%` }}
                    />
                  </div>
                  <div className="helper-text" style={{ marginTop: "10px" }}>
                    Soft limit {renderResult.sizeBudget.softLimit} · hard limit {renderResult.sizeBudget.hardLimit}
                  </div>
                </>
              ) : null}
            </div>

            {renderError ? <div className="error-state">{renderError}</div> : null}

            {renderResult?.warnings.length ? (
              <div className="warning-list">
                {renderResult.warnings.map((warning) => (
                  <div className={`warning warning--${warning.severity}`} key={warning.code}>
                    {warning.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No current rendering warnings for the Gmail profile.</div>
            )}

            <InstallGuide
              isConfirmed={installConfirmed}
              isOpen={isInstallOpen}
              onConfirmInstall={handleInstallConfirm}
              onToggle={handleInstallToggle}
            />

            <div className="support-grid">
              {Object.values(clientProfiles).map((profile) => (
                <div className="support-card" key={profile.id}>
                  <div className="support-card__eyebrow">Client profile</div>
                  <div className="support-card__title">{profile.label}</div>
                  <p>{profile.installSurface}</p>
                  <div
                    className={`support-card__status support-card__status--${profile.launchStatus}`}
                  >
                    {profile.launchStatus === "public" ? "Public now" : "Validation only"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function documentRef(tagName: "a") {
  return window.document.createElement(tagName);
}
