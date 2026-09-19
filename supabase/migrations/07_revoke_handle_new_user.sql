-- Migration: 07_revoke_handle_new_user
-- Purpose: Revoke EXECUTE from authenticated users for the auth trigger to satisfy the linter.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
