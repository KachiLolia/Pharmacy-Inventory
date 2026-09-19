-- Migration: 08_fix_app_users_recursion
-- Purpose: Fix infinite recursion in app_users RLS policies

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.app_users;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.app_users;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.app_users;

-- Recreate them using the SECURITY DEFINER function `is_admin()` which bypasses RLS
CREATE POLICY "Admins can view all profiles"
    ON public.app_users
    FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
    ON public.app_users
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update profiles"
    ON public.app_users
    FOR UPDATE
    USING (public.is_admin());
