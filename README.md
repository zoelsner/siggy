# Siggy

Email signature builder for designers, creatives, and freelancers. Pick a template, type your details, copy/paste into Gmail. No account, no setup.

**Live:** [siggy-orpin.vercel.app](https://siggy-orpin.vercel.app)

![Screenshot placeholder — landing page](docs/screenshot-landing.png)

## What it does

- Six fixed templates (edge, bold, card, clean, plus variants) — all email-client safe (Gmail web, Outlook web, Outlook Windows Classic, Apple Mail)
- Live preview and copy-paste HTML output, both rendered through the same pipeline
- Optional headshot upload (Vercel Blob, processed via sharp)
- Custom name typography rendered as an image (Satori + Resvg) so it survives email clients that strip web fonts
- Install guide for Gmail paste

## Pricing

- Free with a small watermark
- $19 lifetime license removes the watermark and unlocks full font/headshot options
- Payments via Stripe Checkout (hosted); access proven by HMAC-signed token in localStorage, no DB

## Tech stack

- **Framework:** Next.js 15 (App Router) on Vercel
- **UI:** React 19 + TypeScript + Tailwind
- **Image rendering:** Satori + @resvg/resvg-js (server-side name images), sharp (headshot processing)
- **Storage:** Vercel Blob for user-uploaded assets
- **Payments:** Stripe Checkout (hosted page) + HMAC access token (no DB)
- **Tests:** Vitest with snapshot tests for template rendering

## Run locally

```bash
npm install
cp .env.local.example .env.local   # add BLOB_READ_WRITE_TOKEN, STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SIGGY_TOKEN_SECRET
npm run dev                         # http://localhost:3000
```

For tests:

```bash
npm test                # Vitest
npx tsc --noEmit        # type check
npx vitest --run -u     # update template snapshots
```

## Status

MVP shipped, in test mode for payments. Six templates, Gmail-ready output, Stripe-based unlock flow live. Outlook/Apple Mail render adapters in place.

## License

Source-available for review. Not licensed for redistribution.
