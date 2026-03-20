import type { SignatureDocument, SocialLink } from "./types";

const baseSocials: SocialLink[] = [
  { id: "linkedin", platform: "linkedin", url: "linkedin.com/in/sarahchen" },
  { id: "x", platform: "x", url: "x.com/sarahchen" },
  { id: "instagram", platform: "instagram", url: "" },
  { id: "github", platform: "github", url: "github.com/sarahchen" }
];

export function createDefaultDocument(): SignatureDocument {
  return {
    version: 1,
    templateId: "studio-split",
    targetProfileId: "gmail_web",
    fullName: "Sarah Chen",
    jobTitle: "Head of Design",
    company: "Meridian Studio",
    email: "sarah@meridian.design",
    phone: "+1 (415) 555-0142",
    website: "meridian.design",
    accentColor: "#4f46e5",
    image: null,
    socials: baseSocials,
    meta: {
      updatedAt: new Date().toISOString(),
      draftName: "Primary signature"
    }
  };
}
