# Pharmacy Ops System Extension: OTC Admin Controls & WhatsApp AI Agent

**Version:** 1.0
**Builds on:** `pharmacy_inventory_pos_prd.md` (the locked foundation). This document extends that same project, same repo, it is not a separate codebase. It adds the admin-facing controls for the OTC store, and a WhatsApp AI agent, both living inside the existing ops app.

**Related, separate project:** `pharmacy_otc_storefront_prd.md` is the public customer-facing website, a genuinely different repo and deployment. This document and that one connect only through the shared Supabase database, explained in section 6 of each.

---

## 1. Overview

Three additions to the ops app:

1. **OTC store admin controls**: a sidebar section where admin decides which catalog drugs are listed publicly, uploads their images, optionally overrides their online price, edits the storefront's site-wide content (logo, text, colors, contact info), and fulfills OTC orders.
2. **A WhatsApp AI agent**: admin can ask business questions and get answers, and can execute real catalog actions (add a drug, restock, archive, change a price) directly from WhatsApp.
3. **The shared database layer** that both this ops app and the separate storefront project depend on: three Postgres functions and a set of Row Level Security policies that make it safe for a public, anonymous website to read and write into the same database this internal system runs on.

---

## 2. Regulatory Note

Nigeria's Electronic Pharmacy Regulations 2026 require a PCN Electronic Pharmacy Licence for any pharmacy selling medicines online, with the licence number and PCN logo displayed on the public storefront's homepage. **Deferred for the demo build.** The `storefront_settings` table (section 3.2) includes these fields and a display toggle, off by default, so this is a configuration change when a real pharmacy is ready, not new development.

---

## 3. Data Model Additions (owned here, read by the storefront project)

### 3.1 OTC Listing

Bridges a catalog drug to the public store. Listing is opt-in, a drug existing in inventory does not automatically appear online.

Fields: drug reference, listed flag, storefront images (uploaded from admin's device, stored in Supabase Storage), storefront description (optional, falls back to the drug's name/dose), online price override (optional, nullable).

**Pricing rule:** null override means the storefront shows and charges the live current batch selling price. A set override is a fixed price that stays fixed, independent of what the in-store price does, until admin changes or clears it.

### 3.2 Storefront Settings

Single-row, site-wide configuration: pharmacy name, logo, homepage and about-us text, contact details, color tokens, delivery fee (flat, admin-configurable), PCN licence number and display toggle (off by default). This is a lightweight CMS layer: fixed page structure, editable content within it, not a page builder.

### 3.3 OTC Order (admin/staff view)

The storefront project creates these rows (full field list in its own PRD). From this side, admin and staff see: customer name, phone, fulfillment method, address if delivery, line items, total, payment status, order status, receipt number. **Fulfillment** (marking ready for pickup / out for delivery / completed) is available to both staff and admin, it's operational, not configuration.

### 3.4 Catalog Action Log (extends the foundation's existing audit trail)

One new field on the audit log the foundation already requires: **channel** (dashboard or whatsapp). Per your instruction, only catalog-level actions get logged here, not sales, prescriptions, or receipts, those are already captured in Sale records. Logged actions: drug added, drug archived, drug reactivated, batch/restock added, price changed. Each entry: action type, drug/batch reference, before/after values where relevant, channel, timestamp.

---

## 4. Admin Controls

New sidebar section, admin-only except where noted:

- **OTC Store**: every catalog drug with a list/unlist toggle, image upload, optional price override, optional description override
- **Site Settings**: logo, homepage/about text, contact details, colors, delivery fee, PCN display toggle and fields
- **Orders**: all OTC orders, filterable by status, with fulfillment actions. Staff also get a simpler version of this view (fulfillment only, no listing/pricing/settings access)

---

## 5. WhatsApp AI Agent

### 5.1 Capabilities

1. **Reporting/Q&A**: natural-language business questions ("how much did we make today," "what's low on stock," "show me yesterday's receipts"), answered from live data.
2. **Execute actions**: add a drug, restock, archive, or change a price, directly from a WhatsApp message, actually applied to the system, not queued for someone else to action.

### 5.2 Confirmation before executing (proposed default)

A misread WhatsApp message changing real inventory or pricing is a real risk ("restock paracetamol by 50" when three paracetamol variants exist). Default: for any action, the agent restates exactly what it's about to do, naming the specific drug/batch/price, and waits for explicit confirmation before executing. Reporting needs no confirmation, nothing changes state.

### 5.3 Technical requirements

Requires the real WhatsApp Business Platform through an authorized Business Solution Provider (360dialog, Twilio, Gupshup, or MessageBird), the free WhatsApp Business app has no API access. The agent runs on the Claude API with tool-calling, where every action is a real function call against the exact same backend endpoints the dashboard UI uses, not a parallel system that happens to produce similar results. A restock via WhatsApp and a restock via the dashboard need to be the same code path, or they drift out of sync.

Every executed action writes to the catalog action log (3.4) with `channel: whatsapp`.

### 5.4 Where responses appear

WhatsApp-initiated questions get answered on WhatsApp. The dashboard also surfaces a running log of everything the agent has done, for admin to review there too. Flag if you meant something more specific by wanting answers "directly on the platform."

---

## 6. The Shared Database Layer

This is the section the storefront project's own PRD points back to. It's documented here because this ops system is where the schema and the in-store sale flow originate, the storefront project is additive on top of what already exists here.

### 6.1 Why two repos can share one database safely

The storefront is a separate, unauthenticated, public-facing codebase. It connects to this same Supabase project using only the public anon key. What makes that safe is Row Level Security, enforced at the database level, not by either app's frontend code choosing to behave well.

