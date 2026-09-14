# Pharmacy Inventory & POS System: Product Requirements Document

**Version:** 1.0
**Scope:** Single-location pharmacy, inventory management plus point-of-sale, no patient portal or online store

---

## 1. Overview

A standalone system for one pharmacy to manage stock, track expiry, sell drugs at the counter, and generate sales/profit reports. This is not the full community pharmacy system already scoped elsewhere in this project: there's no patient portal, no online store, no consultations, no prescription verification workflow. It's the inventory and POS core, built properly, with the gaps that version's Stage 2 and Stage 3 left underspecified filled in here.

Two roles: **Admin** (exactly one account) and **Staff** (as many accounts as the pharmacy needs, all created and managed by admin). If it's a larger operation with multiple people selling, every staff account is separate so every sale is traceable back to exactly who made it, while everyone still feeds into one shared dashboard and stock pool. There's no separate pharmacist role in this version since there's no verification gate or consultation feature to justify one.

---

## 2. User Roles & Permissions

| Capability | Staff | Admin |
|---|---|---|
| Process a sale (build prescription, confirm payment) | Yes | Yes |
| View stock levels and search drugs at point of sale | Yes | Yes |
| View dashboard (today's sales, prescriptions filled, low-stock and expiry alerts) | Yes, view-only | Yes |
| View detailed analytics and sales/profit reports (date-range, per-staff breakdown) | No | Yes |
| Add/edit drugs in the catalog | No | Yes |
| Set or change prices | No | Yes |
| Restock (add new stock) | No | Yes |
| Record a stock adjustment (damage, loss, correction) | No | Yes |
| Set low-stock and expiry-warning thresholds | No | Yes |
| Discontinue a drug | No | Yes |
| Process a refund/reversal on a confirmed sale | No | Yes |
| Create/manage staff accounts | No | Yes |

There is exactly one admin account. Staff accounts are unlimited, each one belongs to a specific person or till, and every sale a staff account makes stays attached to that account for full traceability. Staff can see the dashboard, today's sales, how many prescriptions have been filled, and stock alerts (low-stock, expiring soon), but it's a view-only screen, they can't act on anything from it, no editing, no restocking, no dismissing alerts. Detailed analytics, date-range reports, profit breakdowns, and every configuration or management action stay admin-only.

---

## 3. Core Data Model

### 3.1 Drug (catalog item)

This is the "what is it" record: name, dose (e.g. 200mg, 625mg, this is part of what makes a catalog entry unique since Paracetamol 500mg and Paracetamol 650mg are two separate entries, not one drug with a variable dose), NAFDAC registration number, category, form (tablet, capsule, syrup, cream, spray, injection, etc.), low-stock threshold override (optional, falls back to a global default), expiry-warning window override (optional, falls back to a global default), discontinued flag, created date.

Batch number is already tracked, but at the batch level (section 3.2 below), not here on the drug record, since a batch number is specific to a particular shipment of stock and a single drug can have several different batch numbers in stock at once. NAFDAC number, on the other hand, belongs on the drug record itself, since it's tied to the registered product (name, dose, manufacturer), not to any one shipment of it.

The drug record does **not** hold quantity, manufacturing date, expiry date, or cost/sale price directly. Those live on batches, explained below, since a restock can bring in stock with a different manufacturing date, expiry date, and cost than what's already on the shelf. A drug can have zero, one, or several batches in stock at once.

**Finalized rule for units:** tablets and capsules are counted and sold individually, with a `pack_size` (units per pack, e.g. a pack of 100 tablets) so admin can restock by pack while the system tracks and sells by the individual tablet. Everything else (syrups, creams, sprays, injections) is sold as a whole sealed unit, no fractional selling, no per-ml or per-gram pricing.

**On discontinuing a drug, this solves exactly the problem you're describing.** Take your example: you were stocking Emzor Paracetamol 500mg, the supplier got expensive, you switched to GSK Paracetamol 500mg. These are two separate catalog entries (different manufacturer, potentially different cost/price), not one entry with a changed supplier. When you stop stocking Emzor PCM, you discontinue it: it vanishes from search, from the sellable catalog, from anything staff can see or select. There's no confusion, nothing showing "in stock" that isn't actually available, nothing miscosting a current sale. What survives underneath is only the historical record, so a report you pull for last quarter still correctly shows "Emzor PCM 500mg" sales from back when you were stocking it, instead of that data becoming orphaned or disappearing. Nobody browsing the live pharmacy ever sees it again unless it's specifically reactivated because you started stocking it again.

### 3.2 Batch

This is the actual physical stock that exists on the shelf, and it's the piece the original inventory idea was missing. Every time stock comes in, whether it's a first stock-in or a restock, it creates a batch, not an edit to an existing number.

Fields: drug reference, batch number (optional, useful if the supplier provides one), quantity received (in base units, i.e. if you bought 3 packs of 100 tablets, this is 300), quantity remaining (decrements as sales and adjustments happen against this batch), cost price per unit, selling price per unit, manufacturing date, expiry date, date received, received by (admin).

**Why this matters:** if you have 40 tablets left from an old batch expiring next month, and you restock with 300 more tablets expiring in a year, a single "quantity" and "expiry date" field on the drug record can't represent both at once. With batches, both exist as separate rows, and the system can correctly warn about the 40 tablets specifically, not silently overwrite that expiry date with the new batch's.

**Selling deducts from the batch closest to expiry first (first-expire-first-out).** If a sale needs 10 tablets and there are 6 left in the batch expiring soonest, it takes those 6 and the remaining 4 from the next batch, splitting across batches transparently if needed. This is what actually prevents stock from expiring on the shelf while newer stock sells from the front, which was a real gap in the original idea.

**Selling price per batch, not per drug:** if cost prices change between restocks, the selling price might too. In practice you probably want one consistent shelf price for a drug regardless of which batch it's coming from, so consider defaulting new batches to the drug's current price, but allow an admin override per batch (useful when a supplier drops a rare bulk discount and you want to pass it on temporarily, or when the price genuinely needs to change and old-batch stock should sell at the old price until it clears).

### 3.3 Stock Adjustment

Stock doesn't only leave through sales. Damage, disposal of expired stock, theft, and correcting a miscount all reduce (or occasionally increase, for a correction) what's on the shelf without a sale happening. Without this, a system that only decrements stock via sales will drift from reality within weeks.

Fields: batch reference, type (damaged, expired/disposed, theft/loss, correction), quantity adjusted, reason note (free text, required), staff who logged it, date.

This is admin-only. A staff account finding 3 broken bottles doesn't get to silently zero them out; they flag it and admin records the adjustment.

### 3.4 Sale

Fields: date/time started, staff account, line items (each: batch reference, quantity, unit price at time of sale, subtotal), total, payment method (cash, card/POS, transfer), status (pending, confirmed, voided, refunded/partially refunded), confirmed at (timestamp, null until confirmed), receipt number (assigned only on confirmation, not when the cart is first built).

**The system doesn't process payment, it records payment that already happened.** Staff aren't taking money through this system, they're collecting it separately (cash, a card terminal, a bank transfer) and then confirming in the system that it was received. This means a sale (called a **prescription** while it's being filled, before payment is confirmed) exists in two states:

