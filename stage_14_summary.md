# Stage 14: Order Management

## Objective
Enable the ops app to receive and fulfill online orders created by the (future) OTC storefront project, satisfying the Stage 14 MVP boundary.

## Work Completed

1. **Database Schema (`supabase/migrations/12_otc_orders.sql`)**
   - Created the `otc_orders` table to track customer details, fulfillment method, delivery address, payment and fulfillment statuses.
   - Set up Row Level Security (RLS) to enforce the strict boundary outlined in Section 6.2 of the PRD:
     - `anon` (the storefront frontend) can **only** `INSERT` new orders.
     - `admin` and `staff` can read and manage orders fully.

2. **Backend Services (`app/actions/otc-orders.ts`)**
   - Created server actions `getOTCOrders` and `updateOrderStatus` for fetching and manipulating order states securely behind the authenticated session wall.

3. **UI Implementation (`components/otc/orders-table.tsx` & Pages)**
   - Created a comprehensive `OrdersTable` component supporting status updates (e.g. from `processing` to `out_for_delivery`), with a detailed slide-out/modal view for line items and customer contact details.
   - Built the Admin view at `app/admin/otc-orders/page.tsx` and the Staff view at `app/staff/otc-orders/page.tsx`.
   - As per the PRD, staff get the exact same fulfillment powers over these orders, but their view is simplified by naturally lacking the administrative tabs (OTC Store settings, Site Settings).
   - Added "OTC Orders" to the sidebar navigation for both roles.

## Next Steps
We are now fully prepared for **Stage 15: WhatsApp Agent, Reporting**, where we will integrate the Claude API to answer business queries directly from WhatsApp!
