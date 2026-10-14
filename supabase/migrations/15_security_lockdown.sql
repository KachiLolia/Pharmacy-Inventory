-- Phase 2: Security Lockdown

-- 0. Helper Functions
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE id = auth.uid() AND role = 'staff'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- is_staff is used in RLS policies, so authenticated users MUST be able to execute it.
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- 1. otc_orders RLS Fixes
DROP POLICY IF EXISTS "Admin/Staff can manage otc_orders" ON public.otc_orders;

CREATE POLICY "Admin can manage all otc_orders" 
    ON public.otc_orders 
    FOR ALL 
    TO authenticated 
    USING (public.is_admin());

CREATE POLICY "Staff can view otc_orders" 
    ON public.otc_orders 
    FOR SELECT 
    TO authenticated 
    USING (public.is_staff());

-- Staff can update fulfillment status only via Trigger
CREATE OR REPLACE FUNCTION public.restrict_staff_otc_order_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_staff() AND NOT public.is_admin() THEN
        -- Only allow order_status and updated_at to change
        IF NEW.customer_name != OLD.customer_name OR
           NEW.customer_phone != OLD.customer_phone OR
           NEW.fulfillment_method != OLD.fulfillment_method OR
           COALESCE(NEW.delivery_address, '') != COALESCE(OLD.delivery_address, '') OR
           NEW.line_items != OLD.line_items OR
           NEW.total_amount != OLD.total_amount OR
           NEW.payment_status != OLD.payment_status OR
           COALESCE(NEW.receipt_number, '') != COALESCE(OLD.receipt_number, '') OR
           COALESCE(NEW.payment_reference, '') != COALESCE(OLD.payment_reference, '') THEN
            RAISE EXCEPTION 'Staff are only allowed to update order fulfillment status';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_staff_otc_order_updates ON public.otc_orders;
CREATE TRIGGER enforce_staff_otc_order_updates
    BEFORE UPDATE ON public.otc_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.restrict_staff_otc_order_updates();

CREATE POLICY "Staff can update order fulfillment status only" 
    ON public.otc_orders 
    FOR UPDATE 
    TO authenticated 
    USING (public.is_staff());

-- 2. Enum update for paid_unfulfillable
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'paid_unfulfillable';

