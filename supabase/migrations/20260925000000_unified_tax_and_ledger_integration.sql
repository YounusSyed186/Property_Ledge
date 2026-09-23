-- ====================================================================
-- PropertyLedge Unified GST, Tax Classification & Ledger Integration Migration
-- Migration: 20260925000000_unified_tax_and_ledger_integration.sql
-- ====================================================================

DO $$
BEGIN
  -- 1. Add applies_to column to tax_classifications if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tax_classifications' AND column_name = 'applies_to'
  ) THEN
    ALTER TABLE public.tax_classifications ADD COLUMN applies_to TEXT NOT NULL DEFAULT 'both' 
      CHECK (applies_to IN ('income', 'expense', 'both'));
  END IF;

  -- 2. Add default_tax_classification_id to categories if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'default_tax_classification_id'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN default_tax_classification_id UUID REFERENCES public.tax_classifications(id) ON DELETE SET NULL;
  END IF;

  -- 3. Add GST & Tax Classification columns to expenses table if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'gst_inclusive'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'gst_amount'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN gst_amount NUMERIC(12,4) NOT NULL DEFAULT 0.0000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'tax_classification_id'
  ) THEN
    ALTER TABLE public.expenses ADD COLUMN tax_classification_id UUID REFERENCES public.tax_classifications(id) ON DELETE SET NULL;
  END IF;

  -- 4. Add GST & Tax Classification columns to expected_payment_schedule if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'expected_payment_schedule' AND column_name = 'gst_inclusive'
  ) THEN
    ALTER TABLE public.expected_payment_schedule ADD COLUMN gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'expected_payment_schedule' AND column_name = 'gst_amount'
  ) THEN
    ALTER TABLE public.expected_payment_schedule ADD COLUMN gst_amount NUMERIC(12,4) NOT NULL DEFAULT 0.0000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'expected_payment_schedule' AND column_name = 'tax_classification_id'
  ) THEN
    ALTER TABLE public.expected_payment_schedule ADD COLUMN tax_classification_id UUID REFERENCES public.tax_classifications(id) ON DELETE SET NULL;
  END IF;

  -- 5. Update applies_to for standard seeded tax classifications
  UPDATE public.tax_classifications
  SET applies_to = CASE
    WHEN name ILIKE '%sale%' OR name ILIKE '%income%' THEN 'income'
    WHEN name ILIKE '%expense%' OR name ILIKE '%acquisition%' OR name ILIKE '%capital%' THEN 'expense'
    ELSE 'both'
  END
  WHERE applies_to = 'both';

  -- 6. Backfill default_tax_classification_id on standard categories
  -- Link Income categories
  UPDATE public.categories c
  SET default_tax_classification_id = tc.id
  FROM public.tax_classifications tc
  WHERE c.default_tax_classification_id IS NULL
    AND c.transaction_type = 'income'
    AND tc.applies_to IN ('income', 'both')
    AND (
      (c.name ILIKE '%rent%' AND tc.name ILIKE '%GST-Free%')
      OR (c.name NOT ILIKE '%rent%' AND tc.name ILIKE '%Taxable Sales%')
    );

  -- Link Expense categories
  UPDATE public.categories c
  SET default_tax_classification_id = tc.id
  FROM public.tax_classifications tc
  WHERE c.default_tax_classification_id IS NULL
    AND c.transaction_type = 'expense'
    AND tc.applies_to IN ('expense', 'both')
    AND (
      (c.name ILIKE '%capital%' AND tc.name ILIKE '%Capital%')
      OR (c.name ILIKE '%improvement%' AND tc.name ILIKE '%Capital%')
      OR (c.name ILIKE '%rate%' AND tc.name ILIKE '%GST-Free%')
      OR (c.name ILIKE '%tax%' AND tc.name ILIKE '%GST-Free%')
      OR (c.name NOT ILIKE '%capital%' AND c.name NOT ILIKE '%improvement%' AND c.name NOT ILIKE '%rate%' AND c.name NOT ILIKE '%tax%' AND tc.name ILIKE '%Operating Expense%')
    );

END $$;

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_tax_classification 
  ON public.expenses(tax_classification_id) WHERE tax_classification_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_default_tax_class 
  ON public.categories(default_tax_classification_id) WHERE default_tax_classification_id IS NOT NULL;

-- 8. Reload schema cache
NOTIFY pgrst, 'reload schema';