### 6.2 What the anon role (the storefront's browser) is allowed to do

Exactly four things, nothing more:
- `SELECT` on `otc_listings` where `listed = true`
- `SELECT` on `storefront_settings`
- `INSERT` on `otc_orders`
- `EXECUTE` on `reserve_stock()` and `release_hold()`

Everything else, the full `drugs` table, `batches`, staff accounts, pricing edits, the audit log, is unreachable from that role. A bug in the storefront's frontend code cannot leak into admin data, because the database itself refuses the request.

### 6.3 The three shared functions

Stock-hold and FEFO decrement logic lives here, in Postgres, not duplicated as JavaScript in either app:

```sql
-- Called when something is added to a pending prescription (this app)
-- OR an online cart reaches checkout (storefront app).
-- Soft-reserves stock against the earliest-expiring batch(es), FEFO.
create function reserve_stock(p_drug_id uuid, p_quantity int, p_source text)
returns uuid security definer as $$ ... $$;

-- Called on prescription clear, cart abandonment, or hold timeout.
create function release_hold(p_reservation_id uuid)
returns void security definer as $$ ... $$;

-- Called only on confirmed payment: staff hitting Confirm Payment in this app,
-- or the storefront's own server-side webhook after Paystack verifies payment.
-- Permanently decrements stock, creates the Sale record (channel-tagged),
-- assigns the receipt number.
create function confirm_sale(p_reservation_id uuid, p_channel text, p_payment_ref text)
returns uuid security definer as $$ ... $$;
```

`reserve_stock` and `release_hold` are granted to the anon role so the storefront can call them directly. `confirm_sale` is granted only to this app's authenticated staff/admin role and to the storefront's server-side webhook handler (via its service role key, never its browser). It's the function that actually removes stock and books revenue, so it's deliberately gated behind proof that money was received, a customer's browser can never reach it directly.

---

## 7. Technical Architecture

| Layer | Choice | Why |
|---|---|---|
| Image storage | Supabase Storage | Admin uploads from this app; the storefront only ever displays, never writes, images |
| WhatsApp | WhatsApp Business Platform via a Business Solution Provider (360dialog, Twilio, Gupshup, or MessageBird) | Required for any programmatic WhatsApp access |
| AI agent | Claude API, tool-calling against this app's existing backend endpoints | One code path for dashboard and WhatsApp actions |
| Delivery logistics | Not handled in-system | Admin sets and this app records a flat fee; rider/logistics execution is out of scope unless requested separately |

---

## 8. Build Stages (continuing from the foundation's Stage 11)

### Stage 12: OTC Admin Foundations
- `otc_listings` and `storefront_settings` tables, RLS policies for the anon role locked down per section 6.2 before any public project is built against them
- Admin sidebar: OTC Store (list/unlist, images, price override) and Site Settings

**MVP boundary:** admin can fully configure what the (not-yet-built) storefront will show. No public site, no orders yet.

### Stage 13: Shared Stock Functions
- `reserve_stock()`, `release_hold()`, `confirm_sale()` implemented in Postgres (section 6.3)
- Existing in-store prescription flow migrated to call these functions, replacing any app-level JS equivalent
- Grants set correctly: anon gets the first two only, `confirm_sale` restricted to authenticated/service contexts

**MVP boundary:** the in-store flow works exactly as before, just routed through shared functions, ready for the storefront project to call the same ones.

### Stage 14: Order Management
- `otc_orders` table and RLS (anon: insert-only)
- Admin/staff Orders view and fulfillment actions (ready for pickup / out for delivery / completed)

**MVP boundary:** this app is ready to receive and fulfill orders the moment the separate storefront project starts creating them.

### Stage 15: WhatsApp Agent, Reporting
- BSP account setup, WhatsApp number provisioning
- Claude API agent wired to read-only endpoints: today's sales, stock levels, alerts, receipt lookup

**MVP boundary:** admin can ask business questions on WhatsApp and get accurate answers.

### Stage 16: WhatsApp Agent, Actions
- Tool-calling wired to the same catalog endpoints as the dashboard
- Confirmation-before-execute flow (5.2)
- Catalog action log writing `channel: whatsapp` entries

**MVP boundary:** admin can make real catalog changes from WhatsApp, fully traceable afterward.

### Stage 17: Hardening
- PCN licence fields wired up, off by default
- Security review: RLS policies match section 6.2 exactly, `confirm_sale()` genuinely unreachable from any anonymous context
- Confirm the shared functions behave correctly under concurrent calls from both this app and the storefront project at once

**MVP boundary:** launch gate, both this extension and the separate storefront project need to pass this before either goes live.

---

## 9. Open Questions

1. Confirmation-before-execute for WhatsApp actions (5.2) is my proposed default, confirm or adjust.
2. WhatsApp BSP choice: 360dialog, Twilio, Gupshup, MessageBird all work, differ on pricing/friction, worth deciding deliberately when ready to provision.
3. Delivery logistics: fee-and-record only, as scoped here, or do you want actual rider/logistics management built in?

---

## 10. Success Criteria

- Admin can list, unlist, price-override, and add images to any catalog drug, and edit the storefront's site content, without touching the core catalog
- Admin can ask the WhatsApp agent a business question and get an answer sourced from live data
- Admin can execute a real catalog action via WhatsApp, with the agent confirming before executing, reflected immediately in the dashboard and logged with its channel
- `reserve_stock`, `release_hold`, and `confirm_sale` behave identically regardless of whether they're called from this app or the separate storefront project
- The anon role genuinely cannot reach anything beyond the four permissions in section 6.2, verified by testing directly against the database
