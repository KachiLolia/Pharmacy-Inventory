-- Initial Schema for Pharmacy POS System

-- Create an enum for roles to ensure data integrity
CREATE TYPE user_role AS ENUM ('admin', 'staff');

-- Create app_users table extending Supabase Auth
CREATE TABLE public.app_users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'staff',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enforce exactly one admin account
CREATE UNIQUE INDEX one_admin_only ON public.app_users (role) WHERE role = 'admin';

-- Enable Row Level Security
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Staff can view their own profile
CREATE POLICY "Users can view their own profile"
    ON public.app_users
    FOR SELECT
    USING (auth.uid() = id);

-- 2. Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON public.app_users
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
    ));

-- 3. Admin can insert new profiles (used for creating staff)
CREATE POLICY "Admins can insert profiles"
    ON public.app_users
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
    ));

-- 4. Admin can update profiles (e.g., deactivate staff)
CREATE POLICY "Admins can update profiles"
    ON public.app_users
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Note: Admin account should be seeded manually after creating the user in Auth
/*
INSERT INTO public.app_users (id, role, is_active)
VALUES ('<UUID_FROM_AUTH_USERS>', 'admin', true);
*/
