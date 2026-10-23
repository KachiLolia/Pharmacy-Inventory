-- Migration: 18_order_status_processing_default.sql
-- Default status for storefront orders is 'processing' until picked up or sent for delivery and completed

ALTER TABLE public.otc_orders ALTER COLUMN order_status SET DEFAULT 'processing';

-- Update any active or pending orders in database to 'processing'
UPDATE public.otc_orders 
SET order_status = 'processing' 
WHERE order_status = 'pending';