- **Pending (being filled):** the prescription is built, items and quantities are set, total is calculated, stock for those items is soft-reserved (see below) but not yet decremented, and it doesn't count toward any report
- **Confirmed:** staff have verified payment was received and hit confirm. Only at this point does stock actually decrement, a receipt number gets assigned, and the sale becomes part of the day's total

This matters because it's the whole point of the check you're describing: if the confirmed total in the system doesn't match what's actually in the drawer at the end of the day, something is wrong, either a sale that should have been confirmed wasn't, or one got confirmed without the money actually coming in. That gap is only visible if pending and confirmed are genuinely separate states, not just a payment-method dropdown on a single-step sale.

**Unit price is captured at the moment of sale**, not looked up live from the drug record when a report runs later. If you change a price next month, last month's report needs to reflect what things actually sold for at the time, not recalculate using today's price.

### 3.5 Restock (action, not a data object)

Restocking is a guided flow, not "edit the quantity field." Admin selects the drug, enters quantity received (in packs or in base units, whichever is easier to input), cost price, expiry date, and it creates a new batch (or adds to an existing batch only if expiry date and cost price both match exactly, otherwise it's a distinct batch even for the same drug).

---

## 4. Point of Sale Flow

Staff work with a **prescription**, not a "cart," while it's being filled. Once it's ready, there are exactly two actions available: **Clear** or **Confirm Payment**. Nothing more complicated than that on the staff-facing screen.

1. Staff search for a drug by name and add it to the prescription with a quantity. This creates a **pending** prescription, and the quantity is immediately soft-reserved against the relevant batch(es), so it's no longer available to be added to a different pending prescription
2. System checks total available (non-reserved, non-expired) stock for that drug; if insufficient, the item can't be added past what's genuinely available
3. The prescription screen shows drug, quantity, unit price, subtotal, and a low-stock badge if this sale would push the drug below its threshold
4. Zero-stock and expired items are disabled entirely, not just flagged, highlighted red for staff so it's visually obvious, and cannot be added to any prescription under any circumstance, no admin override
5. Staff collect payment outside the system (cash handed over, card tapped on a separate terminal, transfer received), and select which payment method was used
6. Staff hit **Confirm Payment** once they've verified the money actually came in. This is a deliberate, separate action, not a default that happens automatically when the prescription is finalized
7. On confirmation: the reserved stock is actually decremented batch-by-batch using first-expire-first-out, status flips to confirmed, a receipt number is assigned, the sale is added to the day's total, and the receipt prints automatically
8. Receipt (printed via a connected receipt printer): pharmacy name, date/time, itemized list (drug, quantity, price), subtotal, total, payment method, receipt number, and the staff account that made the sale

**Stock hold and release:** the reservation created in step 1 releases automatically if the prescription is cleared, or after a period of inactivity if it's simply abandoned, whichever comes first. This timeout defaults to 20 minutes but is an admin-configurable setting, not a fixed number in the code, so it can be tuned up or down based on how the pharmacy actually operates. This is what prevents two staff accounts from both being able to sell the last unit of something: whoever adds it to their prescription first holds it, the second person sees it as unavailable until the first prescription is confirmed, cleared, or times out.

**Clearing a pending prescription:** since nothing has actually happened yet at the pending stage (no stock decremented, no payment recorded), any staff account can clear their own pending prescription freely, no admin approval needed. The cleared record stays for audit purposes, it just doesn't touch stock or totals.

**Reversing a confirmed sale is a separate, admin-only action.** See section 4.2.

---

## 4.2 Refunds & Reversals (Admin Only)

Admin can reverse a confirmed sale, either in full or for a single line item within it, reducing the confirmed total by the refunded amount and logging who processed it, when, and why.

**Whether the item returns to sellable stock is an admin-configurable setting**, not hardcoded, defaulting to off (refunded items do not go back into inventory, since in most cases they've already left the building and can't be resold in good conscience). A pharmacy that wants refunded items to return to stock can flip that setting on. This keeps the safe default in place without locking every pharmacy using this system into one fixed behavior.

---

## 4.1 End-of-Day Reconciliation

Since the confirmed total in the system is meant to match what's actually in the drawer, it's worth building this as an explicit step rather than leaving it as something admin does in their head with a calculator.

This isn't locked to a fixed time of day, admin can run it whenever, against whatever date range makes sense. Admin enters what was actually counted (cash in the drawer, POS/card settlement total, transfer total received), and the system compares it against its own confirmed-sales total for that period, broken down by payment method and, since multiple staff accounts can be active, by staff account too. This doesn't fix a mismatch automatically, it just surfaces it clearly so it can be investigated the same day rather than discovered weeks later.

---

## 5. Alerts

**Low stock:** admin sets a global default threshold (e.g. "alert me at 50 units remaining"), with the option to override it per drug, since a fast-moving painkiller and a rarely-sold specialty item shouldn't share the same number.

**Expiry warning:** admin sets a global default window (e.g. "alert me 90 days before expiry"), with a per-drug override. This checks batch expiry dates, not a single date on the drug, so a drug with three batches at different expiry dates can surface three separate warnings if needed.

**Delivery:** alerts show on the admin dashboard, and also go out to the admin's email and by SMS, so nothing gets missed on a busy day. This means the admin profile needs an email address and phone number captured at account setup, both required fields since they're the alert destinations.

---

## 6. Dashboard

Staff and admin both see a dashboard, but not the same one.

**Staff view (view-only, no actions available):**
- Today's total sales and number of prescriptions filled, for their own account
- Low-stock alerts and expiry alerts (what's low, what's expiring soon)
- No pricing, cost, or profit figures, no per-staff comparison, no way to act on an alert from here

**Admin view (full):**
- Today's total sales (revenue), with a breakdown by staff account so it's clear who sold what
- Number of transactions today, by staff account
- Top-selling drugs today (and optionally this week/month)
- Low-stock count and list
- Expiry-warning count and list
- Total inventory value (sum of quantity times cost price)

---

## 7. Reports (Admin Only)

Date-range selector (today, this week, this month, custom range), then:

- **Sales report:** total revenue, transaction count, breakdown by drug (quantity sold, revenue per drug), and breakdown by staff account (who sold what, how much) for accountability and traceability
- **Profit report:** revenue minus cost of goods sold, per drug, per staff account, or overall, for the selected range
- **Stock report:** current quantity per drug, current value, batches nearing expiry

No tax or VAT calculation in v1, prices shown are final.

**MVP boundary:** on-screen reports first. CSV export can follow once you know which reports actually get used regularly.

---

## 8. Non-Functional Requirements

- **Mobile-first for admin.** Admin needs to check sales, stock, and alerts from a phone, not just a desk computer, since that's realistically how they'll monitor the pharmacy day to day. The dashboard, reports, and alerts all need to work cleanly on a phone screen, not just be a shrunk-down version of a desktop layout.
- **Simplicity is a requirement, not a nice-to-have.** Both interfaces need to be immediately obvious with no learning curve. For staff, this means the point-of-sale screen has exactly the actions needed to fill and confirm a prescription, nothing else competing for attention. For admin, this means stock, sales, and alerts are visible and understandable at a glance, without digging through menus to find basic numbers.
- Role-based access enforced server-side, not just hidden in the UI: a staff account hitting the "add drug" or "view reports" endpoint directly should be rejected server-side even if that button isn't visible to them
- Fully responsive across phone, tablet, and desktop, since staff and admin may each use different devices
- Passwords hashed (bcrypt or argon2)
- Audit trail at minimum for: price changes, stock adjustments, restocks, drug discontinuation, and refunds, tied to the account that did it
- Automated daily database backup

---

## 9. Out of Scope for This Version

- Patient records and dispensing history tied to a named patient
- Online store / e-commerce checkout
- Consultations or appointment booking
- Prescription verification or a pharmacist-approval gate
- Drug interaction checking or controlled-substance monitoring
- Multi-branch / multi-location support
- Barcode scanning
- Tax/VAT calculation
- "Pay later" or on-account credit for customers

---

## 10. Open Questions to Resolve Before Build

None remaining. Every item raised during this process has a resolved answer reflected in the sections above: discontinued drugs are hidden, not deleted; the stock-hold timeout is admin-configurable; refunds default to not restocking the item but that's a toggle, not a hardcoded rule; and both interfaces are built mobile-first and deliberately simple.

---

## 11. Success Criteria for V1

- Admin can add a drug, restock it, and see it reflected correctly across separate batches with their own manufacturing/expiry dates and costs
- A staff account can build a prescription, confirm payment separately, and stock only decrements (with a receipt generated) at confirmation, not before
- Two staff accounts cannot both sell the same last unit of stock; whichever prescription claims it first holds it until confirmed, cleared, or timed out
- End-of-day counted totals can be compared against the system's confirmed total by payment method and by staff account, with any mismatch clearly visible
- Low-stock and expiry alerts trigger correctly and reach the admin's dashboard, email, and phone
- A stock adjustment (damage/loss/correction) is logged and reflected in current stock without needing a sale to explain the change
- Admin can pull a sales and profit report for a custom date range, broken down by staff account, and see it match what was actually sold in that window
- A staff account cannot access drug creation, pricing, restocking, refunds, or detailed analytics/reports, verified by testing the API directly, not just by checking the UI hides the buttons, but can see their own basic dashboard (today's sales, prescriptions filled, stock alerts) in view-only form
- Expired stock cannot be sold under any circumstance, by any account
- Admin can check today's sales, stock alerts, and reports comfortably from a phone, with no layout that only works on desktop
- A new staff member can complete a sale correctly with no training beyond being shown the screen once, since the point-of-sale interface has nothing to figure out

---

## 12. Technical Architecture

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui | Component library and utility CSS get a clean, mobile-first UI built fast without reinventing basic components; TypeScript catches data-model mistakes (e.g. mixing up a drug reference and a batch reference) before they become runtime bugs |
| Backend | Next.js Route Handlers (API routes) | No separate backend service to deploy or maintain; the pending-sale/stock-hold logic below still needs to live server-side, but it doesn't need a standalone Express app to do that for a system this size |
| Database | PostgreSQL via Supabase | Gives Postgres, authentication, and row-level security in one place, which matters here since role enforcement (staff vs. admin) needs to hold at the database level, not just in the UI |
| Auth | Supabase Auth, email/password for both roles | No OTP needed here, unlike the school or full pharmacy system, since both roles are internal staff accounts, not customer-facing logins |
| Email alerts | Brevo | Sends low-stock/expiry alerts and any receipt-copy emails to admin |
| SMS alerts | Termii or Africa's Talking | Sends the same alerts by SMS to admin's phone; either works well with Nigerian numbers |
| Payments | None processed in-system | Reiterating: this system records that payment happened, it doesn't take payment itself, so there's no Paystack/Flutterwave integration needed here the way the other systems in this project have |
| Hosting | Vercel (app) + Supabase (database/auth) | One deployment target for the app, managed database with backups handled by Supabase rather than self-managed |
| Receipt printing | Browser print stylesheet sized for 80mm thermal paper, or direct ESC/POS printing via WebUSB if a specific thermal printer model is chosen | The right approach depends on which physical receipt printer you actually buy; flagging both paths since it changes based on hardware, not something to lock in blind |

### 12.1 Handling the stock hold correctly

This is the one piece of the system that needs to be built carefully, since it's what prevents two staff accounts from selling the same last unit.

- Add a `reserved_quantity` column on the batch table, separate from `quantity_remaining`. "Available to sell" is always `quantity_remaining minus reserved_quantity`, never just `quantity_remaining` on its own.
- Adding an item to a pending prescription increments `reserved_quantity` on the relevant batch(es), inside a database transaction, so two simultaneous requests can't both succeed in reserving the same last unit.
- Clearing a prescription, or its timeout expiring, decrements `reserved_quantity` back down.
- Confirming payment is what actually decrements `quantity_remaining` (and its matching `reserved_quantity`) for real, permanently.
- The timeout release needs a scheduled job, not something that only runs when a user happens to load a page. A Vercel Cron Job hitting a small API route every few minutes to release any expired holds is the straightforward way to do this.

### 12.2 UI principles carried through the whole build

- Mobile-first layout for both roles, tested on an actual phone screen at every stage, not just resized in a desktop browser
- The staff point-of-sale screen has one clear job: search, add to prescription, clear or confirm. No secondary navigation competing for attention on that screen.
- Admin's mobile dashboard leads with the numbers that matter most day to day (today's sales, alerts) before anything else, so the important information doesn't require scrolling or digging
- Consistent, minimal color and type system (shadcn/ui's defaults are a reasonable starting point) rather than a custom design system built from scratch, since visual consistency matters more here than a distinctive brand look

---

## 13. Build Stages

Sequential, each one buildable and demoable before moving to the next. Every stage has a hard MVP boundary so it's clear what's deferred.

### Stage 1: Foundations
- Project setup: Next.js app, Supabase project, database schema for users/roles
- Admin account creation (one, fixed), staff account creation/management by admin
- Auth: login for both roles, role-based route protection enforced server-side
- Basic mobile-first app shell/navigation for both roles

**MVP boundary:** login and role separation working end to end. No drugs, no sales yet, just the skeleton and access control.

### Stage 2: Drug Catalog
- Drug CRUD (admin only): name, dose, NAFDAC number, category, form, thresholds
- Discontinue/reactivate flow (not a hard delete)
- Unit-type logic: tablet/capsule (countable, pack_size) vs. everything else (whole-unit only)

**MVP boundary:** admin can build and maintain the catalog. No batches or stock quantities yet, that's next.

### Stage 3: Batches & Restocking
- Batch data model: quantity, cost price, selling price, manufacturing date, expiry date, batch number
- Restock flow (admin only), creating a new batch or adding to a matching one
- Stock view: current quantity per drug, aggregated across batches

**MVP boundary:** admin can restock and see accurate stock levels. No selling yet.

### Stage 4: Stock Adjustments
- Adjustment flow (admin only): damaged, expired/disposed, theft/loss, correction
- Adjustment history per batch

**MVP boundary:** stock can be corrected outside of a sale, with a reason logged.

### Stage 5: Point of Sale, Part 1 (Building a Prescription)
- Drug search, add to prescription with quantity
- Reserved-quantity logic (section 12.1) enforced server-side
- Zero-stock and expired-item hard blocking, with red highlighting
- Low-stock badge shown in real time as items are added

**MVP boundary:** a prescription can be built correctly and safely, including the stock hold. Payment confirmation comes next.

### Stage 6: Point of Sale, Part 2 (Confirming Payment & Receipts)
- Confirm Payment action: stock decrement (first-expire-first-out), receipt number assignment
- Clear action for pending prescriptions
- Scheduled job for releasing timed-out holds
- Receipt generation and printing

**MVP boundary:** a full sale can be completed start to finish, correctly, with a printed receipt.

### Stage 7: Refunds & Reversals
- Admin-only reversal flow, full or partial (single line item)
- Configurable setting: does a refunded item return to stock or not

**MVP boundary:** admin can correctly reverse a mistaken or returned sale.

### Stage 8: Alerts
- Global and per-drug low-stock and expiry-warning thresholds (admin configurable)
- Alert delivery: dashboard, email (Brevo), SMS (Termii/Africa's Talking) to admin

**MVP boundary:** alerts trigger reliably and reach admin through all three channels.

### Stage 9: Dashboards
- Staff dashboard: view-only, today's sales, prescriptions filled, stock alerts
- Admin dashboard: full view, per-staff breakdown, top sellers, inventory value

**MVP boundary:** both dashboards are live and mobile-friendly.

### Stage 10: Reports & Reconciliation
- Admin-only sales and profit reports, date-range selector, per-drug and per-staff breakdown
- Stock report (current levels, value, batches nearing expiry)
- End-of-day reconciliation: counted totals entry vs. confirmed system total, by payment method and staff account

**MVP boundary:** admin can run any report needed and reconcile a day's takings.

### Stage 11: Security & Production Hardening
- Full role-based access audit: every admin-only action re-tested by hitting the API directly as a staff account
- Audit log covering price changes, stock adjustments, restocks, discontinuation, and refunds
- Automated daily database backup
- Final mobile responsiveness pass across both dashboards and the point-of-sale screen
- Deploy to Vercel with production environment variables set

**MVP boundary:** this is the launch gate. Nothing ships to the real pharmacy until this stage is done.
