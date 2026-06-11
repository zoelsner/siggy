// Single source of truth for outward-facing links. The watermark in every
// copied free signature embeds SITE_URL permanently — signatures in the wild
// never update — so this must always point at a domain we control. When a
// custom domain is wired up, set NEXT_PUBLIC_SITE_URL (or change the fallback)
// and redeploy.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://siggy-orpin.vercel.app";

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "zachoelsner@gmail.com";
