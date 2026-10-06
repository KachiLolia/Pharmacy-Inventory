-- Stage 13: Shared Stock Functions

-- We need a reservations table to track generic stock holds before they become confirmed sales.
CREATE TABLE public.stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.stock_reservation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.stock_reservations(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES public.drugs(id),
    batch_id UUID NOT NULL REFERENCES public.batches(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

-- Enable RLS on reservations
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reservation_items ENABLE ROW LEVEL SECURITY;

-- Anon can insert and read their own reservations (if they have the ID)
-- But practically they only interact via the RPCs.
CREATE POLICY "Admin can do all on stock_reservations" ON public.stock_reservations FOR ALL USING (public.is_admin());
CREATE POLICY "Admin can do all on stock_reservation_items" ON public.stock_reservation_items FOR ALL USING (public.is_admin());

-- Modify reserve_stock to take an array of items and do FEFO allocation in Postgres.
-- p_items format: [{"drug_id": "uuid", "quantity": 1, "unit_price": 100}]
CREATE OR REPLACE FUNCTION public.reserve_stock(p_items JSONB, p_source TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_reservation_id UUID;
    v_item JSONB;
    v_batch RECORD;
    v_remaining_to_allocate INT;
    v_allocated_qty INT;
BEGIN
    -- Create reservation
    INSERT INTO public.stock_reservations (source) VALUES (p_source)
    RETURNING id INTO v_reservation_id;

    -- Allocate FEFO for each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_remaining_to_allocate := (v_item->>'quantity')::INT;
        
        IF v_remaining_to_allocate <= 0 THEN
            RAISE EXCEPTION 'Quantity must be positive';
        END IF;

        -- Fetch and lock active batches in FEFO order
        FOR v_batch IN 
            SELECT * FROM public.batches 
            WHERE drug_id = (v_item->>'drug_id')::UUID 
              AND (quantity_remaining - reserved_quantity) > 0 
              AND expiry_date >= CURRENT_DATE
            ORDER BY expiry_date ASC
            FOR UPDATE
        LOOP
            IF v_remaining_to_allocate <= 0 THEN
                EXIT;
            END IF;

            v_allocated_qty := LEAST(v_remaining_to_allocate, v_batch.quantity_remaining - v_batch.reserved_quantity);
            
            -- Reserve the stock on the batch
            UPDATE public.batches 
            SET reserved_quantity = reserved_quantity + v_allocated_qty
            WHERE id = v_batch.id;

            -- Record the allocation line item
            INSERT INTO public.stock_reservation_items (
                reservation_id, drug_id, batch_id, quantity, unit_price
            ) VALUES (
                v_reservation_id, 
                (v_item->>'drug_id')::UUID, 
                v_batch.id, 
                v_allocated_qty, 
                COALESCE((v_item->>'unit_price')::DECIMAL, v_batch.selling_price_per_unit)
            );

            v_remaining_to_allocate := v_remaining_to_allocate - v_allocated_qty;
        END LOOP;

        IF v_remaining_to_allocate > 0 THEN
            RAISE EXCEPTION 'Insufficient stock for drug %', v_item->>'drug_id';
        END IF;
    END LOOP;

    RETURN v_reservation_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.release_hold(p_reservation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- Lock reservation
    IF NOT EXISTS (SELECT 1 FROM public.stock_reservations WHERE id = p_reservation_id AND status = 'pending' FOR UPDATE) THEN
        RAISE EXCEPTION 'Reservation not found or not pending';
    END IF;

    -- Release stock
    FOR v_item IN SELECT * FROM public.stock_reservation_items WHERE reservation_id = p_reservation_id
    LOOP
        UPDATE public.batches
        SET reserved_quantity = reserved_quantity - v_item.quantity
        WHERE id = v_item.batch_id;
    END LOOP;

    -- Mark cancelled
    UPDATE public.stock_reservations
    SET status = 'cancelled'
    WHERE id = p_reservation_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.confirm_sale(p_reservation_id UUID, p_channel TEXT, p_payment_ref TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_reservation RECORD;
    v_item RECORD;
    v_prescription_id UUID;
    v_total_amount DECIMAL(10,2) := 0;
    v_receipt_number TEXT;
    v_user_id UUID;
BEGIN
    -- We need to know who is confirming (if authenticated, else storefront service role)
    v_user_id := auth.uid();
    
    -- 1. Lock reservation
    SELECT * INTO v_reservation 
    FROM public.stock_reservations 
    WHERE id = p_reservation_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found or not pending';
    END IF;

    -- 2. Decrement stock permanently
    FOR v_item IN SELECT * FROM public.stock_reservation_items WHERE reservation_id = p_reservation_id
    LOOP
        UPDATE public.batches
        SET 
            quantity_remaining = quantity_remaining - v_item.quantity,
            reserved_quantity = reserved_quantity - v_item.quantity
        WHERE id = v_item.batch_id;
        
        v_total_amount := v_total_amount + (v_item.quantity * v_item.unit_price);
    END LOOP;

    -- 3. Create the Sale record (prescriptions table is our central sales ledger)
    v_receipt_number := 'RCPT-' || (extract(epoch from now())::bigint)::text || '-' || floor(random() * 1000)::text;
    
    INSERT INTO public.prescriptions (
        status, 
        total_amount, 
        payment_method, 
        receipt_number, 
        created_by, -- can be null if storefront service role? Wait, schema requires created_by.
        created_at, 
        confirmed_at
    ) VALUES (
        'completed',
        v_total_amount,
        'transfer', -- generic default, could be mapped from p_payment_ref
        v_receipt_number,
        COALESCE(v_user_id, (SELECT id FROM public.app_users WHERE role = 'admin' LIMIT 1)), -- fallback for storefront
        NOW(),
        NOW()
    ) RETURNING id INTO v_prescription_id;

    -- Insert prescription items
    INSERT INTO public.prescription_items (
        prescription_id, drug_id, batch_id, quantity, unit_price, subtotal
    )
    SELECT 
        v_prescription_id, 
        drug_id, 
        batch_id, 
        quantity, 
        unit_price, 
        (quantity * unit_price)
    FROM public.stock_reservation_items
    WHERE reservation_id = p_reservation_id;

    -- 4. Update reservation status
    UPDATE public.stock_reservations
    SET status = 'confirmed'
    WHERE id = p_reservation_id;

    RETURN v_prescription_id;
END;
$$;

-- GRANTS per Section 6.2 and 6.3
-- Anon gets reserve and release.
GRANT EXECUTE ON FUNCTION public.reserve_stock TO anon;
GRANT EXECUTE ON FUNCTION public.release_hold TO anon;

-- Confirm sale restricted to authenticated/service contexts
REVOKE EXECUTE ON FUNCTION public.confirm_sale FROM public;
REVOKE EXECUTE ON FUNCTION public.confirm_sale FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sale TO service_role;

