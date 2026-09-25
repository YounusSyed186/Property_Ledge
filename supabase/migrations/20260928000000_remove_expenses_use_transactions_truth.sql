-- ====================================================================
-- PropertyLedge Final Finance Architecture Migration
-- Migration: 20260928000000_remove_expenses_use_transactions_truth.sql
-- Description:
--   1. Audits and migrates any existing records from public.expenses
--      into public.transactions (where transaction_type = 'expense')
--      and their receipts into public.transaction_attachments.
--   2. Drops public.expense_transactions bridge table.
--   3. Drops public.expenses table.
--   4. Ensures public.transactions is the single source of truth for all actual financial activity.
--   5. Retains public.expected_payment_schedule and public.transaction_schedule_allocations for expected income.
-- ====================================================================

DO $$
DECLARE
    rec RECORD;
    v_tx_id UUID;
    v_default_cat_id UUID;
BEGIN
    -- 1. Check if public.expenses table exists before attempting migration
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'expenses'
    ) THEN
        -- Find or create a default expense category fallback
        SELECT id INTO v_default_cat_id 
        FROM public.categories 
        WHERE transaction_type = 'expense' 
        LIMIT 1;

        -- Migrate unlinked or existing expenses into transactions
        FOR rec IN 
            SELECT e.*, et.transaction_id AS linked_tx_id
            FROM public.expenses e
            LEFT JOIN public.expense_transactions et ON et.expense_id = e.id
        LOOP
            IF rec.linked_tx_id IS NOT NULL THEN
                -- Expense is already linked to a transaction: backfill any missing fields onto that transaction
                UPDATE public.transactions
                SET
                    vendor_name = COALESCE(transactions.vendor_name, rec.vendor_name),
                    reference = COALESCE(transactions.reference, rec.reference),
                    notes = COALESCE(transactions.notes, rec.notes),
                    gst_inclusive = COALESCE(transactions.gst_inclusive, rec.gst_inclusive, false),
                    gst_amount = CASE 
                        WHEN transactions.gst_amount IS NULL OR transactions.gst_amount = 0 
                        THEN COALESCE(rec.gst_amount, 0)
                        ELSE transactions.gst_amount 
                    END,
                    tax_classification_id = COALESCE(transactions.tax_classification_id, rec.tax_classification_id),
                    receipt_url = COALESCE(transactions.receipt_url, rec.receipt_url),
                    updated_at = now()
                WHERE id = rec.linked_tx_id;

                v_tx_id := rec.linked_tx_id;
            ELSE
                -- Expense is NOT linked to an existing transaction: create an actual expense transaction
                INSERT INTO public.transactions (
                    id,
                    amount,
                    transaction_type,
                    transaction_category_id,
                    transaction_date,
                    property_id,
                    workspace_id,
                    lease_id,
                    vendor_name,
                    description,
                    reference,
                    notes,
                    status,
                    created_by,
                    created_at,
                    updated_at,
                    gst_inclusive,
                    gst_amount,
                    tax_classification_id,
                    receipt_url
                ) VALUES (
                    COALESCE(rec.id, gen_random_uuid()),
                    rec.amount,
                    'expense',
                    COALESCE(rec.transaction_category_id, v_default_cat_id),
                    COALESCE(rec.expense_date, CURRENT_DATE),
                    rec.property_id,
                    rec.workspace_id,
                    rec.lease_id,
                    rec.vendor_name,
                    rec.description,
                    rec.reference,
                    rec.notes,
                    'completed',
                    rec.created_by,
                    COALESCE(rec.created_at, now()),
                    COALESCE(rec.updated_at, now()),
                    COALESCE(rec.gst_inclusive, false),
                    COALESCE(rec.gst_amount, 0),
                    rec.tax_classification_id,
                    rec.receipt_url
                )
                ON CONFLICT (id) DO UPDATE SET
                    transaction_type = 'expense',
                    vendor_name = EXCLUDED.vendor_name,
                    gst_inclusive = EXCLUDED.gst_inclusive,
                    gst_amount = EXCLUDED.gst_amount,
                    tax_classification_id = EXCLUDED.tax_classification_id,
                    receipt_url = EXCLUDED.receipt_url
                RETURNING id INTO v_tx_id;
            END IF;

            -- If receipt_url exists and transaction_attachments table exists, ensure attachment record
            IF rec.receipt_url IS NOT NULL AND v_tx_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'transaction_attachments'
            ) THEN
                INSERT INTO public.transaction_attachments (
                    workspace_id,
                    transaction_id,
                    blob_url,
                    blob_path,
                    file_name,
                    mime_type,
                    file_size,
                    source_path,
                    uploaded_by,
                    created_at
                )
                SELECT
                    rec.workspace_id,
                    v_tx_id,
                    rec.receipt_url,
                    rec.receipt_url,
                    'Receipt',
                    'application/pdf',
                    0,
                    'migrated_expense_receipt',
                    rec.created_by,
                    COALESCE(rec.created_at, now())
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.transaction_attachments
                    WHERE transaction_id = v_tx_id AND blob_url = rec.receipt_url
                );
            END IF;
        END LOOP;
    END IF;

    -- 2. Drop expense_transactions bridge table
    DROP TABLE IF EXISTS public.expense_transactions CASCADE;

    -- 3. Drop expenses table
    DROP TABLE IF EXISTS public.expenses CASCADE;

    -- 4. Seed 9 exact tax classifications if tax_classifications table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tax_classifications'
    ) THEN
        INSERT INTO public.tax_classifications (workspace_id, name, bas_code, description, applies_to, is_active)
        SELECT 
            w.id,
            tc.name,
            tc.bas_code,
            tc.description,
            tc.applies_to,
            true
        FROM public.workspaces w
        CROSS JOIN (
            VALUES 
                ('Repair & Maintenance', '1B', 'Repairs and recurring maintenance to existing assets', 'expense'),
                ('Initial Repair', 'G10', 'Repairs made immediately after acquisition (capital in nature)', 'expense'),
                ('Capital Works', 'G10', 'Structural additions, alterations, and improvements (Div 43)', 'expense'),
                ('Depreciating Asset', 'G10', 'Plant and equipment assets subject to decline in value (Div 40)', 'expense'),
                ('Borrowing Expense', NULL, 'Loan establishment, mortgage documentation, and borrowing fees', 'expense'),
                ('Other Deductible Expense', '1B', 'Rates, insurance, management fees, and general deductions', 'expense'),
                ('Non-Deductible Expense', NULL, 'Fines, penalties, and non-claimable expenditures', 'expense'),
                ('Private / Personal', NULL, 'Owner private proportion and non-business items', 'expense'),
                ('CGT / Capital Expense', 'G10', 'Cost base additions and non-depreciable capital items', 'expense'),
                ('Taxable Sales (10% GST)', 'G1', 'Standard commercial rent and taxable supplies', 'income'),
                ('GST-Free Rental Income', 'G1', 'Residential rent (input taxed / GST-free)', 'income')
        ) AS tc(name, bas_code, description, applies_to)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.tax_classifications existing
            WHERE existing.workspace_id = w.id AND existing.name = tc.name
        );
    END IF;

END $$;

-- 4. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
