-- Stage 2: Drug Catalog Schema

-- Create unit type enum
CREATE TYPE unit_type AS ENUM ('countable', 'whole');

-- Create drugs table
CREATE TABLE public.drugs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    dose TEXT NOT NULL,
    nafdac_number TEXT,
    category TEXT NOT NULL,
    form TEXT NOT NULL, -- e.g., 'tablet', 'syrup'
    unit_type unit_type NOT NULL,
    pack_size INTEGER, -- only needed if unit_type is 'countable'
    low_stock_threshold INTEGER, -- overrides global default if set
    expiry_warning_days INTEGER, -- overrides global default if set
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure pack_size is present if countable
    CONSTRAINT pack_size_check CHECK (
        (unit_type = 'countable' AND pack_size IS NOT NULL AND pack_size > 0) OR
        (unit_type = 'whole')
    )
);

-- Enable RLS
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;

-- Policies for drugs

-- 1. All authenticated users (admin & staff) can view drugs
CREATE POLICY "Anyone can view drugs"
    ON public.drugs
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2. Only admins can insert drugs
CREATE POLICY "Admins can insert drugs"
    ON public.drugs
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
    ));

-- 3. Only admins can update drugs
CREATE POLICY "Admins can update drugs"
    ON public.drugs
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Note: No DELETE policy because we use is_active flag for soft-deleting/discontinuing
