import type { MetadataRoute } from "next";

import { PROFESSIONS } from "@/lib/professions";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/editor` },
    { url: `${SITE_URL}/restore` },
    ...PROFESSIONS.map((profession) => ({ url: `${SITE_URL}/for/${profession.slug}` }))
  ];
}
