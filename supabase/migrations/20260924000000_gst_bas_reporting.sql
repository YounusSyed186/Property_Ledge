-- ====================================================================
-- PropertyLedge Australian GST & BAS Reporting Migration
-- Migration: 20260924000000_gst_bas_reporting.sql
-- ====================================================================

DO $$
BEGIN
  -- 1. Add gst_enabled to properties table if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'gst_enabled'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN gst_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- 2. Create category_groups table
  CREATE TABLE IF NOT EXISTS public.category_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_category_groups_workspace_name UNIQUE (workspace_id, name)
  );

  -- 3. Create tax_classifications table
  CREATE TABLE IF NOT EXISTS public.tax_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bas_code TEXT, -- e.g. 'G1', '1A', '1B', 'G10'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tax_classifications_workspace_name UNIQUE (workspace_id, name)
  );

  -- 4. Add category_group_id to categories table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'category_group_id'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN category_group_id UUID REFERENCES public.category_groups(id) ON DELETE SET NULL;
  END IF;

  -- 5. Add GST and Tax Classification columns to transactions table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'gst_inclusive'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'gst_amount'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN gst_amount NUMERIC(12,4) NOT NULL DEFAULT 0.0000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'tax_classification_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN tax_classification_id UUID REFERENCES public.tax_classifications(id) ON DELETE SET NULL;
  END IF;

  -- 6. Indexes for fast aggregation
  CREATE INDEX IF NOT EXISTS idx_transactions_tax_classification 
    ON public.transactions(tax_classification_id) WHERE tax_classification_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_transactions_ws_tax_date 
    ON public.transactions(workspace_id, tax_classification_id, transaction_date DESC);

  CREATE INDEX IF NOT EXISTS idx_transactions_prop_gst 
    ON public.transactions(property_id, gst_inclusive, gst_amount);

  CREATE INDEX IF NOT EXISTS idx_category_groups_ws 
    ON public.category_groups(workspace_id);

  CREATE INDEX IF NOT EXISTS idx_tax_classifications_ws 
    ON public.tax_classifications(workspace_id);

  -- 7. Enable RLS
  ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.tax_classifications ENABLE ROW LEVEL SECURITY;

  -- 8. Category Groups RLS Policies
  DROP POLICY IF EXISTS "Users can read category groups in authorized workspaces" ON public.category_groups;
  CREATE POLICY "Users can read category groups in authorized workspaces"
    ON public.category_groups
    FOR SELECT
    TO authenticated
    USING (
      (EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = category_groups.workspace_id
          AND wm.user_id = auth.uid()
      ))
      OR public.is_platform_admin()
    );

  DROP POLICY IF EXISTS "Users can manage category groups in authorized workspaces" ON public.category_groups;
  CREATE POLICY "Users can manage category groups in authorized workspaces"
    ON public.category_groups
    FOR ALL
    TO authenticated
    USING (
      (EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = category_groups.workspace_id
          AND wm.user_id = auth.uid()
      ))
      OR public.is_platform_admin()
    )
    WITH CHECK (
      (EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = category_groups.workspace_id
          AND wm.user_id = auth.uid()
      ))
      OR public.is_platform_admin()
    );

  -- 9. Tax Classifications RLS Policies
  DROP POLICY IF EXISTS "Users can read tax classifications in authorized workspaces" ON public.tax_classifications;
  CREATE POLICY "Users can read tax classifications in authorized workspaces"
    ON public.tax_classifications
    FOR SELECT
    TO authenticated
    USING (
      (EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = tax_classifications.workspace_id
          AND wm.user_id = auth.uid()
      ))
      OR public.is_platform_admin()
    );

  DROP POLICY IF EXISTS "Users can manage tax classifications in authorized workspaces" ON public.tax_classifications;
  CREATE POLICY "Users can manage tax classifications in authorized workspaces"
    ON public.tax_classifications
    FOR ALL
    TO authenticated
    USING (
      (EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = tax_classifications.workspace_id
          AND wm.user_id = auth.uid()
      ))
      OR public.is_platform_admin()
    )
    WITH CHECK (
      (EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = tax_classifications.workspace_id
          AND wm.user_id = auth.uid()
      ))
      OR public.is_platform_admin()
    );

  -- 10. Seed default Category Groups and Tax Classifications for all existing workspaces
  INSERT INTO public.category_groups (workspace_id, name, description)
  SELECT 
    w.id,
    g.name,
    g.description
  FROM public.workspaces w
  CROSS JOIN (
    VALUES
      ('Rental Income', 'Gross residential and commercial rental revenue'),
      ('Other Revenue', 'Sundry and miscellaneous property income'),
      ('Operating Expenses', 'Allowable property operating expenses'),
      ('Repairs & Maintenance', 'Repairs, servicing and emergency maintenance'),
      ('Capital Works & Acquisitions', 'Capital improvements and depreciable assets (G10)'),
      ('Statutory Levies & Rates', 'Council rates, water rates, and land tax')
  ) AS g(name, description)
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- 11. Seed default Tax Classifications for all existing workspaces
  INSERT INTO public.tax_classifications (workspace_id, name, bas_code, description, is_active)
  SELECT 
    w.id,
    t.name,
    t.bas_code,
    t.description,
    true
  FROM public.workspaces w
  CROSS JOIN (
    VALUES
      ('Taxable Sales (10% GST)', 'G1', 'Standard commercial rent and taxable supplies'),
      ('GST-Free Rental Income', 'G1', 'Residential rent (input taxed / GST-free)'),
      ('Operating Expense (Taxable)', '1B', 'Maintenance, utilities, and management fees with GST'),
      ('Capital Acquisition (G10)', 'G10', 'Major property capital assets & structural improvements'),
      ('GST-Free / Non-Taxable Expense', NULL, 'Council rates, water access charges, and interest')
  ) AS t(name, bas_code, description)
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- 12. Link existing categories to standard category groups where applicable
  UPDATE public.categories c
  SET category_group_id = cg.id
  FROM public.category_groups cg
  WHERE c.category_group_id IS NULL
    AND (
      (c.name ILIKE '%rent%' AND cg.name = 'Rental Income')
      OR (c.name ILIKE '%maintenance%' AND cg.name = 'Repairs & Maintenance')
      OR (c.name ILIKE '%repair%' AND cg.name = 'Repairs & Maintenance')
      OR (c.name ILIKE '%capital%' AND cg.name = 'Capital Works & Acquisitions')
      OR (c.name ILIKE '%improvement%' AND cg.name = 'Capital Works & Acquisitions')
      OR (c.name ILIKE '%rate%' AND cg.name = 'Statutory Levies & Rates')
      OR (c.name ILIKE '%tax%' AND cg.name = 'Statutory Levies & Rates')
      OR (c.transaction_type = 'expense' AND cg.name = 'Operating Expenses')
      OR (c.transaction_type = 'income' AND cg.name = 'Rental Income')
    );

END $$;

-- 13. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.category_groups TO authenticated;
GRANT ALL ON TABLE public.category_groups TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tax_classifications TO authenticated;
GRANT ALL ON TABLE public.tax_classifications TO service_role;

-- 14. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

