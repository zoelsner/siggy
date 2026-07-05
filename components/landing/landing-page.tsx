"use client";

import { useState } from "react";

import { LandingFooter } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingNav } from "@/components/landing/nav";
import { Pricing } from "@/components/landing/pricing";
import { Templates } from "@/components/landing/templates";
import { createDefaultDocument } from "@/lib/default-document";
import { createBrowserDraftAdapter } from "@/lib/persistence";
import type { SignatureDocument, TemplateId } from "@/lib/types";

const draftAdapter = createBrowserDraftAdapter();

function persistDraft(patch: Partial<SignatureDocument>) {
  const doc = draftAdapter.load() ?? createDefaultDocument();
  draftAdapter.save({ ...doc, ...patch });
}

export function LandingPage() {
  const [name, setName] = useState("Sarah Chen");
  const [accent, setAccent] = useState("#4f46e5");

  const handleNameChange = (value: string) => {
    setName(value);
    persistDraft({ fullName: value });
  };

  const handleAccentChange = (color: string) => {
    setAccent(color);
    persistDraft({ accentColor: color });
  };

  const handleSelectTemplate = (templateId: TemplateId) => {
    persistDraft({ templateId, fullName: name, accentColor: accent });
    window.location.href = "/editor";
  };

  return (
    <div className="landing">
      <LandingNav />
      <Hero name={name} accent={accent} onNameChange={handleNameChange} onAccentChange={handleAccentChange} />
      <Templates name={name} accent={accent} onSelectTemplate={handleSelectTemplate} />
      <HowItWorks />
      <Pricing />
      <LandingFooter />
    </div>
  );
}
