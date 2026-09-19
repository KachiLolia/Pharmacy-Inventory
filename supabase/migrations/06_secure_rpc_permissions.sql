-- Migration: 06_secure_rpc_permissions
-- Purpose: Resolve Supabase linter warnings regarding SECURITY DEFINER functions.
-- 1. Set explicit search_path to prevent search_path injection.
-- 2. Revoke default PUBLIC execute permissions to prevent anonymous access.

-- 1. Fix Mutable Search Path Warnings
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;

-- 2. Fix "Public Can Execute SECURITY DEFINER Function" (Revoke from PUBLIC & anon)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

REVOKE EXECUTE ON FUNCTION public.pos_create_prescription(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pos_create_prescription(jsonb) FROM anon;

REVOKE EXECUTE ON FUNCTION public.pos_confirm_payment(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pos_confirm_payment(uuid, text) FROM anon;

REVOKE EXECUTE ON FUNCTION public.pos_cancel_prescription(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pos_cancel_prescription(uuid) FROM anon;

-- 3. Explicitly Grant to Authenticated / Service Role
-- handle_new_user is a trigger function, it doesn't need EXECUTE granted to authenticated users.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- is_admin is used in RLS policies, so authenticated users MUST be able to execute it.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- The POS functions MUST be executable by Staff/Admin (authenticated users).
GRANT EXECUTE ON FUNCTION public.pos_create_prescription(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pos_confirm_payment(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pos_cancel_prescription(uuid) TO authenticated, service_role;
