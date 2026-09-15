-- ====================================================================
-- PropertyLedge Financial System Migration (2 Dedicated Financial Tables)
-- ====================================================================

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_categories_type_name UNIQUE (transaction_type, name),
    CONSTRAINT uq_categories_id_type UNIQUE (id, transaction_type)
);

-- 2. Seed default categories
INSERT INTO public.categories (transaction_type, name, description)
VALUES
    -- Income Categories
    ('income', 'Rent', 'Rental payments received from tenants'),
    ('income', 'Other Income', 'Sundry and miscellaneous property revenue'),
    ('income', 'Security Deposit', 'Security bonds and deposits held'),
    ('income', 'Owner Contribution', 'Owner equity injections and funds'),
    -- Expense Categories
    ('expense', 'Maintenance', 'Routine and preventative maintenance'),
    ('expense', 'Repairs', 'Emergency and reactive property repairs'),
    ('expense', 'Utilities', 'Water, power, gas, council and utility charges'),
    ('expense', 'Insurance', 'Landlord, building and public liability insurance'),
    ('expense', 'Property Tax', 'Council rates, land tax and statutory levies'),
    ('expense', 'Management Fee', 'Agency and property management commissions'),
    ('expense', 'Other Expense', 'General and administrative operating expenses')
ON CONFLICT (transaction_type, name) DO UPDATE 
SET description = EXCLUDED.description, is_active = true, updated_at = now();

-- 3. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12,4) NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    transaction_category_id UUID NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT,
    description TEXT,
    reference TEXT,
    vendor_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed', 'refunded')),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_transactions_category_type FOREIGN KEY (transaction_category_id, transaction_type) 
        REFERENCES public.categories(id, transaction_type) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date 
    ON public.transactions (workspace_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_property_date 
    ON public.transactions (property_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category 
    ON public.transactions (transaction_category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_type_status 
    ON public.transactions (transaction_type, status);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant 
    ON public.transactions (tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_lease 
    ON public.transactions (lease_id) WHERE lease_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_invoice 
    ON public.transactions (invoice_id) WHERE invoice_id IS NOT NULL;

-- 5. Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 6. Categories RLS Policies
DROP POLICY IF EXISTS "Authenticated users can read categories" ON public.categories;
CREATE POLICY "Authenticated users can read categories"
    ON public.categories
    FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
    ON public.categories
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- 7. Transactions RLS Policies
DROP POLICY IF EXISTS "Users can read transactions for authorized properties" ON public.transactions;
CREATE POLICY "Users can read transactions for authorized properties"
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (
        (public.can_access_workspace(workspace_id) AND public.can_access_property(property_id))
        OR (tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.user_id = auth.uid()))
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "Users can insert transactions for authorized properties" ON public.transactions;
CREATE POLICY "Users can insert transactions for authorized properties"
    ON public.transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.can_access_workspace(workspace_id) AND 
        public.can_write_property(property_id, 'financial.manage')
    );

DROP POLICY IF EXISTS "Users can update transactions for authorized properties" ON public.transactions;
CREATE POLICY "Users can update transactions for authorized properties"
    ON public.transactions
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

DROP POLICY IF EXISTS "Users can delete transactions for authorized properties" ON public.transactions;
CREATE POLICY "Users can delete transactions for authorized properties"
    ON public.transactions
    FOR DELETE
    TO authenticated
    USING (
        public.can_access_workspace(workspace_id) AND 
        public.can_write_property(property_id, 'financial.manage')
    );

-- 8. Grants
GRANT SELECT ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;
GRANT ALL ON TABLE public.transactions TO service_role;
