-- Stage 11: Set Default Thresholds
-- This migration updates the drugs table to have sensible defaults instead of NULLs for threshold calculations.

-- Update existing records to have a sensible low stock threshold
UPDATE public.drugs 
SET low_stock_threshold = COALESCE(pack_size, 20) 
WHERE low_stock_threshold IS NULL;

-- Update existing records to have a default expiry warning
UPDATE public.drugs 
SET expiry_warning_days = 90 
WHERE expiry_warning_days IS NULL;

-- Note: The schema in 01_drug_catalog.sql already allows these to be NULL and falls back to global defaults in code.
-- This migration just explicitly seeds the initial dataset with practical values for the application.
