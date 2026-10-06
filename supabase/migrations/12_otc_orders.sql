-- Stage 14: OTC Storefront Orders

CREATE TYPE public.fulfillment_method AS ENUM ('pickup', 'delivery');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled');

CREATE TABLE public.otc_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    fulfillment_method public.fulfillment_method NOT NULL,
    delivery_address TEXT,
    
    -- The snapshot of the items purchased
    line_items JSONB NOT NULL,
    
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status public.payment_status NOT NULL DEFAULT 'pending',
    order_status public.order_status NOT NULL DEFAULT 'pending',
    
    receipt_number TEXT,
    payment_reference TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_otc_orders_updated_at
    BEFORE UPDATE ON public.otc_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.otc_orders ENABLE ROW LEVEL SECURITY;

-- Anon (the public storefront) can only insert new orders.
CREATE POLICY "Anon can insert otc_orders" 
    ON public.otc_orders 
    FOR INSERT 
    TO anon 
    WITH CHECK (true);

-- Authenticated Admin/Staff can do everything
CREATE POLICY "Admin/Staff can manage otc_orders" 
    ON public.otc_orders 
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users 
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Service role can do everything
CREATE POLICY "Service role can manage otc_orders" 
    ON public.otc_orders 
    FOR ALL 
    TO service_role 
    USING (true);

