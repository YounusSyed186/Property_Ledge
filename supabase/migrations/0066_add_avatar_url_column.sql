-- Migration 0066: Add avatar_url column to profiles table for user identity & default avatar support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.avatar_url IS 'URL or seed reference for user avatar image. Defaults to deterministic DiceBear avatar if NULL.';
