# Siggy

Email signature builder. Next.js 15 App Router on Vercel.

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm test             # Vitest (9 tests)
npx tsc --noEmit     # Type check
npx vitest --run -u  # Update snapshots
```

## Architecture

```
app/
  page.tsx             # Landing page (marketing)
  editor/page.tsx      # Editor page (product)
  layout.tsx           # Root layout + lemon.js script
  api/
    render/            # Signature HTML rendering
    render-name/       # Name-as-image rendering (satori + resvg)
    assets/            # Headshot upload (sharp → Vercel Blob)
    verify-license/    # License key validation via LS API
    activate-order/    # Order ID → license key bridge for checkout overlay
    events/            # Analytics stub (console.log only)

components/
  studio-shell.tsx     # Main editor UI (sidebar + preview + template strip)
  license-input.tsx    # "Have a license key?" input
  install-guide.tsx    # Gmail paste instructions
  landing/             # Landing page sections (hero, nav, pricing, templates, how-it-works, footer)

lib/
  templates.tsx        # 4 signature templates (edge, bold, card, clean) — renders to React/HTML
  fonts.ts             # Font options, fontFamilyMap, Google Fonts fetching
  constants.ts         # useUnlocked hook (license verification + localStorage cache)
  checkout.ts          # CHECKOUT_URL constant
  checkout-overlay.ts  # Lemon Squeezy overlay (lemon.js) + order→license bridge
  runtime.ts           # Vercel Blob storage (saveAsset)
  render.tsx           # Server-side signature rendering pipeline
  types.ts             # Shared types (SignatureDocument, TemplateDefinition, etc.)
```

## Payment / Unlock Flow

- **Lemon Squeezy** for payments. Product: $49 LTD with license keys (unlimited length, 5 activations).
- **Currently in test mode** — no real charges. Test card: `4242 4242 4242 4242`
- Checkout opens as overlay via lemon.js → on success, `/api/activate-order` looks up license key → `/api/verify-license` validates it
- Returning users: license key cached in localStorage (`siggy_license`), re-verified against LS API every session
- Manual entry: `LicenseInput` component for pasting license key from email

## Environment Variables

| Var | Where | Purpose |
|-----|-------|---------|
| `BLOB_READ_WRITE_TOKEN` | `.env.local` + Vercel | Vercel Blob storage for headshots/name images |
| `LEMON_SQUEEZY_API_KEY` | `.env.local` + Vercel | LS API for license validation + order lookup |

## Gotchas

- **Stale `.next` cache**: If you see 500s or stale chunks after changes, `rm -rf .next` and restart.
- **Snapshot updates**: Template changes (fonts, colors, layout) require `npx vitest --run -u` to update 4 render snapshots.
- **Font rendering**: Preview uses web fonts via iframe. Copy output uses satori-generated name images for email client compatibility. System fonts (Georgia, Arial) skip image generation.
- **`fontFamilyMap`** lives in `lib/fonts.ts` — single source of truth. Don't duplicate in components.
- **`splitName`** lives in `lib/templates.tsx` — exported, don't redefine locally.
- **Vercel CLI**: Blob linking requires interactive multi-select — use the dashboard instead.

## Deployment

- GitHub repo `zoelsner/siggy` → Vercel auto-deploy on push to `main`
- Production URL: `siggy-orpin.vercel.app`
- Landing page at `/`, editor at `/editor`, terms at `/terms`
