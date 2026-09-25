-- ====================================================================
-- PropertyLedge Multi-File Transaction Attachments Migration
-- Migration: 20260927000000_bulk_expense_upload.sql
-- Description: Creates permanent public.transaction_attachments table.
--              Drops any temporary/staging tables.
-- ====================================================================

-- 1. Drop temporary staging tables if previously created
DROP TABLE IF EXISTS public.expense_import_items CASCADE;
DROP TABLE IF EXISTS public.expense_import_batches CASCADE;

-- 2. Create permanent transaction_attachments table for multi-file attachments
CREATE TABLE IF NOT EXISTS public.transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    blob_url TEXT NOT NULL,
    blob_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    source_path TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Indexes on transaction_attachments
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_tx 
    ON public.transaction_attachments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_attachments_workspace 
    ON public.transaction_attachments(workspace_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can view attachments in their workspace" ON public.transaction_attachments;
CREATE POLICY "Users can view attachments in their workspace"
    ON public.transaction_attachments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = transaction_attachments.workspace_id
              AND wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage attachments in their workspace" ON public.transaction_attachments;
CREATE POLICY "Users can manage attachments in their workspace"
    ON public.transaction_attachments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = transaction_attachments.workspace_id
              AND wm.user_id = auth.uid()
        )
    );

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
