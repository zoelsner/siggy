"use client";

import { useState } from "react";

import { LandingFooter } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingNav } from "@/components/landing/nav";
import { Pricing } from "@/components/landing/pricing";
import { ProfessionSections } from "@/components/landing/profession-sections";
import { Templates } from "@/components/landing/templates";
import { createDefaultDocument } from "@/lib/default-document";
import { createBrowserDraftAdapter } from "@/lib/persistence";
import type { Profession } from "@/lib/professions";
import type { SignatureDocument, TemplateId } from "@/lib/types";

const draftAdapter = createBrowserDraftAdapter();

function persistDraft(patch: Partial<SignatureDocument>) {
  const doc = draftAdapter.load() ?? createDefaultDocument();
  draftAdapter.save({ ...doc, ...patch });
}

export function LandingPage({ profession }: { profession?: Profession }) {
  const [name, setName] = useState(profession?.exampleName ?? "Sarah Chen");
  const [accent, setAccent] = useState(profession?.accent ?? "#4f46e5");

  const persona = profession
    ? { title: profession.exampleTitle, company: profession.exampleCompany, email: profession.exampleEmail }
    : undefined;

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
      <Hero
        name={name}
        accent={accent}
        onNameChange={handleNameChange}
        onAccentChange={handleAccentChange}
        eyebrow={profession ? `The 30-second signature for ${profession.plural}` : undefined}
        headline={profession?.headline}
        subtitle={profession?.subtitle}
        title={persona?.title}
        company={persona?.company}
        email={persona?.email}
      />
      <Templates
        name={name}
        accent={accent}
        onSelectTemplate={handleSelectTemplate}
        title={persona?.title}
        company={persona?.company}
        email={persona?.email}
      />
      {profession ? <ProfessionSections profession={profession} /> : null}
      <HowItWorks />
      <Pricing />
      <LandingFooter />
    </div>
  );
}
