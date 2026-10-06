# Stage 12: OTC Admin Foundations - Completion Summary

This stage lays the groundwork for the public OTC storefront inside the existing pharmacy ops dashboard. The primary goal was to give admins complete control over what is displayed on the storefront without affecting the core inventory system.

## 1. Database Schema & RLS Policies
Created a new migration `supabase/migrations/10_otc_admin.sql` containing:
- **`otc_listings` table:** Bridges a catalog drug to the public store.
  - Fields: `drug_id`, `listed` (opt-in flag), `images`, `description_override`, `price_override`.
- **`storefront_settings` table:** A singleton table for site-wide configuration.
  - Fields: `pharmacy_name`, `logo_url`, `homepage_text`, `about_us_text`, `contact_email`, contact details, brand colors, `delivery_fee`, and Nigeria PCN licence regulatory fields.
- **Strict RLS Policies:** Adhering strictly to PRD Section 6.2, the `anon` role is locked down to only `SELECT` on `otc_listings` (where `listed = true`) and `SELECT` on `storefront_settings`. This guarantees the storefront cannot query the full `drugs` table or core inventory data. 

> [!WARNING]
> The database migration is prepared but **has not been pushed to Supabase** yet, as requested. The UI will use fallback defaults or gracefully fail until the database migration is applied.

## 2. Server Actions
Implemented secure server actions to bridge the UI to the new tables:
- [`app/actions/otc.ts`](file:///c:/Users/Lolia/Desktop/Pharmacy%20Inventory/app/actions/otc.ts): Fetching joined drug and listing data, and upserting listing configurations.
- [`app/actions/site-settings.ts`](file:///c:/Users/Lolia/Desktop/Pharmacy%20Inventory/app/actions/site-settings.ts): Fetching and updating the singleton storefront settings row.

## 3. Admin UI Additions
Expanded the Admin Dashboard with two new primary views, heavily utilizing the existing design system for a premium feel:
- **Sidebar Navigation:** Added `Store` (OTC Store) and `Globe` (Site Settings) icons and links to the [`app-sidebar.tsx`](file:///c:/Users/Lolia/Desktop/Pharmacy%20Inventory/components/layout/app-sidebar.tsx).
- **OTC Store Management (`/admin/otc`):** 
  - A comprehensive data table listing all catalog drugs.
  - Shows public status (Published/Unlisted) and live/override pricing logic.
  - An interactive dialog for toggling listing status, setting a fixed price override, and overriding the default description.
- **Site Settings (`/admin/site-settings`):**
  - A structured configuration page acting as a lightweight CMS.
  - Fields separated into logical groups: Branding & Styling (with native color pickers), Content, Contact & Delivery, and Regulatory (PCN Electronic Pharmacy Licence toggles).

## Next Steps
1. Review the UI and let me know if any visual adjustments are needed.
2. Confirm when you are ready to push the migrations to Supabase (`npx supabase db push`).
3. Move on to **Stage 13: Shared Stock Functions** (implementing the core stock reservation and decrement logic securely in Postgres).