-- 3. Functions Rewrite
-- Revoke all EXECUTE first
REVOKE EXECUTE ON FUNCTION public.reserve_stock(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_hold(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_sale(uuid, text, text) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.storefront_settings ADD COLUMN IF NOT EXISTS max_qty_per_reservation INT DEFAULT 100;
ALTER TABLE public.storefront_settings ADD COLUMN IF NOT EXISTS max_concurrent_holds INT DEFAULT 5;

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
    v_total_qty INT := 0;
    v_active_holds INT;
    v_max_qty_per_reservation INT;
    v_max_concurrent_holds INT;
BEGIN
    SELECT max_qty_per_reservation, max_concurrent_holds 
    INTO v_max_qty_per_reservation, v_max_concurrent_holds
    FROM public.storefront_settings WHERE id = 1;

    v_max_qty_per_reservation := COALESCE(v_max_qty_per_reservation, 100);
    v_max_concurrent_holds := COALESCE(v_max_concurrent_holds, 5);

    -- Check concurrent holds per source (which often maps to a user/session)
    SELECT count(*) INTO v_active_holds
    FROM public.stock_reservations
    WHERE source = p_source AND status = 'pending' AND expires_at > NOW();

    IF v_active_holds >= v_max_concurrent_holds THEN
        RAISE EXCEPTION 'Maximum concurrent holds reached for this source';
    END IF;

    -- Allocate FEFO for each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_total_qty := v_total_qty + (v_item->>'quantity')::INT;
    END LOOP;
    
    IF v_total_qty > v_max_qty_per_reservation THEN
        RAISE EXCEPTION 'Maximum quantity per reservation exceeded';
    END IF;

    -- Create reservation
    INSERT INTO public.stock_reservations (source) VALUES (p_source)
    RETURNING id INTO v_reservation_id;

    -- Allocate FEFO for each item
    -- Lock batches in consistent order: expiry_date ASC, id ASC to prevent deadlock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_remaining_to_allocate := (v_item->>'quantity')::INT;
        
        IF v_remaining_to_allocate <= 0 THEN
            RAISE EXCEPTION 'Quantity must be positive';
        END IF;

        -- Fetch and lock active batches in FEFO order, adding ID for deterministic ordering
        FOR v_batch IN 
            SELECT * FROM public.batches 
            WHERE drug_id = (v_item->>'drug_id')::UUID 
              AND (quantity_remaining - reserved_quantity) > 0 
              AND expiry_date >= CURRENT_DATE
            ORDER BY expiry_date ASC, id ASC
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
        -- If already released/confirmed, idempotent return.
        RETURN;
    END IF;

    -- Release stock
    FOR v_item IN SELECT * FROM public.stock_reservation_items WHERE reservation_id = p_reservation_id
    LOOP
        UPDATE public.batches
        SET reserved_quantity = GREATEST(reserved_quantity - v_item.quantity, 0)
        WHERE id = v_item.batch_id;
    END LOOP;

    -- Mark cancelled
    UPDATE public.stock_reservations
    SET status = 'cancelled'
    WHERE id = p_reservation_id;
END;
$$;

-- Add payment_reference column
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS payment_reference TEXT UNIQUE;


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
    -- 1. Idempotency Check: if payment_ref already exists in prescriptions, return existing ID
    IF p_payment_ref IS NOT NULL THEN
        SELECT id INTO v_prescription_id FROM public.prescriptions WHERE payment_reference = p_payment_ref LIMIT 1;
        IF FOUND THEN
            RETURN v_prescription_id;
        END IF;
    END IF;

    v_user_id := auth.uid();
    
    -- 2. Lock reservation
    SELECT * INTO v_reservation 
    FROM public.stock_reservations 
    WHERE id = p_reservation_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    -- 3. If reservation is no longer pending or expired
    IF v_reservation.status != 'pending' OR v_reservation.expires_at < NOW() THEN
        -- Do not decrement stock. Mark order as paid_unfulfillable
        IF p_payment_ref IS NOT NULL THEN
            UPDATE public.otc_orders
            SET order_status = 'paid_unfulfillable', payment_status = 'paid'
            WHERE payment_reference = p_payment_ref;
        END IF;
        
        RAISE EXCEPTION 'Reservation expired or released. Order marked as paid_unfulfillable';
    END IF;

    -- 4. Decrement stock permanently
    FOR v_item IN SELECT * FROM public.stock_reservation_items WHERE reservation_id = p_reservation_id
    LOOP
        UPDATE public.batches
        SET 
            quantity_remaining = quantity_remaining - v_item.quantity,
            reserved_quantity = reserved_quantity - v_item.quantity
        WHERE id = v_item.batch_id;
        
        v_total_amount := v_total_amount + (v_item.quantity * v_item.unit_price);
    END LOOP;

    -- 5. Create the Sale record
    v_receipt_number := 'RCPT-' || (extract(epoch from now())::bigint)::text || '-' || floor(random() * 1000)::text;
    
    INSERT INTO public.prescriptions (
        status, 
        total_amount, 
        payment_method, 
        receipt_number, 
        created_by,
        created_at, 
        confirmed_at,
        payment_reference
    ) VALUES (
        'completed',
        v_total_amount,
        'transfer', 
        v_receipt_number,
        COALESCE(v_user_id, (SELECT id FROM public.app_users WHERE role = 'admin' LIMIT 1)),
        NOW(),
        NOW(),
        p_payment_ref
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

    -- Update reservation status
    UPDATE public.stock_reservations
    SET status = 'confirmed'
    WHERE id = p_reservation_id;

    RETURN v_prescription_id;
END;
$$;


-- 4. Re-Apply Execution Grants
GRANT EXECUTE ON FUNCTION public.reserve_stock(jsonb, text) TO anon;
GRANT EXECUTE ON FUNCTION public.reserve_stock(jsonb, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.release_hold(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.release_hold(uuid) TO authenticated;

-- confirm_sale only to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.confirm_sale(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sale(uuid, text, text) TO service_role;

-- 5. Storage Bucket Policies
INSERT INTO storage.buckets (id, name, public) VALUES ('otc_images', 'otc_images', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'otc_images');
CREATE POLICY "Admin Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'otc_images' AND public.is_admin());
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE USING (bucket_id = 'otc_images' AND public.is_admin());
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'otc_images' AND public.is_admin());