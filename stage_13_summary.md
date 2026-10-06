# Stage 13: Shared Stock Functions

## Objective
Implement reusable Postgres functions that both the existing pharmacy point-of-sale (POS) app and the future WhatsApp storefront can use to reserve and deduct stock securely.

## Work Completed

1. **Database Schema & RPCs (`supabase/migrations/11_shared_stock_functions.sql`)**
   - Created `stock_reservations` and `stock_reservation_items` tables to hold pending carts from any source (POS or storefront).
   - Created `reserve_stock(p_items, p_source)` function: Automatically iterates over active batches and applies FEFO (first-expire, first-out) logic securely within the database to temporarily reserve stock.
   - Created `release_hold(p_reservation_id)` function: Reverts reservations and returns stock to available status if a cart is cancelled or expires.
   - Created `confirm_sale(p_reservation_id, p_channel, p_payment_ref)` function: Permanently deducts stock and generates the authoritative Sale ledger record (`prescriptions` row) along with a receipt number.
   - Applied specific grants: `anon` (storefront) can create and release reservations, but only `authenticated` (staff) or `service_role` can confirm the sale.

2. **In-Store POS Migration (`app/actions/pos.ts`)**
   - Ripped out the old application-level JavaScript FEFO logic (`calculateFEFOAllocation`).
   - The POS cart now calls the Postgres `reserve_stock` function directly upon checkout.
   - Re-routed `getPendingPrescriptions` to read from the generic `stock_reservations` queue instead of pending `prescriptions`, ensuring the UI continues to function identically.
   - Updated payment confirmation and cancellation to use the new `confirm_sale` and `release_hold` RPCs respectively.

3. **Local Dev Reliability (`lib/supabase/server.ts`)**
   - Added a `.rpc()` mock implementation to the local fallback client. This ensures that even while Supabase is disconnected, attempting to checkout via the POS doesn't crash the Next.js process.

## Next Steps
We are now fully prepared for **Stage 14: OTC Storefront Orders**, where we will define the `otc_orders` schema and the integration webhook that will finalize external purchases using these exact same stock functions.
