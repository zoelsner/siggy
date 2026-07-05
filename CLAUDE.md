# Siggy

Email signature builder. Next.js 15 App Router on Vercel.

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm test             # Vitest (11 tests)
npx tsc --noEmit     # Type check
npx vitest --run -u  # Update snapshots
```

## Architecture

```
app/
  page.tsx             # Landing page (marketing)
  editor/page.tsx      # Editor page (product)
  layout.tsx           # Root layout
  api/
    render/            # Signature HTML rendering
    render-name/       # Name-as-image rendering (satori + resvg)
    assets/            # Headshot upload (sharp → Vercel Blob)
    billing/
      checkout/        # POST → creates Stripe Checkout Session, returns hosted URL
      webhook/         # POST raw Stripe webhook → verifies signature + handles checkout.session.completed
      verify-session/  # POST { sessionId } → exchanges paid Stripe session for HMAC token
      verify-token/    # POST { token } → verifies HMAC signature (no Stripe call)
      restore/         # POST { email } → emails a fresh access link if a paid session exists (always 200 { ok: true })
    events/            # Analytics stub (console.log only)
  restore/page.tsx     # "Restore access by email" form

components/
  studio-shell.tsx     # Main editor UI (sidebar + preview + template strip)
  install-guide.tsx    # Gmail paste instructions
  landing/             # Landing page sections (hero, nav, pricing, templates, how-it-works, footer)

lib/
  templates.tsx        # 4 signature templates (edge, bold, card, clean) — renders to React/HTML
  fonts.ts             # Font options, fontFamilyMap, Google Fonts fetching
  billing/
    index.ts           # Public surface: { useAccess }
    use-access.ts      # Client hook — { unlocked, resolved, startCheckout }; redeems ?session_id=… and ?access_token=… on mount
    stripe.ts          # Stripe SDK adapter — createCheckoutSession, isSessionPaid, findPaidSessionByEmail
    token.ts           # HMAC sign/verify for the access token (Web Crypto)
    email.ts           # sendAccessEmail — plain fetch to the Resend API (no SDK dep)
  runtime.ts           # Vercel Blob storage (saveAsset)
  render.tsx           # Server-side signature rendering pipeline (+ free-tier enforcement)
  site.ts              # SITE_URL + SUPPORT_EMAIL — single source for outward-facing links
  types.ts             # Shared types (SignatureDocument, TemplateDefinition, etc.)
```

## Payment / Unlock Flow

- **Stripe Checkout (hosted)** for payments. One-time $19 lifetime price.
- **Test mode** by default — test card `4242 4242 4242 4242`, any future expiry, any CVC.
- Click "Unlock Siggy" → `POST /api/billing/checkout` creates a Stripe Checkout Session → user is redirected to Stripe's hosted page → on success, Stripe redirects to `/editor?session_id=cs_…`.
- Stripe also sends `checkout.session.completed` to `POST /api/billing/webhook`; the route verifies the Stripe signature with `STRIPE_WEBHOOK_SECRET` before handling the event.
- The editor mounts → `useAccess()` detects `session_id`, calls `POST /api/billing/verify-session` which (a) confirms `payment_status === 'paid'` against Stripe and (b) returns an HMAC-signed access token. Token goes into `localStorage` as `siggy_access`.
- Returning users: token verified locally on every load via `POST /api/billing/verify-token` — pure HMAC check, no Stripe call. Lifetime = no token expiry.
- No license keys, no overlay, no DB. The signed token IS the proof of purchase.
- **Restore by email**: the webhook also emails a permanent access link (`/editor?access_token=…`) as a receipt when a checkout completes, and `/restore` lets a buyer re-request that link by email at any time — `POST /api/billing/restore` looks up any paid Stripe Checkout Session for that email (no time window, since it's a lifetime purchase) and, if found, emails a fresh token via `sendAccessEmail`. The endpoint always responds `{ ok: true }` and never returns the token directly, so it can't be used to probe which emails have purchased. Requires `RESEND_API_KEY`; without it, the webhook skips the receipt email silently and `/restore` still returns `{ ok: true }` while logging the failure.

### Free vs. paid (enforced server-side, flag-driven)

- **Current model**: everything is free — all templates, all 12 fonts, headshots, socials, CTA. The $19 unlock only removes the "Made with Siggy" watermark.
- **`GATES` in `lib/billing/gates.ts`** controls feature gating. Flip `proFonts`/`headshot` to `true` to move those behind the unlock — server enforcement (`enforceFreeTier` in `lib/render.tsx`, 403s in `/api/render-name` + `/api/assets`), the editor's locked UI states, and stale-draft downgrading all activate automatically. Update the pricing card copy in `components/landing/pricing.tsx` to match if you flip them.
- The watermark itself is always server-derived: `/api/render` verifies the HMAC token and only drops the watermark for valid tokens — never trust a client boolean.

## Environment Variables

| Var | Where | Purpose |
|-----|-------|---------|
| `BLOB_READ_WRITE_TOKEN` | `.env.local` + Vercel | Vercel Blob storage for headshots/name images |
| `STRIPE_SECRET_KEY` | `.env.local` + Vercel | Stripe API auth (use `sk_test_…` in dev) |
| `STRIPE_PUBLISHABLE_KEY` | optional | Stripe publishable key placeholder; hosted Checkout currently redirects by server-created URL |
| `STRIPE_PRODUCT_ID` | `.env.local` + Vercel | Stripe Product object for the $19 LTD, created by `npm run stripe:setup-product` |
| `STRIPE_PRICE_ID` | `.env.local` + Vercel | Stripe Price object for the $19 LTD |
| `STRIPE_WEBHOOK_SECRET` | `.env.local` + Vercel | Stripe webhook signing secret for `/api/billing/webhook` |
| `SIGGY_TOKEN_SECRET` | `.env.local` + Vercel | 32-byte hex string used to HMAC-sign access tokens — rotating it invalidates all existing tokens |
| `NEXT_PUBLIC_SITE_URL` | optional | Overrides the watermark/link URL in `lib/site.ts` (falls back to the production Vercel URL) — set when a custom domain is live |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | optional | Overrides the support mailto in `lib/site.ts` |
| `RESEND_API_KEY` | `.env.local` + Vercel | Resend API auth for purchase receipt + restore-access emails (`lib/billing/email.ts`) |

## Gotchas

- **Stale `.next` cache**: If you see 500s or stale chunks after changes, `rm -rf .next` and restart.
- **Snapshot updates**: Template changes (fonts, colors, layout) require `npx vitest --run -u` to update 4 render snapshots.
- **Font rendering**: Preview uses web fonts via iframe. Copy output uses satori-generated name images for email client compatibility. System fonts (Georgia, Arial) skip image generation.
- **`fontFamilyMap`** lives in `lib/fonts.ts` — single source of truth. Don't duplicate in components.
- **`splitName`** lives in `lib/templates.tsx` — exported, don't redefine locally.
- **Vercel CLI**: Blob linking requires interactive multi-select — use the dashboard instead.
- **Stripe product setup**: run `STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup-product` once, then store the printed `STRIPE_PRODUCT_ID` and `STRIPE_PRICE_ID` in Vercel.

## Deployment

- GitHub repo `zoelsner/siggy` → Vercel auto-deploy on push to `main`
- Production URL: `trysiggy.com`
- Landing page at `/`, editor at `/editor`, terms at `/terms`, restore access at `/restore`
