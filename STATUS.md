# Siggy Status

## Accomplished

- Built the first Gmail-first, Outlook-ready Siggy MVP as a Next.js app.
- Implemented an accountless core flow:
  - choose a template
  - edit signature fields
  - preview the rendered signature
  - copy Gmail-ready HTML
  - follow a Gmail install guide
- Added a fixed 6-template system with conservative, email-safe layouts.
- Implemented the core shared interfaces:
  - `SignatureDocument`
  - `TemplateDefinition`
  - `ClientProfile`
  - `RenderResult`
  - `PersistenceAdapter`
- Implemented a shared render pipeline so preview and copied HTML come from the same source.
- Added client profiles for:
  - `gmail_web`
  - `outlook_web`
  - `outlook_windows_classic`
  - `apple_mail`
- Added render warnings and size-budget checks to keep output conservative and portable.
- Added browser-local draft persistence.
- Added JSON export/import for portable signature configs before auth exists.
- Added anonymous image upload and server-side image normalization for email-safe dimensions.
- Added Gmail install guidance directly in the product.
- Added event instrumentation for the proof loop:
  - landing viewed
  - first input
  - template selected
  - copy clicked
  - install guide opened
  - install confirmed
  - draft import/export/reset
  - image uploaded
- Added automated tests for:
  - document coercion and normalization
  - render snapshots across all shipped templates
  - Gmail-oriented size/warning behavior
  - Outlook-readiness guardrails
- Verified:
  - `npm test`
  - `npm run build`
- Manually verified the app loads and renders in a browser.

## Current State

- Public product posture is still Gmail-first.
- Outlook is not publicly supported yet, but the architecture is prepared for it.
- Auth is still deferred.
- Runtime uploads and analytics currently write to local runtime storage and need a real deployed environment for realistic production proof.

## Next Steps

1. Deploy the current app to a real public URL.
   - This is required so copied signatures reference real asset URLs instead of localhost-hosted development assets.

2. Run a small Gmail proof loop with real users.
   - Target 5-10 users.
   - Observe the full flow from edit to install to sending a test email.

3. Collect Gmail-specific failures and convert them into renderer rules.
   - Tighten warnings, size limits, and compatibility safeguards based on observed breakage.

4. Review analytics from the proof loop.
   - Identify where users drop:
     - before first input
     - before copy
     - after copy
     - during install

5. Cut or refine templates based on actual reliability.
   - If some templates are weaker in real Gmail usage, reduce the launch set.

6. Retest the Gmail flow after hardening.
   - Confirm time-to-copy, install success, and output stability improve.

7. Only after Gmail proof is solid, start Outlook hardening.
   - Begin with `outlook_web`.
   - Keep classic Windows Outlook as a later decision unless demand clearly justifies it.

## Short Recommendation

The highest-leverage next move is not adding features. It is:

- deploy
- test with real Gmail users
- harden the renderer
- retest

That will give the fastest proof of whether Siggy’s differentiation is real.
