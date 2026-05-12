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
import { fontFamilyMap, fontOptions, isSystemFont } from "@/lib/fonts";
import { createBrowserDraftAdapter } from "@/lib/persistence";
import { templateDefinitions } from "@/lib/templates";
import type { AssetUploadResponse, RenderResult, SignatureDocument, SignatureImageAsset, TemplateId } from "@/lib/types";

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

export function StudioShell() {
  const { unlocked, token } = useAccess();
  const [document, setDocument] = useState<SignatureDocument>(() => createDefaultDocument());
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [renderState, setRenderState] = useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [copyLabel, setCopyLabel] = useState("Copy signature");
  const [isCopying, setIsCopying] = useState(false);
  const [isInstallOpen, setInstallOpen] = useState(false);
  const [installConfirmed, setInstallConfirmed] = useState(false);
  const [focusedLabel, setFocusedLabel] = useState<string | null>(null);
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
    <main className="page-shell page-shell--wysiwyg">
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

      <div className="editor-hint">
        {focusedLabel ? (
          <span className="editor-hint__editing">
            Editing — <strong>{focusedLabel}</strong>
          </span>
        ) : (
          <span>Tip — click any text below to edit it in place</span>
        )}
      </div>

      <div className="wysiwyg-stage">
        <SignatureEditor
          document={document}
          imageUrl={document.image?.url ?? null}
          unlocked={unlocked}
          onChange={updateDocument}
          onFieldFocus={setFocusedLabel}
          onImageUploaded={handleImageUploaded}
          onImageRemoved={handleImageRemoved}
        />

        <div className="style-pill" role="toolbar" aria-label="Style">
          <span className="style-pill__label">Font</span>
          <div className="style-pill__fonts">
            {fontOptions.map((font) => (
              <button
                key={font.id}
                className={`style-pill__font${document.fontFamily === font.id ? " style-pill__font--active" : ""}`}
                onClick={() =>
                  updateDocument((current) => ({ ...current, fontFamily: font.id }))
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
                  updateDocument((current) => ({ ...current, accentColor: choice }))
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

      <footer className="site-footer">
        <a href="/terms">Terms &amp; Conditions</a>
      </footer>
    </main>
  );
}
