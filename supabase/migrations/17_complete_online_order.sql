-- Migration: 17_complete_online_order.sql
-- 1. Add 'online' value to payment_method enum
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'online';

-- 2. Function to atomically complete an OTC order, deduct inventory in FEFO order, and record the sale
CREATE OR REPLACE FUNCTION public.complete_otc_order(p_order_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_item JSONB;
    v_batch RECORD;
    v_drug_id UUID;
    v_req_qty INT;
    v_remaining INT;
    v_alloc INT;
    v_unit_price DECIMAL(10,2);
    v_prescription_id UUID;
    v_receipt_number TEXT;
    v_admin_id UUID;
    v_reservation_id UUID;
BEGIN
    -- 1. Lock the order row
    SELECT * INTO v_order 
    FROM public.otc_orders 
    WHERE id = p_order_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'OTC Order % not found', p_order_id;
    END IF;

    -- 2. Check if a prescription already exists for this order (Idempotency)
    SELECT id INTO v_prescription_id 
    FROM public.prescriptions 
    WHERE payment_reference = COALESCE(v_order.payment_reference, 'ORDER-' || v_order.id::text)
       OR (v_order.receipt_number IS NOT NULL AND receipt_number = v_order.receipt_number)
    LIMIT 1;

    IF v_prescription_id IS NOT NULL THEN
        -- Already recorded as a completed sale. Ensure status is completed and return existing id.
        UPDATE public.otc_orders
        SET order_status = 'completed', payment_status = 'paid'
        WHERE id = p_order_id;
        RETURN v_prescription_id;
    END IF;

    -- Resolve admin user id for created_by fallback
    SELECT id INTO v_admin_id FROM public.app_users WHERE role = 'admin' LIMIT 1;

    -- 3. Generate receipt number if not set
    v_receipt_number := COALESCE(
        v_order.receipt_number, 
        'RCPT-' || (extract(epoch from now())::bigint)::text || '-' || floor(random() * 1000)::text
    );

    -- 4. Create the sale ledger record in public.prescriptions
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
        v_order.total_amount,
        'online'::public.payment_method,
        v_receipt_number,
        COALESCE(p_user_id, auth.uid(), v_admin_id),
        v_order.created_at,
        NOW(),
        COALESCE(v_order.payment_reference, 'ORDER-' || v_order.id::text)
    ) RETURNING id INTO v_prescription_id;

    -- 5. Deduct stock from batches in FEFO order for each item in the order line_items
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.line_items)
    LOOP
        v_drug_id := (v_item->>'drug_id')::UUID;
        v_req_qty := (v_item->>'quantity')::INT;
        v_unit_price := COALESCE((v_item->>'unit_price')::DECIMAL, 0);
        v_remaining := v_req_qty;

        IF v_remaining <= 0 THEN
            CONTINUE;
        END IF;

        -- Step 5a: Allocate across active, non-expired batches (FEFO)
        FOR v_batch IN 
            SELECT * FROM public.batches 
            WHERE drug_id = v_drug_id 
              AND quantity_remaining > 0 
              AND expiry_date >= CURRENT_DATE
            ORDER BY expiry_date ASC
            FOR UPDATE
        LOOP
            IF v_remaining <= 0 THEN
                EXIT;
            END IF;

            v_alloc := LEAST(v_remaining, v_batch.quantity_remaining);

            -- Permanently decrement stock
            UPDATE public.batches
            SET 
                quantity_remaining = quantity_remaining - v_alloc,
                reserved_quantity = GREATEST(reserved_quantity - v_alloc, 0)
            WHERE id = v_batch.id;

            -- Record line item in prescription_items
            INSERT INTO public.prescription_items (
                prescription_id, drug_id, batch_id, quantity, unit_price, subtotal
            ) VALUES (
                v_prescription_id,
                v_drug_id,
                v_batch.id,
                v_alloc,
                CASE WHEN v_unit_price > 0 THEN v_unit_price ELSE v_batch.selling_price_per_unit END,
                (v_alloc * CASE WHEN v_unit_price > 0 THEN v_unit_price ELSE v_batch.selling_price_per_unit END)
            );

            v_remaining := v_remaining - v_alloc;
        END LOOP;

        -- Step 5b: Fallback if no non-expired batch had sufficient stock (e.g. inventory discrepancy)
        IF v_remaining > 0 THEN
            FOR v_batch IN 
                SELECT * FROM public.batches 
                WHERE drug_id = v_drug_id 
                  AND quantity_remaining > 0
                ORDER BY expiry_date ASC
                FOR UPDATE
            LOOP
                IF v_remaining <= 0 THEN
                    EXIT;
                END IF;

                v_alloc := LEAST(v_remaining, v_batch.quantity_remaining);

                UPDATE public.batches
                SET 
                    quantity_remaining = quantity_remaining - v_alloc,
                    reserved_quantity = GREATEST(reserved_quantity - v_alloc, 0)
                WHERE id = v_batch.id;

                INSERT INTO public.prescription_items (
                    prescription_id, drug_id, batch_id, quantity, unit_price, subtotal
                ) VALUES (
                    v_prescription_id,
                    v_drug_id,
                    v_batch.id,
                    v_alloc,
                    CASE WHEN v_unit_price > 0 THEN v_unit_price ELSE v_batch.selling_price_per_unit END,
                    (v_alloc * CASE WHEN v_unit_price > 0 THEN v_unit_price ELSE v_batch.selling_price_per_unit END)
                );

                v_remaining := v_remaining - v_alloc;
            END LOOP;
        END IF;

        -- Step 5c: If still remaining (zero batches in system), record item with a fallback batch if available
        IF v_remaining > 0 THEN
            SELECT id INTO v_reservation_id FROM public.batches WHERE drug_id = v_drug_id LIMIT 1;
            IF v_reservation_id IS NOT NULL THEN
                INSERT INTO public.prescription_items (
                    prescription_id, drug_id, batch_id, quantity, unit_price, subtotal
                ) VALUES (
                    v_prescription_id,
                    v_drug_id,
                    v_reservation_id,
                    v_remaining,
                    v_unit_price,
                    (v_remaining * v_unit_price)
                );
            END IF;
        END IF;
    END LOOP;

    -- 6. Mark any associated stock_reservations as confirmed
    UPDATE public.stock_reservations
    SET status = 'confirmed'
    WHERE id IN (
        SELECT DISTINCT (item->>'reservation_id')::UUID
        FROM jsonb_array_elements(v_order.line_items) item
        WHERE (item->>'reservation_id') IS NOT NULL
    );

    -- 7. Update order status and receipt number on otc_orders
    UPDATE public.otc_orders
    SET 
        order_status = 'completed',
        payment_status = 'paid',
        receipt_number = v_receipt_number,
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN v_prescription_id;
END;
$$;

-- 3. Grants
REVOKE EXECUTE ON FUNCTION public.complete_otc_order(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_otc_order(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_otc_order(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_otc_order(UUID, UUID) TO service_role;
