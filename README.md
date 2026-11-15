# Aero Grill — repair checkpoint, 15 November 2026

Preserves the existing vanilla JavaScript PWA, Node/Vercel API handlers and Supabase SQL source. The recovered browser-only demonstration is retained at `/demo/`.

## Verified
- Original 13 tests passed unchanged before repairs.
- 17 automated tests pass after repairs (Node 24.22.1).
- Local page opens and renders the menu, navigation and checkout.
- Existing Supabase project is ACTIVE_HEALTHY. Aero Grill tenant is demo, content unapproved, delivery disabled, 8 database menu items. Six restaurant tables have RLS enabled.

## Repairs
- No hard-coded shared CRM database connection. Explicit staging configuration is required.
- `/api/status` reports database readiness separately from API availability, verifies the selected tenant is in demo mode, and returns 503 for a configured but unavailable/non-demo database.
- WhatsApp cannot send merely because credentials exist; explicit sending and live approvals required.
- Preserved black/red/orange/yellow styling, corrected remaining green controls, increased narrow-screen touch targets and labelled search/chat inputs.
- Added .gitignore, isolated demo route, JPEG MIME type and configurable preview-server port.

## Run
`npm test` then `npm start`. Open http://localhost:3000/ or /demo/.
No package installation required. Use fictional information only.
Copy `.env.example` only when configuring a deliberately selected staging backend. Never commit populated secrets.

## Pending
- Emergent Aero-Grill-Staging comparison: sign-in required; no hosted changes made.
- GitHub private backup: connected account billyboy95 exposes no installations/repositories; CLI is logged out.
- Vercel: team visible, project creation returned 403. CLI installed; user sign-in/team authorisation pending. No deployment URL yet.
- Full functional browser testing, mobile/desktop deliverable screenshots, simulated payment scenarios and cross-device backend validation still pending.
- GoDaddy domain checks and production binding not performed.
- SQL files are historical migration records, not an automatically safe new-project bootstrap. No database records or schema were modified.

Do not claim production readiness or treat the browser-only demo as a shared database backend.
