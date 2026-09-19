-- Migration: 04_rls_policies
-- Purpose: Enforce Role-Based Access Control (RBAC) at the database level

-- 1. Enable RLS on all POS/Inventory tables
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Batches
-- Anyone can view batches
CREATE POLICY "Anyone can view batches" ON public.batches FOR SELECT USING (auth.role() = 'authenticated');
-- Both staff (making sales) and admin (restocking) need to update batches (deduct quantities)
CREATE POLICY "Anyone can update batches" ON public.batches FOR UPDATE USING (auth.role() = 'authenticated');
-- Only admin can insert new batches (restocking)
CREATE POLICY "Only admin can insert batches" ON public.batches FOR INSERT WITH CHECK (public.is_admin());

-- 3. Stock Adjustments (Admin Only)
CREATE POLICY "Only admin can view stock adjustments" ON public.stock_adjustments FOR SELECT USING (public.is_admin());
CREATE POLICY "Only admin can insert stock adjustments" ON public.stock_adjustments FOR INSERT WITH CHECK (public.is_admin());
-- No updates allowed on stock adjustments (audit log)

-- 4. Prescriptions (Sales)
-- Anyone can view sales
CREATE POLICY "Anyone can view prescriptions" ON public.prescriptions FOR SELECT USING (auth.role() = 'authenticated');
-- Anyone can insert sales
CREATE POLICY "Anyone can insert prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Both admin and staff might need to update a pending prescription to completed
CREATE POLICY "Anyone can update prescriptions" ON public.prescriptions FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. Prescription Items
CREATE POLICY "Anyone can view prescription items" ON public.prescription_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can insert prescription items" ON public.prescription_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only admin can update prescription items (refunds)" ON public.prescription_items FOR UPDATE USING (public.is_admin());

-- 6. Refund Logs (Admin Only)
CREATE POLICY "Only admin can view refund logs" ON public.refund_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Only admin can insert refund logs" ON public.refund_logs FOR INSERT WITH CHECK (public.is_admin());

-- 7. Alert Logs
-- Anyone can view alerts
CREATE POLICY "Anyone can view alert logs" ON public.alert_logs FOR SELECT USING (auth.role() = 'authenticated');
-- Alerts are evaluated and inserted by server actions, which might be triggered by anyone
CREATE POLICY "Anyone can insert alert logs" ON public.alert_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Anyone can update alert logs" ON public.alert_logs FOR UPDATE USING (auth.role() = 'authenticated');

-- 8. Reconciliations (Admin Only)
CREATE POLICY "Only admin can view reconciliations" ON public.reconciliations FOR SELECT USING (public.is_admin());
CREATE POLICY "Only admin can insert reconciliations" ON public.reconciliations FOR INSERT WITH CHECK (public.is_admin());

-- 9. System Settings
-- Anyone can view settings
CREATE POLICY "Anyone can view settings" ON public.system_settings FOR SELECT USING (auth.role() = 'authenticated');
-- Only admin can update settings
CREATE POLICY "Only admin can update settings" ON public.system_settings FOR UPDATE USING (public.is_admin());
-- No one should insert/delete settings (singleton)
