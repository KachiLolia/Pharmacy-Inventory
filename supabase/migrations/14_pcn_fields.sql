-- Phase 1: PCN Fields

ALTER TABLE public.storefront_settings 
RENAME COLUMN display_pcn TO show_pcn_licence;

ALTER TABLE public.storefront_settings 
ADD COLUMN pcn_registration_number TEXT;
