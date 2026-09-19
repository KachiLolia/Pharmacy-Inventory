-- Migration: 03_auth_trigger
-- Purpose: Safely create a public.app_users record for new auth.users with the default 'staff' role

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Avoid creating duplicates if the user already exists in app_users
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = NEW.id) THEN
    INSERT INTO public.app_users (id, role, is_active)
    VALUES (NEW.id, 'staff', true);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after insert on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Note to the Administrator for promoting the FIRST admin account:
-- The trigger sets everyone to 'staff'. To create the first Admin, 
-- you must run this SQL query manually in the Supabase SQL Editor:
-- 
-- UPDATE public.app_users 
-- SET role = 'admin' 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your_admin_email@example.com' LIMIT 1);
--
-- This honors the `one_admin_only` unique index constraint on the role column.
