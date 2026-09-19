-- Stage 3: Batches & Stock Adjustments
CREATE TYPE adjustment_type AS ENUM ('increase', 'decrease');

CREATE TABLE public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drug_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE RESTRICT,
    batch_number TEXT,
    quantity_received INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    cost_price_per_unit DECIMAL(10,2) NOT NULL,
    selling_price_per_unit DECIMAL(10,2) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    date_received TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    received_by UUID NOT NULL REFERENCES public.app_users(id),
    
    CONSTRAINT quantity_check CHECK (quantity_remaining >= 0),
    CONSTRAINT reserved_check CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity_remaining)
);

CREATE INDEX idx_batches_drug_id ON public.batches(drug_id);
CREATE INDEX idx_batches_expiry ON public.batches(expiry_date);

CREATE TABLE public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    drug_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE RESTRICT,
    adjustment_type adjustment_type NOT NULL,
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    resulting_quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    adjusted_by UUID NOT NULL REFERENCES public.app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stage 5 & 6: Point of Sale, Prescriptions & Refunds
CREATE TYPE prescription_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE refund_status AS ENUM ('none', 'partial', 'full');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer');

CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status prescription_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method payment_method,
    receipt_number TEXT UNIQUE,
    created_by UUID NOT NULL REFERENCES public.app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    refund_status refund_status NOT NULL DEFAULT 'none',
    refunded_amount DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_prescriptions_created_by ON public.prescriptions(created_by);
CREATE INDEX idx_prescriptions_created_at ON public.prescriptions(created_at);

CREATE TABLE public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    refunded_quantity INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT item_quantity_check CHECK (quantity > 0),
    CONSTRAINT item_refunded_check CHECK (refunded_quantity >= 0 AND refunded_quantity <= quantity)
);

CREATE TABLE public.refund_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE RESTRICT,
    processed_by UUID NOT NULL REFERENCES public.app_users(id),
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    restocked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stage 8 & 10: Alerts & Reconciliation
CREATE TYPE alert_type AS ENUM ('low_stock', 'expiry');
CREATE TYPE alert_status AS ENUM ('active', 'resolved');

CREATE TABLE public.alert_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type alert_type NOT NULL,
    drug_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    status alert_status NOT NULL DEFAULT 'active',
    notified_via_email BOOLEAN NOT NULL DEFAULT false,
    notified_via_sms BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_alert_logs_status ON public.alert_logs(status);
CREATE INDEX idx_alert_logs_drug ON public.alert_logs(drug_id);

CREATE TABLE public.reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_start TIMESTAMP WITH TIME ZONE NOT NULL,
    date_end TIMESTAMP WITH TIME ZONE NOT NULL,
    staff_id UUID REFERENCES public.app_users(id), -- null means all staff
    system_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
    actual_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
    system_pos DECIMAL(10,2) NOT NULL DEFAULT 0,
    actual_pos DECIMAL(10,2) NOT NULL DEFAULT 0,
    system_transfer DECIMAL(10,2) NOT NULL DEFAULT 0,
    actual_transfer DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table (Singleton)
CREATE TABLE public.system_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    
    -- Profile
    admin_name TEXT NOT NULL DEFAULT 'System Admin',
    admin_email TEXT NOT NULL DEFAULT 'admin@pharmly.com',
    admin_phone TEXT NOT NULL DEFAULT '+234 800 000 0000',
    
    -- Pharmacy Info
    pharmacy_name TEXT NOT NULL DEFAULT 'Pharmly',
    pharmacy_address TEXT NOT NULL DEFAULT '123 Health Ave, Medical District',
    pharmacy_phone TEXT NOT NULL DEFAULT '+234 123 456 7890',
    pharmacy_email TEXT NOT NULL DEFAULT 'hello@pharmly.com',
    pharmacy_logo_url TEXT NOT NULL DEFAULT '',
    receipt_message TEXT NOT NULL DEFAULT 'Thank you for your patronage!\nPlease keep this receipt for your records.',
    
    -- Inventory
    global_low_stock_threshold INTEGER NOT NULL DEFAULT 50,
    global_expiry_warning_days INTEGER NOT NULL DEFAULT 90,
    
    -- POS & Sales
    pending_prescription_timeout_mins INTEGER NOT NULL DEFAULT 30,
    default_payment_method TEXT NOT NULL DEFAULT 'cash',
    enable_receipt_printing BOOLEAN NOT NULL DEFAULT true,
    
    -- Refunds
    allow_return_to_stock BOOLEAN NOT NULL DEFAULT true,
    
    -- Notifications
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    sms_notifications BOOLEAN NOT NULL DEFAULT false,
    notification_email TEXT NOT NULL DEFAULT 'admin@pharmly.com',
    notification_phone TEXT NOT NULL DEFAULT '+234 800 000 0000',
    notify_low_stock BOOLEAN NOT NULL DEFAULT true,
    notify_expiry BOOLEAN NOT NULL DEFAULT true,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert singleton row
INSERT INTO public.system_settings (id) VALUES (1);

-- Note: RLS policies for these tables will be defined in a subsequent migration once auth is connected.
-- We keep it simple here to establish the schema.
