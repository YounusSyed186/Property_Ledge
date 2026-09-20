-- ====================================================================
-- PropertyLedge Expense & Transaction Mapping Migration
-- 3-Tier Architecture: expenses -> expense_transactions -> transactions
-- ====================================================================

-- 1. Create expenses table (Business Record)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    transaction_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount NUMERIC(12,4) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_name TEXT,
    description TEXT,
    reference TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'cancelled')),
    receipt_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create expense_transactions mapping table (Allocation Record)
CREATE TABLE IF NOT EXISTS public.expense_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(12,4) NOT NULL CHECK (allocated_amount > 0),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_expense_transactions UNIQUE (expense_id, transaction_id)
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_date 
    ON public.expenses (workspace_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_property_date 
    ON public.expenses (property_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_lease 
    ON public.expenses (lease_id) WHERE lease_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_category 
    ON public.expenses (transaction_category_id);

CREATE INDEX IF NOT EXISTS idx_expenses_status 
    ON public.expenses (status);

CREATE INDEX IF NOT EXISTS idx_expense_transactions_expense 
    ON public.expense_transactions (expense_id);

CREATE INDEX IF NOT EXISTS idx_expense_transactions_transaction 
    ON public.expense_transactions (transaction_id);

-- 4. Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;

-- 5. expenses RLS Policies
DROP POLICY IF EXISTS "Users can read expenses for authorized workspaces/properties" ON public.expenses;
CREATE POLICY "Users can read expenses for authorized workspaces/properties"
    ON public.expenses
    FOR SELECT
    TO authenticated
    USING (
        (public.can_access_workspace(workspace_id) AND public.can_access_property(property_id))
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "Users can insert expenses for authorized workspaces/properties" ON public.expenses;
CREATE POLICY "Users can insert expenses for authorized workspaces/properties"
    ON public.expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.can_access_workspace(workspace_id) AND 
        public.can_write_property(property_id, 'financial.manage')
    );

DROP POLICY IF EXISTS "Users can update expenses for authorized workspaces/properties" ON public.expenses;
CREATE POLICY "Users can update expenses for authorized workspaces/properties"
    ON public.expenses
    FOR UPDATE
    TO authenticated
    USING (
        public.can_access_workspace(workspace_id) AND 
        public.can_write_property(property_id, 'financial.manage')
    )
    WITH CHECK (
        public.can_access_workspace(workspace_id) AND 
        public.can_write_property(property_id, 'financial.manage')
    );

DROP POLICY IF EXISTS "Users can delete expenses for authorized workspaces/properties" ON public.expenses;
CREATE POLICY "Users can delete expenses for authorized workspaces/properties"
    ON public.expenses
    FOR DELETE
    TO authenticated
    USING (
        public.can_access_workspace(workspace_id) AND 
        public.can_write_property(property_id, 'financial.manage')
    );

-- 6. expense_transactions RLS Policies
DROP POLICY IF EXISTS "Users can read expense transactions" ON public.expense_transactions;
CREATE POLICY "Users can read expense transactions"
    ON public.expense_transactions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
            AND public.can_access_workspace(e.workspace_id)
            AND public.can_access_property(e.property_id)
        )
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "Users can insert expense transactions" ON public.expense_transactions;
CREATE POLICY "Users can insert expense transactions"
    ON public.expense_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
            AND public.can_access_workspace(e.workspace_id)
            AND public.can_write_property(e.property_id, 'financial.manage')
        )
        AND EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND public.can_access_workspace(t.workspace_id)
            AND public.can_write_property(t.property_id, 'financial.manage')
        )
    );

DROP POLICY IF EXISTS "Users can update expense transactions" ON public.expense_transactions;
CREATE POLICY "Users can update expense transactions"
    ON public.expense_transactions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
            AND public.can_access_workspace(e.workspace_id)
            AND public.can_write_property(e.property_id, 'financial.manage')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
            AND public.can_access_workspace(e.workspace_id)
            AND public.can_write_property(e.property_id, 'financial.manage')
        )
    );

DROP POLICY IF EXISTS "Users can delete expense transactions" ON public.expense_transactions;
CREATE POLICY "Users can delete expense transactions"
    ON public.expense_transactions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
            AND public.can_access_workspace(e.workspace_id)
            AND public.can_write_property(e.property_id, 'financial.manage')
        )
    );

-- 7. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.expenses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expense_transactions TO authenticated;
GRANT ALL ON TABLE public.expense_transactions TO service_role;
