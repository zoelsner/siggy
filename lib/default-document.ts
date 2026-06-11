import type { SignatureDocument, SocialLink } from "./types";

const baseSocials: SocialLink[] = [
  { id: "linkedin", platform: "linkedin", url: "" },
  { id: "x", platform: "x", url: "" },
  { id: "instagram", platform: "instagram", url: "" },
  { id: "github", platform: "github", url: "" }
];

export function createDefaultDocument(): SignatureDocument {
  return {
    version: 1,
    templateId: "edge",
    targetProfileId: "gmail_web",
    fullName: "Sarah Chen",
    jobTitle: "Head of Design",
    company: "Meridian Studio",
    email: "sarah@meridian.design",
    phone: "+1 (415) 555-0142",
    website: "meridian.design",
    accentColor: "#4f46e5",
    fontFamily: "georgia",
    image: null,
    nameImage: null,
    socials: baseSocials,
    cta: null,
    meta: {
      updatedAt: new Date().toISOString(),
      draftName: "Primary signature"
    }
  };
}
