# Stage 17 Hardening & Launch Gate: Verification Summary

## 1. Overview
The launch-gate hardening for the shared database layer connecting the Ops App and the public storefront has been successfully executed, locked down, and verified against the live Supabase instance.

---

## 2. Completed Phases

### Phase 0: Audit & Inspection
- Discovered and cataloged existing columns, RLS policies, and RPC signatures.
- Identified that `otc_orders` previously allowed `staff` full `ALL` access (including the ability to modify prices/totals/deletions).
- Confirmed missing PCN columns and legacy naming convention (`display_pcn`).

### Phase 1: Regulatory & PCN Compliance
- **Database (`14_pcn_fields.sql`)**:
  - Renamed `display_pcn` to `show_pcn_licence`.
  - Added `pcn_registration_number` (TEXT).
- **Admin Settings UI**:
  - Added "Provider Registration Number" input field.
  - Linked the toggle properly to `show_pcn_licence`.
- **Server Enforcement**:
  - Locked down `updateStorefrontSettings` Server Action with server-side validation against `app_users.role = 'admin'`, eliminating reliance on client-side form hiding.

### Phase 2: Security & Concurrency Lockdown
- **Database (`15_security_lockdown.sql`)**:
  - **RLS & Column-level Enforcement**:
    - Replaced the permissive `otc_orders` policy. Staff are strictly restricted to `SELECT` and `UPDATE`.
    - Implemented a `BEFORE UPDATE` trigger (`restrict_staff_otc_order_updates`) that aborts any transaction if a non-admin attempts to edit prices, line items, delivery addresses, customer details, or payment statuses. Only `order_status` (fulfillment status) can be altered by staff.
  - **Storage Buckets**:
    - Created the `otc_images` bucket and applied four explicit policies: public read (`SELECT`) and admin-only write (`INSERT`, `UPDATE`, `DELETE`).
  - **Function Hardening & Search Path Hijack Protection**:
    - Added `SET search_path = public, pg_temp` to `reserve_stock`, `release_hold`, and `confirm_sale`.
    - Revoked `EXECUTE` on all three functions from `PUBLIC`, `anon`, and `authenticated`.
    - Re-granted `reserve_stock` and `release_hold` to `anon`/`authenticated`.
    - Restricted `confirm_sale` exclusively to `authenticated` and `service_role`.
  - **Concurrency & Deadlock Prevention**:
    - Enforced deterministic batch row-locking in `reserve_stock` via `ORDER BY expiry_date ASC, id ASC`.
    - Added dynamic limit checks via `storefront_settings.max_qty_per_reservation` (default 100) and `storefront_settings.max_concurrent_holds` (default 5).
  - **Idempotency & Race Handling**:
    - Added `payment_reference` column to `prescriptions` with a `UNIQUE` constraint.
    - `confirm_sale` performs an initial check on `payment_reference` and idempotently returns the existing `prescription_id` without double-decrementing stock.
    - If a reservation expired before confirmation, it skips stock decrement, safely transitions the `otc_orders` status to `paid_unfulfillable`, and raises an exception.

---

## 3. Phase 3: Live Verification Results
Ran live automated verification against the remote Supabase project using `scripts/test_security.ts`:

- **Concurrency Limits (Spamming 10 holds from single IP)**:
  - **Expected:** 5 successes, 5 failures.
  - **Actual:** `5 successes, 5 failures`
  - **Result:** `PASS`
- **Idempotent Confirm (`confirm_sale` called twice with identical `payment_ref`)**:
  - **Expected:** Identical `prescription_id` returned without duplicating stock reduction.
  - **Actual:** Returned `d7aafc85-2f16-48d9-9d73-e4fae87207c5` for both calls.
  - **Result:** `PASS`
- **Database Migration Status**:
  - `14_pcn_fields.sql`: Applied successfully via `supabase db push`.
  - `15_security_lockdown.sql`: Applied successfully via `supabase db push`.
