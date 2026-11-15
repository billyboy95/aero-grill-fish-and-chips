# Aero Grill — tasks 1–12 implementation report
Date: 1 November 2026. Release: 1.1.0.

## Outcome
The original restaurant app has been upgraded, and additive changes were applied to the existing Aero Grill demo tables in the connected AI AutoTech CRM database. No other client's tables, auth accounts or memberships were changed. This is not a production launch and not an isolated database branch. Restaurant live ordering remains blocked by the new order function. No merchant credentials or payment activation were added.

## Status by task
1. Hosted preview — BLOCKED. Vercel returned 403: connected account cannot create a project in team_mowr1SDo8xZ4Y6s1ahRhagSh. No Aero Grill project appeared in the accessible ten projects. CLI is unavailable. No unrelated project was reused. The source includes Vercel configuration and a local server.
2. Cloud database — IMPLEMENTED AND DATABASE TESTED. Existing demo module reused; profile table, delivery fields, request idempotency, update timestamps and protected content functions added.
3. Ordering — DATABASE TESTED. R123 example calculated from database prices, line items persisted, identical requests return one order. Browser-to-server flow still needs hosted browser verification.
4. Staff access — DATABASE TESTED. Existing owner membership retained. Anonymous order reads denied, non-member reads return no rows, non-member profile changes denied, authorised owner can read/update. No new staff invitations sent; named staff onboarding needs actual identities. Interactive password sign-in not tested.
5. Kitchen — IMPLEMENTED; DATABASE LIFECYCLE TESTED. Status progression enforced, unpaid online orders cannot progress, delivery details displayed, auto-refresh added. Physical printing and browser rendering unverified.
6. Tracking — IMPLEMENTED AND DATABASE TESTED. Status updates and token privacy verified; UI polls every 10 seconds while visible and exposes payment retry for pending online orders. Browser polling unverified.
7. Restaurant content — EDITING CONTROLS IMPLEMENTED. Owner can edit existing meal names/descriptions/prices/photo URLs and logo. Real approved menu, images and logo not supplied; illustrative items remain.
8. Business details — EDITING CONTROLS IMPLEMENTED. Address, phone, hours, collection instructions and approval are stored and displayed. Actual details await restaurant owner.
9. Delivery — IMPLEMENTED AND LOGIC TESTED. Address, postcode, zone selection, database fee calculation and activation gate added. Real zones/fees not supplied; delivery remains disabled. Deployment operator configures delivery_zones and delivery_enabled after owner approval.
10. Card payments — HANDLER CORRECTED AND MOCK-TESTED. Explicit disabled/test/live configuration, canonical return origin, provider idempotency, mode checks, saved-order retry. Merchant test and live transactions BLOCKED by missing credentials.
11. Payment confirmation — SIGNATURE/PAYLOAD TESTED. Reads Yoco payload.metadata.checkoutId, requires currency and matching mode, rejects stale/invalid signatures, preserves webhook reconciliation as payment authority. Database reconciliation has event deduplication. Real signed provider event and recovery testing still required.
12. Apple Pay/Google Pay — NOT ACTIVATED. Hosted checkout integration is ready for merchant configuration; available methods depend on provider, merchant and device. Do not represent wallet support as verified.

## Verification
- npm test: 13 tests passed (initial baseline was 4).
- All 69 static DOM IDs referenced by app code exist in index.html.
- JavaScript syntax checks passed.
- Database lifecycle assertions passed: total, items, idempotency, invalid token, staff progression to Completed, regression denial, non-member denial, invalid items and disabled delivery denial.
- Database delivery assertions passed: menu prices and delivery fees are server-authoritative, address snapshots persist, unsupported postcodes are rejected. Temporary delivery activation was rolled back.
- Database RLS assertions run as actual anon/authenticated roles passed. Owner identity was supplied via database test claims, not an interactive user session.
- Database payment assertions passed: conflicting checkout binding rejected; wrong amount rejected; duplicate event stored once; paid status not regressed by a later failure.
- Transactional acceptance rows were rolled back. One separately saved fictional test order is labelled DEMO Acceptance Test: 3a317a7a-d5e8-4046-8096-a8564bd1a365. Total R123, two item lines, status Completed, customer tracker Completed. No money received; never fulfil or contact it.
- No browser runtime, print device, card sandbox, Apple Pay or Google Pay end-to-end verification performed.

## Deployment and use
- Node 22+ recommended. Run `npm test`, then `npm start`. Open http://localhost:3000. No package installation is required.
- Local site uses the connected demo database. Use fictional details only.
- Existing authorised staff use their current Supabase email/password; passwords were not reset or extracted.
- Create/authorise the Vercel project aero-grill-restaurant-os in the connected team, then deploy a preview from this source. Keep PAYMENT_MODE=disabled and RESTAURANT_LIVE_APPROVED=false.
- Configure PUBLIC_BASE_URL as the exact approved HTTPS origin, with no pathname.
- Set PAYMENT_MODE=test only with the restaurant's test merchant key, signed webhook secret and a new matching protected internal secret. No secrets belong in chat or browser code.
- Live ordering is deliberately rejected by this release's database function. A later, separately verified launch change is required.

## Database change record
Applied migrations: aero_grill_phase_one; aero_grill_content_controls; aero_grill_checkout_lock. SQL is included under sql/.
Do not rerun the baseline or applied upgrades against this existing database.
The baseline now requires an explicitly configured restaurant.owner_org_id and no longer seeds a reusable gateway hash. Existing gateway settings were not rotated.
Emergency rollback of changed order/tracking/status functions is supplied; added columns/data remain intact. Review before execution.
The original downloaded ZIP is the pre-change source backup.

## Remaining inputs
Vercel project-creation/deployment permission; restaurant-approved menu/photos/logo/contact/hours; delivery zones/fees; named staff accounts; merchant-owned Yoco test/live credentials and wallet verification.

## Relevant existing infrastructure findings
The security advisor reports unrelated CRM findings and intentionally exposed guarded restaurant RPCs. Those wider CRM findings were not changed in this task. Public order and tracking RPCs remain intentional APIs, gated by server validation and unpredictable tokens. Project-wide security readiness is not claimed.
Advisor guidance: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Reference documentation checked
https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout
https://developer.yoco.com/api-reference/checkout-api/webhook-events/payment-notification
https://supabase.com/docs/guides/database/postgres/row-level-security
