# Aero Grill — branded restaurant demonstration

This is a self-contained **local-only demonstration**, built from the two user-provided HTML files. It reuses the supplied Aero Grill logo photograph and branded orange/red/yellow visual theme, and retains a migration path to the Supabase/AI OS/Yoco/WhatsApp components present in the original demo.

## Run locally

1. Extract the ZIP.
2. On a computer with Python, open a terminal in the `aero-grill-deployment` folder and run `python -m http.server 8080` (or use any static web server).
3. Visit `http://localhost:8080` in a browser. On Android, deploy to any HTTPS hosting first.

## GoDaddy publishing (static demo only)

1. Back up the existing website and document root. Do not overwrite an existing live site unless the domain owner authorises it.
2. In GoDaddy hosting File Manager / cPanel, open the correct domain's document root (often `public_html`, but confirm on your account).
3. Upload the *contents* of this folder, including `index.html`, `.htaccess`, `manifest.webmanifest`, `sw.js`, `robots.txt` and `assets/`.
4. Enable HTTPS/SSL on the domain and check that the homepage, assets, install icon, and browser navigation all load correctly.
5. Do not change DNS nameservers or any existing live payment settings without the domain owner's permission.

## Sandbox walkthrough

1. Order tab: add a Quarter Chicken (R25), Half Chicken (R50), or Full Chicken (R99), change quantity, and enter **fictional** name and a sample South African-format mobile number such as `0821234567`.
2. Select Cash on collection / demo; select Place demonstration order. The order exists *only in this browser's localStorage*.
3. Kitchen tab: click **Open demo kitchen**, advance from New -> Preparing -> Ready -> Completed, and print a demo kitchen ticket.
4. Manager tab: view sample statistics, mark menu items sold out, edit menu items, and edit unapproved restaurant details. All changes are confined to the browser.
5. Order tracking updates from that same browser. Refresh retains local changes. Clearing site data deletes them.

## Not active / not verified

- Real orders, payment processing, WhatsApp/ElevenLabs AI, merchant notifications, delivery, staff authentication, and AI OS backend event synchronization are NOT activated.
- The published demo sends **no Supabase requests**. The embedded public Supabase URL/key inherited from the original implementation are not used while `DEMO_MODE=true`. The key is publishable, not a service-role secret. A production security review of Supabase RLS/RPC access control is still required.
- The three printed-menu chicken prices are reference-derived, not reconfirmed with the owner; other meal prices, opening hours, physical address, phone, delivery and owner approval are not supplied.
- `DEMO_MODE` must remain true until a separate production implementation has been tested end-to-end. Flipping the flag alone is **not sufficient** to go live.
- A static GoDaddy site does not itself provide `/api/status`, `/api/checkout`, a webhook verifier, a real-time kitchen backend, or authenticated customer and order handling. Those need secure server-side deployment, appropriate merchant verification, verified webhook handling and tenant-specific access rules before launch.
- Do not enter real customer data in the demo; this is a demonstration and not a validated POPIA production service.

## Production acceptance gates

1. Written owner approval of menu/prices, address, phone, opening hours, delivery fees and collection instructions.
2. Verify Supabase tenant isolation, row-level security, staff role claims and all RPCs; test against cross-tenant access and unauthorised edits.
3. Server-side authoritative price calculations, stock checks, idempotent order creation, transaction semantics and server-authoritative delivery fees.
4. Configure restaurant-owned Yoco merchant account. Implement HTTPS server endpoints, secure payment creation and signed/reconciled webhooks. Only confirmed settlement counts as paid; return URLs do not confirm payment.
5. Connect approved WhatsApp Business API account and receive/send opt-in messages through a protected backend; implement human takeover, business-hours and escalation.
6. Deploy and verify secure authenticated staff kitchen/manager roles, notifications, logs, error alerts, backups, privacy notice and data retention policy.
7. Verify domain DNS/SSL, production load on phone and desktop, accessibility, test orders, printer and sign-off with owner.

## Files

- `index.html` — branded single-page demo and functional local workflow.
- `assets/aero-grill-brand.jpg` — exact logo crop embedded in supplied design.
- `assets/icon-*.png` — icons generated from that crop.
- `manifest.webmanifest`, `sw.js` — basic installable PWA assets (require localhost or HTTPS).
- `.htaccess` — optional Apache headers and directory protections.
- `robots.txt` — no indexing of demo pages by search engines (not access control).
