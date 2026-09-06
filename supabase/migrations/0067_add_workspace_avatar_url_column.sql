-- Migration 0067: Add avatar_url column to workspaces table for custom organization branding
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.workspaces.avatar_url IS 'Custom avatar or logo URL for organization/workspace branding. Defaults to deterministic DiceBear avatar if NULL.';
