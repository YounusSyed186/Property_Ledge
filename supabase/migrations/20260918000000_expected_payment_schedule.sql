-- ====================================================================
-- PropertyLedge Rent & Payment Schedule System Migration
-- ====================================================================

-- 1. Create expected_payment_schedule table
CREATE TABLE IF NOT EXISTS public.expected_payment_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    transaction_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    schedule_name TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('lease', 'independent')),
    amount NUMERIC(12,4) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly', 'custom')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create transaction_schedule_allocations table
CREATE TABLE IF NOT EXISTS public.transaction_schedule_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    expected_payment_id UUID NOT NULL REFERENCES public.expected_payment_schedule(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(12,4) NOT NULL CHECK (allocated_amount > 0),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_transaction_schedule_allocations UNIQUE (transaction_id, expected_payment_id)
);

-- 3. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_expected_schedule_workspace_due 
    ON public.expected_payment_schedule (workspace_id, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_expected_schedule_property_due 
    ON public.expected_payment_schedule (property_id, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_expected_schedule_lease 
    ON public.expected_payment_schedule (lease_id) WHERE lease_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expected_schedule_status 
    ON public.expected_payment_schedule (status);

CREATE INDEX IF NOT EXISTS idx_allocations_transaction 
    ON public.transaction_schedule_allocations (transaction_id);

CREATE INDEX IF NOT EXISTS idx_allocations_expected_payment 
    ON public.transaction_schedule_allocations (expected_payment_id);

-- 4. Enable Row Level Security
ALTER TABLE public.expected_payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_schedule_allocations ENABLE ROW LEVEL SECURITY;

-- 5. expected_payment_schedule RLS Policies
DROP POLICY IF EXISTS "Users can read expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule;
CREATE POLICY "Users can read expected schedules for authorized workspaces/properties"
    ON public.expected_payment_schedule
    FOR SELECT
    TO authenticated
    USING (
        (public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_access_property(property_id)))
        OR (tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.user_id = auth.uid()))
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "Users can insert expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule;
CREATE POLICY "Users can insert expected schedules for authorized workspaces/properties"
    ON public.expected_payment_schedule
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.can_access_workspace(workspace_id) AND 
        (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage'))
    );

DROP POLICY IF EXISTS "Users can update expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule;
CREATE POLICY "Users can update expected schedules for authorized workspaces/properties"
    ON public.expected_payment_schedule
    FOR UPDATE
    TO authenticated
    USING (
        public.can_access_workspace(workspace_id) AND 
        (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage'))
    )
    WITH CHECK (
        public.can_access_workspace(workspace_id) AND 
        (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage'))
    );

DROP POLICY IF EXISTS "Users can delete expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule;
CREATE POLICY "Users can delete expected schedules for authorized workspaces/properties"
    ON public.expected_payment_schedule
    FOR DELETE
    TO authenticated
    USING (
        public.can_access_workspace(workspace_id) AND 
        (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage'))
    );

-- 6. transaction_schedule_allocations RLS Policies
DROP POLICY IF EXISTS "Users can read transaction allocations" ON public.transaction_schedule_allocations;
CREATE POLICY "Users can read transaction allocations"
    ON public.transaction_schedule_allocations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND public.can_access_workspace(t.workspace_id)
        )
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "Users can insert transaction allocations" ON public.transaction_schedule_allocations;
CREATE POLICY "Users can insert transaction allocations"
    ON public.transaction_schedule_allocations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND public.can_access_workspace(t.workspace_id)
            AND public.can_write_property(t.property_id, 'financial.manage')
        )
    );

DROP POLICY IF EXISTS "Users can update transaction allocations" ON public.transaction_schedule_allocations;
CREATE POLICY "Users can update transaction allocations"
    ON public.transaction_schedule_allocations
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND public.can_access_workspace(t.workspace_id)
            AND public.can_write_property(t.property_id, 'financial.manage')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND public.can_access_workspace(t.workspace_id)
            AND public.can_write_property(t.property_id, 'financial.manage')
        )
    );

DROP POLICY IF EXISTS "Users can delete transaction allocations" ON public.transaction_schedule_allocations;
CREATE POLICY "Users can delete transaction allocations"
    ON public.transaction_schedule_allocations
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND public.can_access_workspace(t.workspace_id)
            AND public.can_write_property(t.property_id, 'financial.manage')
        )
    );

-- 7. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expected_payment_schedule TO authenticated;
GRANT ALL ON TABLE public.expected_payment_schedule TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transaction_schedule_allocations TO authenticated;
GRANT ALL ON TABLE public.transaction_schedule_allocations TO service_role;
