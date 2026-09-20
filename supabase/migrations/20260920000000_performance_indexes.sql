-- ====================================================================
-- Performance Index Optimization Migration
-- Migration: 20260920000000_performance_indexes.sql
-- Description: Adds essential B-tree indexes for foreign keys, workspace
--              isolation, property-level filtering, and RLS lookups.
--              Uses dynamic SQL (EXECUTE) with to_regclass checks so it runs
--              safely and idempotently on any database state without 42P01 errors.
-- ====================================================================

DO $$
BEGIN
  -- 1. Workspaces & Memberships
  IF to_regclass('public.workspaces') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces (owner_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workspaces_status ON public.workspaces (status)';
  END IF;

  IF to_regclass('public.workspace_members') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workspace_members_ws_user ON public.workspace_members (workspace_id, user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workspace_members_user_status ON public.workspace_members (user_id, status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workspace_members_role_id ON public.workspace_members (role_id)';
  END IF;

  IF to_regclass('public.property_members') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_property_members_prop_user ON public.property_members (property_id, user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_property_members_user_status ON public.property_members (user_id, status)';
  END IF;

  -- 2. Properties
  IF to_regclass('public.properties') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_properties_workspace_id ON public.properties (workspace_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties (owner_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties (status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties (created_at DESC)';
  END IF;

  -- 3. Tenants
  IF to_regclass('public.tenants') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON public.tenants (property_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants (user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants (status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tenants_last_name ON public.tenants (last_name ASC)';
  END IF;

  -- 4. Leases & Lease-Tenants
  IF to_regclass('public.leases') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_leases_property_id ON public.leases (property_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases (status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_leases_dates ON public.leases (start_date, end_date)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_leases_created_at ON public.leases (created_at DESC)';
  END IF;

  IF to_regclass('public.lease_tenants') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lease_tenants_lease_id ON public.lease_tenants (lease_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lease_tenants_tenant_id ON public.lease_tenants (tenant_id)';
  END IF;

  -- 5. Financials (Invoices, Transactions, Expenses)
  IF to_regclass('public.invoices') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON public.invoices (property_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices (tenant_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON public.invoices (status, due_date)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices (issue_date DESC)';
  END IF;

  IF to_regclass('public.transactions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_property_id ON public.transactions (property_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_workspace_id ON public.transactions (workspace_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON public.transactions (tenant_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON public.transactions (transaction_type, status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (transaction_date DESC)';
  END IF;

  IF to_regclass('public.expenses') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON public.expenses (property_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_workspace_id ON public.expenses (workspace_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_status_date ON public.expenses (status, expense_date DESC)';
  END IF;

  -- 6. Operations (Maintenance, Inspections, Documents, Tasks)
  IF to_regclass('public.maintenance_requests') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_maintenance_property_status ON public.maintenance_requests (property_id, status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_id ON public.maintenance_requests (tenant_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_maintenance_created_at ON public.maintenance_requests (created_at DESC)';
  END IF;

  IF to_regclass('public.inspections') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON public.inspections (property_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_inspections_scheduled_at ON public.inspections (scheduled_at DESC)';
  END IF;

  IF to_regclass('public.documents') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_property_id ON public.documents (property_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents (tenant_id)';
  END IF;

  IF to_regclass('public.tasks') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON public.tasks (property_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status)';
  END IF;

  -- 7. Audit & Account Context
  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_created ON public.activity_logs (workspace_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_logs_property_created ON public.activity_logs (property_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs (user_id)';
  END IF;

  IF to_regclass('public.account_context') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_account_context_user_id ON public.account_context (user_id)';
  END IF;

  IF to_regclass('public.platform_admins') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_platform_admins_user_status ON public.platform_admins (user_id, status)';
  END IF;
END $$;
