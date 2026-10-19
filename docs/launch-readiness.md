# KAIRO launch readiness — 19 October 2026

## Verified infrastructure
- Production deployment at baseline commit d082791: READY.
- RP Social database: active; all 27 public tables have RLS enabled (policy behavior still requires per-role testing).
- Eight existing Edge Functions deployed; minute jobs for Meta, video and reel processing enabled.
- No connected Meta accounts at inspection time.
- Google Places environment entry exists on Vercel. OPENAI_API_KEY is missing; no payment integration exists.

## Changes in this release
- Real Meta OAuth from Social Connections; workspace-scoped channels via the team RPC, no token columns queried by the client.
- Explicit workspace ownership validation before creating OAuth state.
- Password recovery request and reset page, accessible without the onboarding overlay.
- Readable controls, scrolling sidebar, responsive layouts, primary publication actions, standard visible pointer.
- Removed hardcoded PRO badge and inactive search affordance.
- Authenticated integrations diagnostics; credentials never returned to the browser.
- Copy API now shares the configured public Supabase fallback and has a provider timeout.
- Framework updated to Next.js 15.5.28; ZIP and CSS dependencies patched.
- Removed anonymous execution permissions from admin RPCs; existing admin checks retained.

## External activation still required
1. Add OPENAI_API_KEY as a server-side secret to this Vercel project. Redeploy after setting it. Never use NEXT_PUBLIC_ for this key.
2. Ensure Supabase Auth redirect allowlist accepts https://gestionale-social.vercel.app/auth and /auth/reset. Verify delivery of confirmation and recovery messages, including SMTP configuration.
3. Meta developer configuration must use the callback in docs/meta-publishing.md. The owner must authorize the desired pages and professional Instagram accounts; client access requires the applicable Meta review/permissions.
4. Online payments are not implemented. Select/connect the payment provider, configure products and fiscal requirements, then implement and verify checkout, signed webhooks, plan changes, cancellation and failure handling. The existing subscriptions table and quota rules do not constitute billing.
5. Automatic Stories/carousels, LinkedIn and TikTok publishing remain unavailable. Existing carousel/story export remains available.
6. Automatic subtitles remain unimplemented.

## Acceptance checks
- Registration → email confirmation → login → recovery email → new password → login.
- Owner and collaborator workspace isolation; switching activities does not leak assets or attach Meta to another activity.
- Analysis → strategy → idea → copy → image → approval → calendar → Meta queue.
- Upload originals, export carousel/story, produce/download a 30-second reel; check rendering and sound.
- Verify quota reservation, successful consumption and release on technical failure.
- Meta OAuth → correct page/account selection → publish a confirmed test post → schedule/cancel → verify no duplicate sends.
- Verify mobile layouts on an actual iPhone and Android before onboarding paying clients.

## Validation for this change
- Production build with Next.js 15.5.28: passed.
- npm audit: zero known vulnerabilities at validation time.
- Smoke checks: five pages return HTTP 200; three API routes reject anonymous requests; diagnostics reject invalid sessions.
- Meta workspace RPC: anonymous execution denied, authenticated execution granted; owner validation retained inside the function.
- Admin RPCs: anonymous execution denied; existing admin role guards retained.
- Lead Finder now checks Premium access and available quota before external search, then reserves usage before executing the search. A provider failure after reservation may consume one search; automatic refunds need a separate idempotent ledger design.
- Email delivery, full logged-in flows, generation charges, actual mobile devices and Meta publishing are not tested in this change.
