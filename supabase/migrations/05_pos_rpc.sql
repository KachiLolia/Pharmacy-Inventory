-- Migration: 05_pos_rpc
-- Purpose: Create secure Postgres RPCs for POS transactions, bypassing RLS for batch modifications safely.

-- Ensure search_path is restricted for SECURITY DEFINER functions to prevent search path injection attacks.
-- It's best practice to set search_path = public.

CREATE OR REPLACE FUNCTION public.pos_create_prescription(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_prescription_id UUID;
    v_total_amount DECIMAL(10,2) := 0;
    v_item JSONB;
    v_batch RECORD;
    v_subtotal DECIMAL(10,2);
BEGIN
    -- 1. Authentication Check
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate user profile exists
    IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot create prescription with no items';
    END IF;

    -- 2. Create pending prescription
    INSERT INTO public.prescriptions (status, total_amount, created_by, created_at)
    VALUES ('pending', 0, v_user_id, NOW())
    RETURNING id INTO v_prescription_id;

    -- 3. Iterate through items ordered by batch_id to prevent deadlocks
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) ORDER BY value->>'batch_id'
    LOOP
        -- Validate quantity input
        IF (v_item->>'quantity')::INT <= 0 THEN
            RAISE EXCEPTION 'Quantity must be positive';
        END IF;

        -- Lock and fetch batch
        SELECT * INTO v_batch 
        FROM public.batches 
        WHERE id = (v_item->>'batch_id')::UUID 
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Batch % not found', v_item->>'batch_id';
        END IF;

        IF v_batch.drug_id != (v_item->>'drug_id')::UUID THEN
            RAISE EXCEPTION 'Batch % does not belong to drug %', v_batch.id, v_item->>'drug_id';
        END IF;

        -- Check expiry
        IF v_batch.expiry_date < CURRENT_DATE THEN
            RAISE EXCEPTION 'Batch % is expired', v_batch.id;
        END IF;

        -- Check stock
        IF (v_batch.quantity_remaining - v_batch.reserved_quantity) < (v_item->>'quantity')::INT THEN
            RAISE EXCEPTION 'Insufficient stock in batch %', v_batch.id;
        END IF;

        -- 4. Calculate authoritative financial values server-side
        v_subtotal := (v_item->>'quantity')::INT * v_batch.selling_price_per_unit;
        v_total_amount := v_total_amount + v_subtotal;

        -- 5. Update reserved quantity
        UPDATE public.batches
        SET reserved_quantity = reserved_quantity + (v_item->>'quantity')::INT
        WHERE id = v_batch.id;

        -- 6. Insert item
        INSERT INTO public.prescription_items (
            prescription_id, drug_id, batch_id, quantity, unit_price, subtotal
        ) VALUES (
            v_prescription_id, v_batch.drug_id, v_batch.id, (v_item->>'quantity')::INT, v_batch.selling_price_per_unit, v_subtotal
        );
    END LOOP;

    -- 7. Update prescription authoritative total
    UPDATE public.prescriptions
    SET total_amount = v_total_amount
    WHERE id = v_prescription_id;

    RETURN jsonb_build_object(
        'success', true,
        'prescription_id', v_prescription_id,
        'total_amount', v_total_amount
    );
END;
$$;


CREATE OR REPLACE FUNCTION public.pos_confirm_payment(p_prescription_id UUID, p_payment_method TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_prescription RECORD;
    v_item RECORD;
    v_receipt_number TEXT;
    v_confirmed_at TIMESTAMP WITH TIME ZONE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Validate payment method
    IF p_payment_method NOT IN ('cash', 'card', 'transfer') THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;

    -- 1. Lock prescription
    SELECT * INTO v_prescription 
    FROM public.prescriptions 
    WHERE id = p_prescription_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prescription not found';
    END IF;

    IF v_prescription.status != 'pending' THEN
        RAISE EXCEPTION 'Only pending prescriptions can be confirmed';
    END IF;

    -- Optional: Check if user is allowed to confirm it.
    -- Assuming any staff can confirm any pending prescription in the shared queue.
    
    -- 2. Generate authoritative server-side values
    v_receipt_number := 'RCPT-' || (extract(epoch from now())::bigint)::text || '-' || floor(random() * 1000)::text;
    v_confirmed_at := NOW();

    -- 3. Iterate through items to deduct stock. Ordered by batch_id to prevent deadlocks.
    FOR v_item IN (SELECT * FROM public.prescription_items WHERE prescription_id = p_prescription_id ORDER BY batch_id)
    LOOP
        UPDATE public.batches
        SET 
            quantity_remaining = quantity_remaining - v_item.quantity,
            reserved_quantity = reserved_quantity - v_item.quantity
        WHERE id = v_item.batch_id 
          AND quantity_remaining >= v_item.quantity
          AND reserved_quantity >= v_item.quantity;
          
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to deduct stock for batch %. Stock may have been corrupted or manually altered.', v_item.batch_id;
        END IF;
    END LOOP;

    -- 4. Mark completed atomically
    UPDATE public.prescriptions
    SET 
        status = 'completed',
        payment_method = p_payment_method::public.payment_method,
        receipt_number = v_receipt_number,
        confirmed_at = v_confirmed_at
    WHERE id = p_prescription_id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_number', v_receipt_number,
        'confirmed_at', v_confirmed_at
    );
END;
$$;


CREATE OR REPLACE FUNCTION public.pos_cancel_prescription(p_prescription_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_prescription RECORD;
    v_item RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Lock prescription
    SELECT * INTO v_prescription 
    FROM public.prescriptions 
    WHERE id = p_prescription_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prescription not found';
    END IF;

    IF v_prescription.status != 'pending' THEN
        RAISE EXCEPTION 'Only pending prescriptions can be cancelled';
    END IF;

    -- 2. Release reservations ordered by batch_id
    FOR v_item IN (SELECT * FROM public.prescription_items WHERE prescription_id = p_prescription_id ORDER BY batch_id)
    LOOP
        UPDATE public.batches
        SET reserved_quantity = reserved_quantity - v_item.quantity
        WHERE id = v_item.batch_id
          AND reserved_quantity >= v_item.quantity;
          
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to release reservation for batch %', v_item.batch_id;
        END IF;
    END LOOP;

    -- 3. Mark cancelled
    UPDATE public.prescriptions
    SET status = 'cancelled'
    WHERE id = p_prescription_id;

    RETURN TRUE;
END;
$$;
