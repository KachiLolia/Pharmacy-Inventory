-- Migration: 16_anon_otc_catalog_read.sql
-- Enables public/anon role to read drug details and active batch pricing for items explicitly marked as listed.

CREATE POLICY "Anon can view listed drugs in catalog" ON public.drugs
    FOR SELECT USING (
        auth.role() = 'anon' AND 
        EXISTS (
            SELECT 1 FROM public.otc_listings 
            WHERE otc_listings.drug_id = drugs.id AND otc_listings.listed = true
        )
    );

CREATE POLICY "Anon can view active batches for listed drugs" ON public.batches
    FOR SELECT USING (
        auth.role() = 'anon' AND 
        EXISTS (
            SELECT 1 FROM public.otc_listings 
            WHERE otc_listings.drug_id = batches.drug_id AND otc_listings.listed = true
        ) AND
        quantity_remaining > 0 AND 
        expiry_date >= CURRENT_DATE
    );
