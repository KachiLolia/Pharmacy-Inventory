-- Stage 12: OTC Admin Foundations

-- OTC Listings Table
CREATE TABLE public.otc_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drug_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE UNIQUE,
    listed BOOLEAN NOT NULL DEFAULT false,
    images TEXT[] NOT NULL DEFAULT '{}',
    description_override TEXT,
    price_override DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.otc_listings ENABLE ROW LEVEL SECURITY;

-- Allow anon to select only listed drugs, authenticated can see all
CREATE POLICY "Anon can view listed drugs" ON public.otc_listings
    FOR SELECT USING (
        (auth.role() = 'anon' AND listed = true) OR 
        (auth.role() = 'authenticated')
    );

-- Only admin can manage listings
CREATE POLICY "Admin can insert listings" ON public.otc_listings
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update listings" ON public.otc_listings
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete listings" ON public.otc_listings
    FOR DELETE USING (public.is_admin());


-- Storefront Settings Table (Singleton)
CREATE TABLE public.storefront_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    pharmacy_name TEXT NOT NULL DEFAULT 'My Pharmacy',
    logo_url TEXT,
    homepage_text TEXT,
    about_us_text TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_address TEXT,
    color_primary TEXT DEFAULT '#000000',
    color_secondary TEXT DEFAULT '#ffffff',
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    pcn_licence_number TEXT,
    display_pcn BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.storefront_settings ENABLE ROW LEVEL SECURITY;

-- Insert singleton row
INSERT INTO public.storefront_settings (id) VALUES (1);

-- Anon and authenticated can read
CREATE POLICY "Anyone can view storefront settings" ON public.storefront_settings
    FOR SELECT USING (true);

-- Only admin can update
CREATE POLICY "Admin can update storefront settings" ON public.storefront_settings
    FOR UPDATE USING (public.is_admin());

