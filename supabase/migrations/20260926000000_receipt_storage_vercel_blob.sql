-- ====================================================================
-- PropertyLedge Vercel Blob Receipt Storage Migration
-- Migration: 20260926000000_receipt_storage_vercel_blob.sql
-- ====================================================================

DO $$
BEGIN
  -- 1. Add receipt storage columns to transactions table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN receipt_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'receipt_blob_path'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN receipt_blob_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'receipt_file_name'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN receipt_file_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'receipt_file_size'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN receipt_file_size BIGINT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'receipt_mime_type'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN receipt_mime_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'receipt_uploaded_at'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN receipt_uploaded_at TIMESTAMPTZ;
  END IF;

  -- 2. Add receipt storage columns to expenses table (if present for legacy compatibility)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'expenses'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'receipt_blob_path'
    ) THEN
      ALTER TABLE public.expenses ADD COLUMN receipt_blob_path TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'receipt_file_name'
    ) THEN
      ALTER TABLE public.expenses ADD COLUMN receipt_file_name TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'receipt_file_size'
    ) THEN
      ALTER TABLE public.expenses ADD COLUMN receipt_file_size BIGINT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'receipt_mime_type'
    ) THEN
      ALTER TABLE public.expenses ADD COLUMN receipt_mime_type TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'receipt_uploaded_at'
    ) THEN
      ALTER TABLE public.expenses ADD COLUMN receipt_uploaded_at TIMESTAMPTZ;
    END IF;
  END IF;

END $$;

-- 3. Partial index for transactions with receipts for fast lookups
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_blob 
  ON public.transactions(receipt_blob_path) WHERE receipt_blob_path IS NOT NULL;

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
