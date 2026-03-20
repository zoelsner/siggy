import { createDefaultDocument } from "./default-document";
import type { SignatureDocument } from "./types";

export function createFixture(name: string): SignatureDocument {
  const base = createDefaultDocument();

  switch (name) {
    case "minimal":
      return {
        ...base,
        company: "",
        image: null,
        socials: base.socials.map((social, index) => ({
          ...social,
          url: index === 0 ? social.url : ""
        }))
      };
    case "full":
      return {
        ...base,
        image: {
          id: "asset-demo",
          url: "https://example.com/avatar.jpg",
          width: 96,
          height: 96,
          alt: "Sarah Chen headshot",
          contentType: "image/jpeg"
        }
      };
    case "long":
      return {
        ...base,
        fullName: "Sarah Catherine Chen-Livingston",
        jobTitle: "Global Head of Design Systems and Customer Experience",
        company: "Meridian Studio Collective and Advisory",
        website: "https://meridian.design/studio/signature-system"
      };
    default:
      return base;
  }
}
