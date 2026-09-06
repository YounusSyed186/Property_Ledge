-- =============================================================================
-- PropertyLedge V3.1 — production schema (security & data-integrity hardening)
-- Includes RBAC foundation (permissions, platform roles, team roles, invitations)
-- and admin configuration RPCs (migrations 0054–0059).
-- Apply against a fresh Supabase Postgres instance (auth + storage present).
-- DOES NOT seed auth.users or development passwords.
--
-- CURRENT SUBSCRIPTION STATUSES (partial unique on account_id):
--   pending_payment, under_review, trialing, active, past_due, paused
-- These occupy the live billing slot (entitled or in-flight checkout).
-- draft / canceled / expired may coexist as history.
-- Checkout MUST update the existing current row (typically Free/active),
-- not insert a second current subscription.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.account_context (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  onboarding_status TEXT NOT NULL DEFAULT 'completed' CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed')),
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  provider_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  value_type TEXT NOT NULL CHECK (value_type IN ('boolean', 'number', 'string')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  entitlement_id UUID NOT NULL REFERENCES public.entitlements(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_plan_entitlement UNIQUE (plan_id, entitlement_id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.account_context(user_id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'draft', 'pending_payment', 'under_review', 'trialing', 'active',
    'past_due', 'paused', 'canceled', 'expired'
  )),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  provider TEXT DEFAULT 'stripe',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_subscriptions_id_account UNIQUE (id, account_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.account_context(user_id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('received', 'processed', 'failed')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.account_context(user_id) ON DELETE CASCADE,
  reference TEXT UNIQUE NOT NULL,
  expected_amount NUMERIC(10, 2) NOT NULL,
  submitted_amount NUMERIC(10, 2),
  currency TEXT NOT NULL DEFAULT 'AUD',
  payment_date DATE,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'verified', 'rejected')),
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_sub_payments_subscription FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_payments_sub_account FOREIGN KEY (subscription_id, account_id) REFERENCES public.subscriptions(id, account_id)
);

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.subscription_payments(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_preview_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'manager', 'agent', 'staff', 'viewer')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workspace_members_ws_user UNIQUE (workspace_id, user_id)
);

-- -----------------------------------------------------------------------------
-- RBAC: permissions, platform roles, team roles, invitations
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('PLATFORM', 'TEAM')),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.platform_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.team_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_team_role_scope CHECK (
    (is_system_role = true AND workspace_id IS NULL) OR
    (is_system_role = false AND workspace_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.team_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.team_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role_id UUID NOT NULL REFERENCES public.team_roles(id) ON DELETE RESTRICT,
  token_hash TEXT,
  invite_type TEXT NOT NULL CHECK (invite_type IN ('LINK', 'DIRECT_PROFILE', 'EMAIL')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.team_roles(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  property_type TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'maintenance')),
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Australia',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  image_url TEXT,
  bedrooms INTEGER CHECK (bedrooms >= 0),
  bathrooms DECIMAL(3, 1) CHECK (bathrooms >= 0),
  parking_spaces INTEGER CHECK (parking_spaces >= 0),
  square_feet DECIMAL(10, 2) CHECK (square_feet >= 0),
  purchase_price NUMERIC(12, 2) CHECK (purchase_price >= 0),
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_properties_id_workspace UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.property_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'manager', 'agent', 'staff', 'viewer')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_property_members_prop_user UNIQUE (property_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_number TEXT NOT NULL,
  unit_type TEXT,
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance', 'reserved')),
  bedrooms INTEGER CHECK (bedrooms >= 0),
  bathrooms DECIMAL(3, 1) CHECK (bathrooms >= 0),
  square_feet DECIMAL(10, 2) CHECK (square_feet >= 0),
  rent_amount NUMERIC(10, 2) CHECK (rent_amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_units_prop_unit_number UNIQUE (property_id, unit_number),
  CONSTRAINT uq_units_id_property UNIQUE (id, property_id)
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived', 'prospect')),
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenants_id_property UNIQUE (id, property_id)
);

CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'expired', 'terminated', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE,
  rent_amount NUMERIC(10, 2) NOT NULL CHECK (rent_amount >= 0),
  security_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  payment_due_day INTEGER NOT NULL DEFAULT 1 CHECK (payment_due_day BETWEEN 1 AND 31),
  rent_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (rent_frequency IN ('weekly', 'fortnightly', 'monthly', 'yearly')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_lease_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT uq_leases_id_property UNIQUE (id, property_id),
  CONSTRAINT fk_leases_unit_prop FOREIGN KEY (unit_id, property_id) REFERENCES public.units(id, property_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.lease_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'co-tenant', 'guarantor')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lease_id, tenant_id),
  CONSTRAINT fk_lease_tenants_lease_prop FOREIGN KEY (lease_id, property_id) REFERENCES public.leases(id, property_id) ON DELETE CASCADE,
  CONSTRAINT fk_lease_tenants_tenant_prop FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void', 'cancelled')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_invoice_dates CHECK (due_date >= issue_date),
  CONSTRAINT chk_invoice_total CHECK (total_amount = subtotal + tax_amount),
  CONSTRAINT chk_invoice_balance CHECK (balance_due <= total_amount),
  CONSTRAINT uq_invoices_id_property UNIQUE (id, property_id),
  CONSTRAINT fk_invoices_lease_prop FOREIGN KEY (lease_id, property_id) REFERENCES public.leases(id, property_id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_tenant_prop FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_unit_prop FOREIGN KEY (unit_id, property_id) REFERENCES public.units(id, property_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_invoice_item_amount CHECK (amount = round(quantity * unit_price, 2))
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'direct_debit', 'card', 'cash', 'cheque', 'other')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed', 'refunded')),
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_payments_lease_prop FOREIGN KEY (lease_id, property_id) REFERENCES public.leases(id, property_id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_tenant_prop FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_invoice_prop FOREIGN KEY (invoice_id, property_id) REFERENCES public.invoices(id, property_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  category_id UUID,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'scheduled', 'completed', 'cancelled')),
  category TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_maintenance_unit_prop FOREIGN KEY (unit_id, property_id) REFERENCES public.units(id, property_id) ON DELETE SET NULL,
  CONSTRAINT fk_maintenance_tenant_prop FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  inspector_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  inspection_type TEXT NOT NULL DEFAULT 'routine' CHECK (inspection_type IN ('move_in', 'routine', 'move_out', 'damage', 'final')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_inspections_unit_prop FOREIGN KEY (unit_id, property_id) REFERENCES public.units(id, property_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'needs_attention')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'lease_agreement', 'inspection_report', 'insurance', 'council_notice',
    'invoice', 'receipt', 'property_document', 'tenant_document', 'other'
  )),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_docs_lease_prop FOREIGN KEY (lease_id, property_id) REFERENCES public.leases(id, property_id) ON DELETE SET NULL,
  CONSTRAINT fk_docs_tenant_prop FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL,
  CONSTRAINT fk_docs_unit_prop FOREIGN KEY (unit_id, property_id) REFERENCES public.units(id, property_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_one_current_per_account
  ON public.subscriptions (account_id)
  WHERE status IN ('pending_payment', 'under_review', 'trialing', 'active', 'past_due', 'paused');

CREATE INDEX IF NOT EXISTS idx_platform_admins_status ON public.platform_admins(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_account_id ON public.subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_account_id ON public.subscription_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment_id ON public.payment_proofs(payment_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role_id ON public.workspace_members(role_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_public_id ON public.profiles(public_id);
CREATE INDEX IF NOT EXISTS idx_permissions_scope ON public.permissions(scope);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions(key);
CREATE INDEX IF NOT EXISTS idx_platform_role_permissions_role ON public.platform_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_platform_role_permissions_perm ON public.platform_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_platform_user_roles_user ON public.platform_user_roles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_roles_system_name ON public.team_roles (lower(name)) WHERE workspace_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_roles_workspace_name ON public.team_roles (workspace_id, lower(name)) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_roles_workspace_id ON public.team_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_role_permissions_role ON public.team_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_team_role_permissions_perm ON public.team_role_permissions(permission_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitations_token_hash ON public.workspace_invitations(token_hash) WHERE token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON public.workspace_invitations(status);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_expires ON public.workspace_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_properties_workspace_id ON public.properties(workspace_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_members_prop_id ON public.property_members(property_id);
CREATE INDEX IF NOT EXISTS idx_property_members_user_id ON public.property_members(user_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON public.tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON public.leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON public.leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_lease_tenants_lease_id ON public.lease_tenants(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_tenants_tenant_id ON public.lease_tenants(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lease_primary_tenant ON public.lease_tenants (lease_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON public.invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON public.payments(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON public.expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON public.inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON public.documents(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON public.tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_id ON public.activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_property_id ON public.activity_logs(property_id);

-- -----------------------------------------------------------------------------
-- Functions
-- -----------------------------------------------------------------------------

-- RBAC + admin config functions (migrations 0054–0059)

CREATE OR REPLACE FUNCTION public.generate_profile_public_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_id := 'PL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = v_id) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_profiles_set_public_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := public.generate_profile_public_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_invitation_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(sha256(p_token::bytea), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.has_platform_permission(
  p_permission_key TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN FALSE; END IF;

  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = v_user AND status = 'active') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.platform_user_roles pur
    JOIN public.platform_role_permissions prp ON prp.role_id = pur.role_id
    JOIN public.permissions p ON p.id = prp.permission_id
    WHERE pur.user_id = v_user AND p.key = p_permission_key AND p.scope = 'PLATFORM'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_effective_workspace_permissions(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS SETOF TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_role_id UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN; END IF;

  IF public.has_platform_permission('team.data.view', v_user)
     OR public.has_platform_permission('team.admin_access', v_user) THEN
    RETURN QUERY SELECT key FROM public.permissions WHERE scope = 'TEAM';
    RETURN;
  END IF;

  SELECT wm.role_id INTO v_role_id
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = v_user
    AND wm.status = 'active';

  IF v_role_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p_workspace_id AND w.owner_id = v_user) THEN
      SELECT tr.id INTO v_role_id
      FROM public.team_roles tr
      WHERE tr.is_system_role = true AND lower(tr.name) = 'owner'
      LIMIT 1;
    END IF;
  END IF;

  IF v_role_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.key
  FROM public.team_role_permissions trp
  JOIN public.permissions p ON p.id = trp.permission_id
  WHERE trp.role_id = v_role_id AND p.scope = 'TEAM';
END;
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  p_workspace_id UUID,
  p_permission_key TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN FALSE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.get_effective_workspace_permissions(p_workspace_id, v_user) AS perm
    WHERE perm = p_permission_key
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_assign_team_role(
  p_workspace_id UUID,
  p_role_id UUID,
  p_assigner_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigner UUID;
  v_role_workspace UUID;
BEGIN
  v_assigner := COALESCE(p_assigner_id, auth.uid());
  IF v_assigner IS NULL THEN RETURN FALSE; END IF;

  SELECT workspace_id INTO v_role_workspace FROM public.team_roles WHERE id = p_role_id;
  IF v_role_workspace IS NOT NULL AND v_role_workspace != p_workspace_id THEN
    RETURN FALSE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.team_role_permissions trp
    JOIN public.permissions p ON p.id = trp.permission_id
    WHERE trp.role_id = p_role_id
      AND p.scope = 'TEAM'
      AND p.key NOT IN (
        SELECT perm FROM public.get_effective_workspace_permissions(p_workspace_id, v_assigner) AS perm
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.count_workspace_seats(p_workspace_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    (SELECT COUNT(*)::INTEGER FROM public.workspace_members
     WHERE workspace_id = p_workspace_id AND status = 'active')
    +
    (SELECT COUNT(*)::INTEGER FROM public.workspace_invitations
     WHERE workspace_id = p_workspace_id AND status = 'pending' AND expires_at > NOW())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_seat_limit(p_workspace_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_limit INTEGER;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = p_workspace_id;
  IF v_owner_id IS NULL THEN RETURN 0; END IF;

  SELECT (pe.value::TEXT)::INTEGER INTO v_limit
  FROM public.subscriptions s
  JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
  JOIN public.entitlements e ON e.id = pe.entitlement_id
  WHERE s.account_id = v_owner_id
    AND s.status IN ('active', 'trialing')
    AND e.key = 'team_members.max'
  ORDER BY s.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_limit, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_workspace_seat_available(p_workspace_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INTEGER;
  v_limit INTEGER;
BEGIN
  v_current := public.count_workspace_seats(p_workspace_id);
  v_limit := public.get_workspace_seat_limit(p_workspace_id);
  IF v_current >= v_limit THEN
    RAISE EXCEPTION 'SEAT_LIMIT_EXCEEDED: Workspace has reached its team member limit (% of %)', v_current, v_limit;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND status = 'active') THEN
    RETURN TRUE;
  END IF;
  RETURN public.has_platform_permission('team.admin_access');
END;
$$;
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_workspace_invitation(
  p_workspace_id UUID,
  p_role_id UUID,
  p_invite_type TEXT DEFAULT 'LINK',
  p_profile_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_expiry_days INTEGER DEFAULT 7
)
RETURNS TABLE(invitation_id UUID, raw_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_token TEXT;
  v_token_hash TEXT;
  v_inv_id UUID;
  v_role_workspace UUID;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'team.member.invite', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: missing team.member.invite';
  END IF;

  PERFORM public.assert_workspace_seat_available(p_workspace_id);

  SELECT workspace_id INTO v_role_workspace FROM public.team_roles WHERE id = p_role_id;
  IF v_role_workspace IS NOT NULL AND v_role_workspace != p_workspace_id THEN
    RAISE EXCEPTION 'INVALID_ROLE: role does not belong to workspace';
  END IF;

  IF NOT public.can_assign_team_role(p_workspace_id, p_role_id, v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: cannot assign role with permissions you do not have';
  END IF;

  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');
  v_token_hash := public.hash_invitation_token(v_token);

  INSERT INTO public.workspace_invitations (
    workspace_id, invited_by, email, profile_id, role_id, token_hash,
    invite_type, status, expires_at
  ) VALUES (
    p_workspace_id, v_user, p_email, p_profile_id, p_role_id, v_token_hash,
    p_invite_type, 'pending', NOW() + (p_expiry_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_inv_id;

  PERFORM public.log_activity(
    'member.invite_created', 'workspace_invitation', v_inv_id,
    p_workspace_id, NULL,
    jsonb_build_object('invitation_id', v_inv_id, 'role_id', p_role_id, 'invite_type', p_invite_type)
  );

  RETURN QUERY SELECT v_inv_id, v_token;
END;
$$;

-- -----------------------------------------------------------------------------
-- resolve_invitation_by_token (safe preview)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_invitation_by_token(p_token TEXT)
RETURNS TABLE(
  invitation_id UUID,
  status TEXT,
  workspace_id UUID,
  workspace_name TEXT,
  inviter_name TEXT,
  role_name TEXT,
  role_id UUID,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  v_hash := public.hash_invitation_token(p_token);

  RETURN QUERY
  SELECT
    wi.id,
    wi.status,
    w.id,
    w.name,
    COALESCE(p.full_name, 'A team member'),
    tr.name,
    tr.id,
    wi.expires_at,
    (wi.expires_at < NOW() OR wi.status = 'expired')
  FROM public.workspace_invitations wi
  JOIN public.workspaces w ON w.id = wi.workspace_id
  JOIN public.team_roles tr ON tr.id = wi.role_id
  LEFT JOIN public.profiles p ON p.id = wi.invited_by
  WHERE wi.token_hash = v_hash;
END;
$$;

-- -----------------------------------------------------------------------------
-- accept_workspace_invitation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_token TEXT)
RETURNS TABLE(workspace_id UUID, member_id UUID, role_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_hash TEXT;
  v_inv RECORD;
  v_member_id UUID;
  v_role_name TEXT;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

  v_hash := public.hash_invitation_token(p_token);

  SELECT wi.*, tr.name AS role_name_text
  INTO v_inv
  FROM public.workspace_invitations wi
  JOIN public.team_roles tr ON tr.id = wi.role_id
  WHERE wi.token_hash = v_hash
  FOR UPDATE;

  IF v_inv IS NULL THEN RAISE EXCEPTION 'INVALID_INVITATION'; END IF;
  IF v_inv.status = 'revoked' THEN RAISE EXCEPTION 'INVITATION_REVOKED'; END IF;
  IF v_inv.status = 'accepted' THEN RAISE EXCEPTION 'INVITATION_ALREADY_ACCEPTED'; END IF;
  IF v_inv.expires_at < NOW() OR v_inv.status = 'expired' THEN
    UPDATE public.workspace_invitations SET status = 'expired', updated_at = NOW() WHERE id = v_inv.id;
    RAISE EXCEPTION 'INVITATION_EXPIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = v_inv.workspace_id AND user_id = v_user AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.team_roles WHERE id = v_inv.role_id) THEN
    RAISE EXCEPTION 'ROLE_UNAVAILABLE';
  END IF;

  PERFORM public.assert_workspace_seat_available(v_inv.workspace_id);

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id, role, status, invited_by, joined_at)
  VALUES (
    v_inv.workspace_id, v_user, v_inv.role_id,
    (SELECT CASE lower(name)
      WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
      WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
     FROM public.team_roles WHERE id = v_inv.role_id),
    'active', v_inv.invited_by, NOW()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id, role = EXCLUDED.role, status = 'active', joined_at = NOW(), updated_at = NOW()
  RETURNING id INTO v_member_id;

  UPDATE public.workspace_invitations
  SET status = 'accepted', accepted_at = NOW(), accepted_by = v_user, updated_at = NOW()
  WHERE id = v_inv.id;

  PERFORM public.sync_workspace_member_property_access(v_inv.workspace_id, v_user);

  PERFORM public.log_activity(
    p_action := 'member.invite_accepted',
    p_entity_type := 'workspace_member',
    p_entity_id := v_member_id,
    p_workspace_id := v_inv.workspace_id,
    p_metadata := jsonb_build_object('invitation_id', v_inv.id, 'role_id', v_inv.role_id)
  );

  v_role_name := v_inv.role_name_text;
  RETURN QUERY SELECT v_inv.workspace_id, v_member_id, v_role_name;
END;
$$;

-- -----------------------------------------------------------------------------
-- add_workspace_member_by_profile_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_workspace_member_by_profile_id(
  p_workspace_id UUID,
  p_public_id TEXT,
  p_role_id UUID
)
RETURNS TABLE(member_id UUID, user_id UUID, role_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID;
  v_target_user UUID;
  v_member_id UUID;
  v_role_name TEXT;
  v_role_workspace UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'team.member.invite', v_caller) THEN
    RAISE EXCEPTION 'FORBIDDEN: missing team.member.invite';
  END IF;

  SELECT p.id INTO v_target_user FROM public.profiles p WHERE p.public_id = p_public_id;
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id AND wm.user_id = v_target_user AND wm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  SELECT tr.workspace_id, tr.name INTO v_role_workspace, v_role_name FROM public.team_roles tr WHERE tr.id = p_role_id;
  IF v_role_workspace IS NOT NULL AND v_role_workspace != p_workspace_id THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  IF NOT public.can_assign_team_role(p_workspace_id, p_role_id, v_caller) THEN
    RAISE EXCEPTION 'FORBIDDEN: cannot assign role';
  END IF;

  PERFORM public.assert_workspace_seat_available(p_workspace_id);

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id, role, status, invited_by, joined_at)
  VALUES (
    p_workspace_id, v_target_user, p_role_id,
    (SELECT CASE lower(tr.name)
      WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
      WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
     FROM public.team_roles tr WHERE tr.id = p_role_id),
    'active', v_caller, NOW()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id, role = EXCLUDED.role, status = 'active', joined_at = NOW(), updated_at = NOW()
  RETURNING id INTO v_member_id;

  PERFORM public.sync_workspace_member_property_access(p_workspace_id, v_target_user);

  PERFORM public.log_activity(
    p_action := 'member.added',
    p_entity_type := 'workspace_member',
    p_entity_id := v_member_id,
    p_workspace_id := p_workspace_id,
    p_metadata := jsonb_build_object('target_user_id', v_target_user, 'role_id', p_role_id)
  );

  RETURN QUERY SELECT v_member_id, v_target_user, v_role_name;
END;
$$;

-- -----------------------------------------------------------------------------
-- revoke_workspace_invitation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_workspace_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
BEGIN
  v_user := auth.uid();
  SELECT workspace_id INTO v_ws FROM public.workspace_invitations WHERE id = p_invitation_id;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.invite', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.workspace_invitations
  SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
  WHERE id = p_invitation_id AND status = 'pending';
  PERFORM public.log_activity('member.invite_revoked', 'workspace_invitation', p_invitation_id, v_ws, NULL, '{}'::jsonb);
END;
$$;

-- -----------------------------------------------------------------------------
-- change_workspace_member_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.change_workspace_member_role(
  p_member_id UUID,
  p_role_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_target_user UUID;
  v_old_role_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT wm.workspace_id, wm.user_id, wm.role_id
  INTO v_ws, v_target_user, v_old_role_id
  FROM public.workspace_members wm WHERE wm.id = p_member_id;

  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF NOT public.can_assign_team_role(v_ws, p_role_id, v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: cannot assign role';
  END IF;

  UPDATE public.workspace_members
  SET role_id = p_role_id,
      role = (SELECT CASE lower(name)
        WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
        WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
       FROM public.team_roles WHERE id = p_role_id),
      updated_at = NOW()
  WHERE id = p_member_id;

  PERFORM public.sync_workspace_member_property_access(v_ws, v_target_user);

  PERFORM public.log_activity(
    p_action := 'member.role_changed',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := jsonb_build_object('previous_role_id', v_old_role_id, 'new_role_id', p_role_id)
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- remove_workspace_member
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_workspace_member(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_target_user UUID;
  v_owner_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT wm.workspace_id, wm.user_id INTO v_ws, v_target_user
  FROM public.workspace_members wm WHERE wm.id = p_member_id;
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = v_ws;

  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_target_user = v_owner_id THEN RAISE EXCEPTION 'CANNOT_REMOVE_OWNER'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.remove', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.workspace_members SET status = 'removed', updated_at = NOW() WHERE id = p_member_id;
  PERFORM public.revoke_workspace_member_property_access(v_ws, v_target_user, 'removed');
  PERFORM public.log_activity(
    p_action := 'member.removed',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := '{}'::jsonb
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- suspend_workspace_member
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspend_workspace_member(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_target_user UUID;
BEGIN
  v_user := auth.uid();
  SELECT wm.workspace_id, wm.user_id INTO v_ws, v_target_user
  FROM public.workspace_members wm WHERE wm.id = p_member_id;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.workspace_members SET status = 'suspended', updated_at = NOW() WHERE id = p_member_id;
  PERFORM public.revoke_workspace_member_property_access(v_ws, v_target_user, 'suspended');
  PERFORM public.log_activity(
    p_action := 'member.suspended',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := '{}'::jsonb
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- get_assignable_team_roles
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_assignable_team_roles(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(role_id UUID, name TEXT, description TEXT, is_system_role BOOLEAN, permission_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  RETURN QUERY
  SELECT tr.id, tr.name, tr.description, tr.is_system_role,
    (SELECT COUNT(*) FROM public.team_role_permissions trp WHERE trp.role_id = tr.id)
  FROM public.team_roles tr
  WHERE (tr.workspace_id IS NULL OR tr.workspace_id = p_workspace_id)
    AND public.can_assign_team_role(p_workspace_id, tr.id, v_user)
  ORDER BY tr.is_system_role DESC, tr.name;
END;
$$;

-- -----------------------------------------------------------------------------
-- get_role_permissions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role_id UUID)
RETURNS TABLE(key TEXT, name TEXT, resource TEXT, action TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.key, p.name, p.resource, p.action
  FROM public.team_role_permissions trp
  JOIN public.permissions p ON p.id = trp.permission_id
  WHERE trp.role_id = p_role_id AND p.scope = 'TEAM'
  ORDER BY p.resource, p.action;
$$;

-- -----------------------------------------------------------------------------
-- lookup_profile_by_public_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_profile_by_public_id(p_public_id TEXT)
RETURNS TABLE(id UUID, public_id TEXT, full_name TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.public_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.public_id = p_public_id;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace_invitation(UUID, UUID, TEXT, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_invitation_by_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_workspace_member_by_profile_id(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_workspace_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_workspace_member_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignable_team_roles(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_public_id(TEXT) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_workspace_pending_invitations(p_workspace_id UUID)
RETURNS TABLE(
  id UUID,
  role_name TEXT,
  invite_type TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  inviter_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_workspace_permission(p_workspace_id, 'team.member.view') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    wi.id,
    tr.name,
    wi.invite_type,
    wi.status,
    wi.expires_at,
    wi.created_at,
    COALESCE(p.full_name, 'Unknown')
  FROM public.workspace_invitations wi
  JOIN public.team_roles tr ON tr.id = wi.role_id
  LEFT JOIN public.profiles p ON p.id = wi.invited_by
  WHERE wi.workspace_id = p_workspace_id
    AND wi.status = 'pending'
  ORDER BY wi.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_pending_invitations(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_workspace_team_role(
  p_workspace_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_permission_keys TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_role_id UUID;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  v_user := auth.uid();
  IF NOT public.has_workspace_permission(p_workspace_id, 'team.role.create', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.team_roles (workspace_id, name, description, is_system_role, created_by)
  VALUES (p_workspace_id, p_name, p_description, false, v_user)
  RETURNING id INTO v_role_id;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.get_effective_workspace_permissions(p_workspace_id, v_user) AS perm
      WHERE perm = v_key
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN: cannot grant permission %', v_key;
    END IF;
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  PERFORM public.log_activity('team_role.created', 'team_role', v_role_id, p_workspace_id, NULL,
    jsonb_build_object('name', p_name, 'permission_count', array_length(p_permission_keys, 1)));

  RETURN v_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_workspace_team_role(
  p_role_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_permission_keys TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT workspace_id INTO v_ws FROM public.team_roles WHERE id = p_role_id AND is_system_role = false;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND or system role'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.role.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.team_roles SET name = p_name, description = p_description, updated_at = NOW()
  WHERE id = p_role_id;

  DELETE FROM public.team_role_permissions WHERE role_id = p_role_id;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.get_effective_workspace_permissions(v_ws, v_user) AS perm WHERE perm = v_key
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN: cannot grant permission %', v_key;
    END IF;
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id) VALUES (p_role_id, v_perm_id);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_workspace_team_role(p_role_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws UUID;
  v_member_count INTEGER;
BEGIN
  SELECT workspace_id INTO v_ws FROM public.team_roles WHERE id = p_role_id AND is_system_role = false;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.role.delete', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.workspace_members WHERE role_id = p_role_id AND status = 'active';
  IF v_member_count > 0 THEN
    RAISE EXCEPTION 'ROLE_IN_USE: % members assigned', v_member_count;
  END IF;

  DELETE FROM public.team_roles WHERE id = p_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_team_roles(p_workspace_id UUID)
RETURNS TABLE(
  id UUID, name TEXT, description TEXT, is_system_role BOOLEAN,
  workspace_id UUID, member_count BIGINT, permission_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_workspace_permission(p_workspace_id, 'team.role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    tr.id, tr.name, tr.description, tr.is_system_role, tr.workspace_id,
    (SELECT COUNT(*) FROM public.workspace_members wm WHERE wm.role_id = tr.id AND wm.status = 'active'),
    (SELECT COUNT(*) FROM public.team_role_permissions trp WHERE trp.role_id = tr.id)
  FROM public.team_roles tr
  WHERE tr.workspace_id IS NULL OR tr.workspace_id = p_workspace_id
  ORDER BY tr.is_system_role DESC, tr.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace_team_role(UUID, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_workspace_team_role(UUID, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_workspace_team_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_team_roles(UUID) TO authenticated;
-- admin_get_role_impact
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_role_impact(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.has_platform_permission('platform_role.view', auth.uid())
     AND NOT public.has_platform_permission('team_role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_entity_type = 'platform_role' THEN
    SELECT jsonb_build_object(
      'user_count', (SELECT COUNT(*) FROM public.platform_user_roles WHERE role_id = p_entity_id),
      'permission_count', (SELECT COUNT(*) FROM public.platform_role_permissions WHERE role_id = p_entity_id)
    ) INTO v_result;
  ELSIF p_entity_type = 'team_role' THEN
    SELECT jsonb_build_object(
      'member_count', (SELECT COUNT(*) FROM public.workspace_members WHERE role_id = p_entity_id AND status = 'active'),
      'workspace_count', (SELECT COUNT(DISTINCT workspace_id) FROM public.workspace_members WHERE role_id = p_entity_id AND status = 'active'),
      'permission_count', (SELECT COUNT(*) FROM public.team_role_permissions WHERE role_id = p_entity_id)
    ) INTO v_result;
  ELSIF p_entity_type = 'entitlement' THEN
    SELECT jsonb_build_object(
      'plan_count', (SELECT COUNT(*) FROM public.plan_entitlements WHERE entitlement_id = p_entity_id)
    ) INTO v_result;
  ELSE
    RAISE EXCEPTION 'INVALID_ENTITY_TYPE';
  END IF;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_upsert_platform_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_platform_role(
  p_role_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_permission_keys TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_role_id UUID;
  v_is_system BOOLEAN;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  v_user := auth.uid();

  IF p_role_id IS NULL THEN
    IF NOT public.has_platform_permission('platform_role.create', v_user) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    INSERT INTO public.platform_roles (name, description, is_system_role, created_by)
    VALUES (p_name, p_description, false, v_user)
    RETURNING id INTO v_role_id;
  ELSE
    IF NOT public.has_platform_permission('platform_role.update', v_user) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    SELECT is_system_role INTO v_is_system FROM public.platform_roles WHERE id = p_role_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

    UPDATE public.platform_roles
    SET name = p_name, description = p_description, updated_at = NOW()
    WHERE id = p_role_id;
    v_role_id := p_role_id;

    DELETE FROM public.platform_role_permissions WHERE role_id = p_role_id;
  END IF;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'PLATFORM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.platform_role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_role_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_delete_platform_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_platform_role(p_role_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_system BOOLEAN;
  v_user_count INTEGER;
BEGIN
  IF NOT public.has_platform_permission('platform_role.delete', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT is_system_role INTO v_is_system FROM public.platform_roles WHERE id = p_role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_is_system THEN RAISE EXCEPTION 'SYSTEM_ROLE: System roles cannot be deleted'; END IF;

  SELECT COUNT(*) INTO v_user_count FROM public.platform_user_roles WHERE role_id = p_role_id;
  IF v_user_count > 0 THEN
    RAISE EXCEPTION 'ROLE_IN_USE: % users assigned', v_user_count;
  END IF;

  DELETE FROM public.platform_roles WHERE id = p_role_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_update_system_team_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_system_team_role(
  p_role_id UUID,
  p_description TEXT,
  p_permission_keys TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  IF NOT public.has_platform_permission('team_role.update', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_roles
    WHERE id = p_role_id AND workspace_id IS NULL AND is_system_role = true
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND or not a system role';
  END IF;

  UPDATE public.team_roles SET description = p_description, updated_at = NOW()
  WHERE id = p_role_id;

  DELETE FROM public.team_role_permissions WHERE role_id = p_role_id;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id)
      VALUES (p_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_get_platform_roles_with_stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_platform_roles_with_stats()
RETURNS TABLE(
  id UUID, name TEXT, description TEXT, is_system_role BOOLEAN,
  permission_count BIGINT, user_count BIGINT, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_platform_permission('platform_role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    pr.id, pr.name, pr.description, pr.is_system_role,
    (SELECT COUNT(*) FROM public.platform_role_permissions prp WHERE prp.role_id = pr.id),
    (SELECT COUNT(*) FROM public.platform_user_roles pur WHERE pur.role_id = pr.id),
    pr.updated_at
  FROM public.platform_roles pr
  ORDER BY pr.is_system_role DESC, pr.name;
END;
$$;

-- -----------------------------------------------------------------------------
-- admin_get_system_team_roles_with_stats
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_system_team_roles_with_stats()
RETURNS TABLE(
  id UUID, name TEXT, description TEXT, is_system_role BOOLEAN,
  permission_count BIGINT, member_count BIGINT, workspace_count BIGINT, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_platform_permission('team_role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    tr.id, tr.name, tr.description, tr.is_system_role,
    (SELECT COUNT(*) FROM public.team_role_permissions trp WHERE trp.role_id = tr.id),
    (SELECT COUNT(*) FROM public.workspace_members wm WHERE wm.role_id = tr.id AND wm.status = 'active'),
    (SELECT COUNT(DISTINCT wm.workspace_id) FROM public.workspace_members wm WHERE wm.role_id = tr.id AND wm.status = 'active'),
    tr.updated_at
  FROM public.team_roles tr
  WHERE tr.workspace_id IS NULL AND tr.is_system_role = true
  ORDER BY tr.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_role_impact(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_platform_role(UUID, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_platform_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_system_team_role(UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_platform_roles_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_system_team_roles_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_platform_permission(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_permission(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_workspace_permissions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_team_role(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_workspace_seats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_seat_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_workspace_seat_available(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_team_role_to_property_role(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_workspace_member_property_access(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_workspace_member_property_access(UUID, UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.owns_property(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND owner_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_property(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.owns_property(p_property_id)
      OR EXISTS (
        SELECT 1 FROM public.property_members
        WHERE property_id = p_property_id AND user_id = auth.uid() AND status = 'active'
      );
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_can_read_lease(p_lease_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lease_tenants lt
    INNER JOIN public.tenants t ON t.id = lt.tenant_id
    WHERE lt.lease_id = p_lease_id
      AND t.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_can_read_unit(p_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lease_tenants lt
    INNER JOIN public.tenants t ON t.id = lt.tenant_id
    INNER JOIN public.leases l ON l.id = lt.lease_id AND l.property_id = lt.property_id
    WHERE l.unit_id = p_unit_id
      AND t.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_workspace(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND (
      w.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid() AND wm.status = 'active'
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_owns_or_member_workspace(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND (
        w.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members wm
          WHERE wm.workspace_id = w.id
            AND wm.user_id = (SELECT auth.uid())
            AND wm.status = 'active'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_property_permission(
  p_property_id UUID,
  p_permission TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_role TEXT;
  v_user UUID;
BEGIN
  v_user := COALESCE(auth.uid(), p_user_id);
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_platform_admin() THEN
    RETURN FALSE;
  END IF;
  IF v_user IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT owner_id INTO v_owner_id FROM public.properties WHERE id = p_property_id;
  IF v_owner_id IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_owner_id = v_user THEN
    RETURN TRUE;
  END IF;

  SELECT role INTO v_role
  FROM public.property_members
  WHERE property_id = p_property_id AND user_id = v_user AND status = 'active';

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE
    WHEN p_permission IN (
      'property.view', 'team.view', 'tenant.view', 'lease.view', 'financial.view',
      'maintenance.view', 'inspection.view', 'document.view', 'task.view', 'reports.view'
    ) THEN
      RETURN v_role IN ('owner', 'manager', 'agent', 'staff', 'viewer');
    WHEN p_permission = 'property.update' THEN
      RETURN v_role IN ('owner', 'manager', 'agent');
    WHEN p_permission = 'property.delete' THEN
      RETURN v_role = 'owner';
    WHEN p_permission IN ('team.invite', 'team.manage_members', 'team.remove') THEN
      RETURN v_role IN ('owner', 'manager');
    WHEN p_permission IN (
      'tenant.create', 'tenant.update', 'tenant.manage',
      'lease.create', 'lease.update', 'lease.manage'
    ) THEN
      RETURN v_role IN ('owner', 'manager', 'agent');
    WHEN p_permission = 'financial.manage' THEN
      RETURN v_role IN ('owner', 'manager');
    WHEN p_permission = 'maintenance.create' THEN
      RETURN v_role IN ('owner', 'manager', 'agent', 'staff');
    WHEN p_permission = 'maintenance.manage' THEN
      RETURN v_role IN ('owner', 'manager', 'agent');
    WHEN p_permission IN ('inspection.create', 'inspection.manage') THEN
      RETURN v_role IN ('owner', 'manager', 'agent');
    WHEN p_permission IN ('document.create', 'document.manage', 'task.create', 'task.manage') THEN
      RETURN v_role IN ('owner', 'manager', 'agent', 'staff');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_property_ids(p_user_id UUID DEFAULT NULL)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := auth.uid();
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_user THEN
    IF NOT public.is_platform_admin() THEN
      RETURN;
    END IF;
    v_user := p_user_id;
  END IF;
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT id FROM public.properties WHERE owner_id = v_user AND status = 'active'
  UNION
  SELECT pm.property_id FROM public.property_members pm
  JOIN public.properties p ON pm.property_id = p.id
  WHERE pm.user_id = v_user AND pm.status = 'active' AND p.status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_workspace_ids(p_user_id UUID DEFAULT NULL)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  v_user := auth.uid();
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_user THEN
    IF NOT public.is_platform_admin() THEN
      RETURN;
    END IF;
    v_user := p_user_id;
  END IF;
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT id FROM public.workspaces WHERE owner_id = v_user AND status = 'active'
  UNION
  SELECT wm.workspace_id FROM public.workspace_members wm
  JOIN public.workspaces w ON wm.workspace_id = w.id
  WHERE wm.user_id = v_user AND wm.status = 'active' AND w.status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  INSERT INTO public.account_context (user_id, status, onboarding_status, created_at, updated_at)
  VALUES (NEW.id, 'active', 'completed', NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (account_id, plan_id, status, created_at, updated_at)
    SELECT NEW.id, free_plan_id, 'active', NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.account_id = NEW.id
        AND s.status IN ('pending_payment', 'under_review', 'trialing', 'active', 'past_due', 'paused')
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_activity_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Forbidden: Activity logs are append-only and cannot be updated or deleted';
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_account_context_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_admin() THEN
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.status := OLD.status;
  NEW.first_login_at := OLD.first_login_at;
  NEW.last_login_at := OLD.last_login_at;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.user_id := OLD.user_id;
  NEW.property_id := OLD.property_id;
  NEW.type := OLD.type;
  NEW.title := OLD.title;
  NEW.message := OLD.message;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_property_owner_in_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = NEW.workspace_id AND w.owner_id = NEW.owner_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = NEW.workspace_id
      AND wm.user_id = NEW.owner_id
      AND wm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Property owner must be the workspace owner or an active workspace member';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_property_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.property_members (property_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NOW())
  ON CONFLICT (property_id, user_id) DO UPDATE SET
    role = 'owner',
    status = 'active',
    updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.map_team_role_to_property_role(p_team_role_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  CASE lower(COALESCE(p_team_role_name, ''))
    WHEN 'owner' THEN RETURN 'manager';
    WHEN 'admin' THEN RETURN 'manager';
    WHEN 'manager' THEN RETURN 'manager';
    WHEN 'leasing agent' THEN RETURN 'agent';
    WHEN 'staff' THEN RETURN 'staff';
    WHEN 'landlord' THEN RETURN 'viewer';
    ELSE RETURN 'viewer';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_workspace_member_property_access(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
  v_property_role TEXT;
BEGIN
  SELECT wm.role_id, tr.name AS role_name
  INTO v_member
  FROM public.workspace_members wm
  LEFT JOIN public.team_roles tr ON tr.id = wm.role_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = p_user_id
    AND wm.status = 'active';

  IF v_member IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'property.view', p_user_id) THEN
    RETURN;
  END IF;

  v_property_role := public.map_team_role_to_property_role(v_member.role_name);

  INSERT INTO public.property_members (property_id, user_id, role, status, joined_at)
  SELECT p.id, p_user_id, v_property_role, 'active', NOW()
  FROM public.properties p
  WHERE p.workspace_id = p_workspace_id
    AND p.status = 'active'
    AND p.owner_id IS DISTINCT FROM p_user_id
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      status = 'active',
      updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_workspace_member_property_access(
  p_workspace_id UUID,
  p_user_id UUID,
  p_status TEXT DEFAULT 'removed'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.property_members pm
  SET status = p_status,
      updated_at = NOW()
  FROM public.properties p
  WHERE pm.property_id = p.id
    AND p.workspace_id = p_workspace_id
    AND pm.user_id = p_user_id
    AND p.owner_id IS DISTINCT FROM p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_property_workspace_team_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
BEGIN
  FOR v_member IN
    SELECT wm.user_id
    FROM public.workspace_members wm
    WHERE wm.workspace_id = NEW.workspace_id
      AND wm.status = 'active'
  LOOP
    PERFORM public.sync_workspace_member_property_access(NEW.workspace_id, v_member.user_id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_property_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
    RAISE EXCEPTION 'property_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_payment_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
     OR NEW.lease_id IS DISTINCT FROM OLD.lease_id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Payment ownership fields cannot be changed';
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('completed', 'failed'))
      OR (OLD.status = 'completed' AND NEW.status IN ('reversed', 'refunded'))
      OR (OLD.status = 'failed' AND NEW.status = 'pending')
    ) THEN
      RAISE EXCEPTION 'Invalid payment status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_property_id IS NOT NULL AND NOT public.can_access_property(p_property_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: no access to property';
  END IF;
  IF p_workspace_id IS NOT NULL AND NOT public.can_access_workspace(p_workspace_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: no access to workspace';
  END IF;

  INSERT INTO public.activity_logs (workspace_id, property_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_workspace_id, p_property_id, auth.uid(), p_action, p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.receipt_payment_id_from_path(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_folder TEXT;
BEGIN
  v_folder := split_part(p_name, '/', 1);
  IF v_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_folder::UUID;
  END IF;
  RETURN NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_profiles_set_public_id ON public.profiles;
CREATE TRIGGER trg_profiles_set_public_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_profiles_set_public_id();

DROP TRIGGER IF EXISTS trg_prevent_activity_log_modification ON public.activity_logs;
CREATE TRIGGER trg_prevent_activity_log_modification
  BEFORE UPDATE OR DELETE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_activity_log_modification();

DROP TRIGGER IF EXISTS trg_protect_account_context ON public.account_context;
CREATE TRIGGER trg_protect_account_context
  BEFORE UPDATE ON public.account_context
  FOR EACH ROW EXECUTE FUNCTION public.protect_account_context_columns();

DROP TRIGGER IF EXISTS trg_protect_notification_update ON public.notifications;
CREATE TRIGGER trg_protect_notification_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_notification_update();

DROP TRIGGER IF EXISTS trg_enforce_property_owner_workspace ON public.properties;
CREATE TRIGGER trg_enforce_property_owner_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, owner_id ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_owner_in_workspace();

DROP TRIGGER IF EXISTS trg_ensure_property_owner_membership ON public.properties;
CREATE TRIGGER trg_ensure_property_owner_membership
  AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.ensure_property_owner_membership();

DROP TRIGGER IF EXISTS trg_sync_property_workspace_team_access ON public.properties;
CREATE TRIGGER trg_sync_property_workspace_team_access
  AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.sync_property_workspace_team_access();

DROP TRIGGER IF EXISTS trg_protect_units_property ON public.units;
CREATE TRIGGER trg_protect_units_property BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();
DROP TRIGGER IF EXISTS trg_protect_tenants_property ON public.tenants;
CREATE TRIGGER trg_protect_tenants_property BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();
DROP TRIGGER IF EXISTS trg_protect_leases_property ON public.leases;
CREATE TRIGGER trg_protect_leases_property BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();
DROP TRIGGER IF EXISTS trg_protect_invoices_property ON public.invoices;
CREATE TRIGGER trg_protect_invoices_property BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();
DROP TRIGGER IF EXISTS trg_protect_payments_property ON public.payments;
CREATE TRIGGER trg_protect_payments_property BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();
DROP TRIGGER IF EXISTS trg_protect_expenses_property ON public.expenses;
CREATE TRIGGER trg_protect_expenses_property BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();
DROP TRIGGER IF EXISTS trg_protect_maint_property ON public.maintenance_requests;
CREATE TRIGGER trg_protect_maint_property BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();
DROP TRIGGER IF EXISTS trg_protect_insp_property ON public.inspections;
CREATE TRIGGER trg_protect_insp_property BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();
DROP TRIGGER IF EXISTS trg_protect_docs_property ON public.documents;
CREATE TRIGGER trg_protect_docs_property BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();
DROP TRIGGER IF EXISTS trg_protect_tasks_property ON public.tasks;
CREATE TRIGGER trg_protect_tasks_property BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.protect_property_id();

DROP TRIGGER IF EXISTS trg_protect_payment_lifecycle ON public.payments;
CREATE TRIGGER trg_protect_payment_lifecycle
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.protect_payment_lifecycle();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_platform_admin());

-- account_context
CREATE POLICY "Users can view own account context" ON public.account_context FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding status" ON public.account_context FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all account contexts" ON public.account_context FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Admins can update account contexts" ON public.account_context FOR UPDATE TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- platform_admins (no client writes)
CREATE POLICY "Users can view own platform admin row" ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- catalog
CREATE POLICY "Public and users can view active subscription plans" ON public.subscription_plans FOR SELECT
  USING (status = 'active' OR auth.role() = 'service_role');
CREATE POLICY "Admins can manage subscription plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Authenticated users can view entitlements" ON public.entitlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage entitlements" ON public.entitlements FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Authenticated users can view plan entitlements" ON public.plan_entitlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage plan entitlements" ON public.plan_entitlements FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- subscriptions: users SELECT only
CREATE POLICY "Users can view own account subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = account_id OR public.is_platform_admin());
CREATE POLICY "Admins can insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins can update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins can delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Admins can view subscription events" ON public.subscription_events FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY "Admins can view and insert audit logs" ON public.admin_audit_logs FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- subscription payments: users SELECT only
CREATE POLICY "Users can view own subscription payments" ON public.subscription_payments FOR SELECT TO authenticated
  USING (auth.uid() = account_id OR public.is_platform_admin());
CREATE POLICY "Admins can insert subscription payments" ON public.subscription_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins can update subscription payments" ON public.subscription_payments FOR UPDATE TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- payment proofs
CREATE POLICY "Users can view own payment proofs" ON public.payment_proofs FOR SELECT TO authenticated
  USING (
    public.is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.subscription_payments sp
      WHERE sp.id = payment_id AND sp.account_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own payment proofs" ON public.payment_proofs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.subscription_payments sp
      WHERE sp.id = payment_id AND sp.account_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all email events" ON public.email_events FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY "Users can view own email events" ON public.email_events FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' = recipient);

-- workspaces
CREATE POLICY "Users can view own workspaces" ON public.workspaces FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.can_access_workspace(id) OR public.is_platform_admin());
CREATE POLICY "Users can insert own workspaces" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own workspaces" ON public.workspaces FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "Users can view own workspace memberships" ON public.workspace_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_workspace_permission(workspace_id, 'team.member.view')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR public.has_platform_permission('team.data.view')
  );
CREATE POLICY "Workspace members insert via RPC only" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "Workspace members update with permission" ON public.workspace_members FOR UPDATE TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.member.update')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.member.update')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );
CREATE POLICY "Workspace members delete with permission" ON public.workspace_members FOR DELETE TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.member.remove')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

CREATE POLICY "permissions_select" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform_roles_select" ON public.platform_roles FOR SELECT TO authenticated
  USING (public.has_platform_permission('platform_role.view') OR public.is_platform_admin());
CREATE POLICY "platform_role_perms_select" ON public.platform_role_permissions FOR SELECT TO authenticated
  USING (public.has_platform_permission('platform_role.view') OR public.is_platform_admin());
CREATE POLICY "platform_user_roles_select" ON public.platform_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_platform_permission('user.view') OR public.is_platform_admin());
CREATE POLICY "team_roles_select" ON public.team_roles FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR public.can_access_workspace(workspace_id)
    OR public.has_platform_permission('team_role.view')
  );
CREATE POLICY "team_role_perms_select" ON public.team_role_permissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_roles tr
      WHERE tr.id = role_id
        AND (tr.workspace_id IS NULL OR public.can_access_workspace(tr.workspace_id))
    )
  );
CREATE POLICY "workspace_invitations_deny" ON public.workspace_invitations FOR ALL TO authenticated
  USING (false);

-- properties: workspace membership does NOT grant property data access
CREATE POLICY "Users can view authorized properties" ON public.properties FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR public.can_access_property(id)
    OR id IN (SELECT property_id FROM public.tenants WHERE user_id = auth.uid())
    OR public.is_platform_admin()
  );
CREATE POLICY "Users can insert properties in their workspace" ON public.properties FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND public.user_owns_or_member_workspace(workspace_id)
  );
CREATE POLICY "Users can update authorized properties" ON public.properties FOR UPDATE TO authenticated
  USING (public.owns_property(id) OR public.has_property_permission(id, 'property.update') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(id) OR public.has_property_permission(id, 'property.update') OR public.is_platform_admin());
CREATE POLICY "Users can delete owned properties" ON public.properties FOR DELETE TO authenticated
  USING (public.owns_property(id) OR public.is_platform_admin());

CREATE POLICY "Users can view property memberships" ON public.property_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.owns_property(property_id) OR public.has_property_permission(property_id, 'team.view') OR public.is_platform_admin());
CREATE POLICY "Property owners can insert members" ON public.property_members FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'team.manage_members') OR public.is_platform_admin());
CREATE POLICY "Property owners can update members" ON public.property_members FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'team.manage_members') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'team.manage_members') OR public.is_platform_admin());
CREATE POLICY "Property owners can delete members" ON public.property_members FOR DELETE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'team.manage_members') OR public.is_platform_admin());

-- units
CREATE POLICY "Users can view units in authorized properties" ON public.units FOR SELECT TO authenticated
  USING (
    public.can_access_property(property_id)
    OR public.tenant_can_read_unit(id)
    OR public.is_platform_admin()
  );
CREATE POLICY "Users can insert units" ON public.units FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'property.update') OR public.is_platform_admin());
CREATE POLICY "Users can update units" ON public.units FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'property.update') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'property.update') OR public.is_platform_admin());
CREATE POLICY "Users can delete units" ON public.units FOR DELETE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'property.update') OR public.is_platform_admin());

-- tenants
CREATE POLICY "Users can view tenants in authorized properties" ON public.tenants FOR SELECT TO authenticated
  USING (public.can_access_property(property_id) OR user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "Users can insert tenants" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'tenant.create') OR public.is_platform_admin());
CREATE POLICY "Users can update tenants" ON public.tenants FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'tenant.update') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'tenant.update') OR public.is_platform_admin());
CREATE POLICY "Users can delete tenants" ON public.tenants FOR DELETE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'tenant.manage') OR public.is_platform_admin());

-- leases
CREATE POLICY "Users can view leases in authorized properties" ON public.leases FOR SELECT TO authenticated
  USING (
    public.can_access_property(property_id)
    OR public.tenant_can_read_lease(id)
    OR public.is_platform_admin()
  );
CREATE POLICY "Users can insert leases" ON public.leases FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'lease.create') OR public.is_platform_admin());
CREATE POLICY "Users can update leases" ON public.leases FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'lease.update') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'lease.update') OR public.is_platform_admin());
CREATE POLICY "Users can delete leases" ON public.leases FOR DELETE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'lease.manage') OR public.is_platform_admin());

CREATE POLICY "Users can view lease tenants in authorized properties" ON public.lease_tenants FOR SELECT TO authenticated
  USING (
    public.can_access_property(property_id)
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    OR public.is_platform_admin()
  );
CREATE POLICY "Users can insert lease tenants" ON public.lease_tenants FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND (public.owns_property(l.property_id) OR public.has_property_permission(l.property_id, 'lease.update'))) OR public.is_platform_admin());
CREATE POLICY "Users can update lease tenants" ON public.lease_tenants FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND (public.owns_property(l.property_id) OR public.has_property_permission(l.property_id, 'lease.update'))) OR public.is_platform_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND (public.owns_property(l.property_id) OR public.has_property_permission(l.property_id, 'lease.update'))) OR public.is_platform_admin());
CREATE POLICY "Users can delete lease tenants" ON public.lease_tenants FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND (public.owns_property(l.property_id) OR public.has_property_permission(l.property_id, 'lease.manage'))) OR public.is_platform_admin());

-- invoices
CREATE POLICY "Users can view invoices in authorized properties" ON public.invoices FOR SELECT TO authenticated
  USING (
    public.can_access_property(property_id)
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    OR public.is_platform_admin()
  );
CREATE POLICY "Users can insert invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin());
CREATE POLICY "Users can update invoices" ON public.invoices FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin());
CREATE POLICY "Users can delete draft invoices" ON public.invoices FOR DELETE TO authenticated
  USING (status = 'draft' AND (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin()));

CREATE POLICY "Users can view invoice items for authorized properties" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.can_access_property(i.property_id)) OR public.is_platform_admin());
CREATE POLICY "Users can insert invoice items" ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (public.owns_property(i.property_id) OR public.has_property_permission(i.property_id, 'financial.manage'))) OR public.is_platform_admin());
CREATE POLICY "Users can update invoice items" ON public.invoice_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.status = 'draft' AND (public.owns_property(i.property_id) OR public.has_property_permission(i.property_id, 'financial.manage'))) OR public.is_platform_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (public.owns_property(i.property_id) OR public.has_property_permission(i.property_id, 'financial.manage'))) OR public.is_platform_admin());
CREATE POLICY "Users can delete invoice items on drafts" ON public.invoice_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.status = 'draft' AND (public.owns_property(i.property_id) OR public.has_property_permission(i.property_id, 'financial.manage'))) OR public.is_platform_admin());

-- property payments
CREATE POLICY "Users can view payments in authorized properties" ON public.payments FOR SELECT TO authenticated
  USING (
    public.can_access_property(property_id)
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    OR public.is_platform_admin()
  );
CREATE POLICY "Users can insert payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin());
CREATE POLICY "Users can update payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin());
CREATE POLICY "Users can delete pending payments" ON public.payments FOR DELETE TO authenticated
  USING (status = 'pending' AND (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin()));

CREATE POLICY "Users can view expenses in authorized properties" ON public.expenses FOR SELECT TO authenticated
  USING (public.can_access_property(property_id) OR public.is_platform_admin());
CREATE POLICY "Users can insert expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin());
CREATE POLICY "Users can update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin());
CREATE POLICY "Users can delete pending expenses" ON public.expenses FOR DELETE TO authenticated
  USING (status = 'pending' AND (public.owns_property(property_id) OR public.has_property_permission(property_id, 'financial.manage') OR public.is_platform_admin()));

-- maintenance
CREATE POLICY "Users can view maintenance in authorized properties" ON public.maintenance_requests FOR SELECT TO authenticated
  USING (public.can_access_property(property_id) OR assigned_to = auth.uid() OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()) OR public.is_platform_admin());
CREATE POLICY "Users can insert maintenance" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'maintenance.create') OR public.is_platform_admin());
CREATE POLICY "Users can update maintenance" ON public.maintenance_requests FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'maintenance.manage') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'maintenance.manage') OR public.is_platform_admin());
CREATE POLICY "Users can delete maintenance" ON public.maintenance_requests FOR DELETE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'maintenance.manage') OR public.is_platform_admin());

-- inspections
CREATE POLICY "Users can view inspections in authorized properties" ON public.inspections FOR SELECT TO authenticated
  USING (public.can_access_property(property_id) OR inspector_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "Users can insert inspections" ON public.inspections FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'inspection.create') OR public.is_platform_admin());
CREATE POLICY "Users can update inspections" ON public.inspections FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'inspection.manage') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'inspection.manage') OR public.is_platform_admin());
CREATE POLICY "Users can delete inspections" ON public.inspections FOR DELETE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'inspection.manage') OR public.is_platform_admin());

CREATE POLICY "Users can view inspection items for authorized properties" ON public.inspection_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND public.can_access_property(i.property_id)) OR public.is_platform_admin());
CREATE POLICY "Users can insert inspection items" ON public.inspection_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND (public.owns_property(i.property_id) OR public.has_property_permission(i.property_id, 'inspection.create'))) OR public.is_platform_admin());
CREATE POLICY "Users can update inspection items" ON public.inspection_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND (public.owns_property(i.property_id) OR public.has_property_permission(i.property_id, 'inspection.manage'))) OR public.is_platform_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND (public.owns_property(i.property_id) OR public.has_property_permission(i.property_id, 'inspection.manage'))) OR public.is_platform_admin());
CREATE POLICY "Users can delete inspection items" ON public.inspection_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND (public.owns_property(i.property_id) OR public.has_property_permission(i.property_id, 'inspection.manage'))) OR public.is_platform_admin());

-- documents
CREATE POLICY "Users can view documents in authorized properties" ON public.documents FOR SELECT TO authenticated
  USING (public.can_access_property(property_id) OR uploaded_by = auth.uid() OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()) OR public.is_platform_admin());
CREATE POLICY "Users can insert documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'document.create') OR public.is_platform_admin());
CREATE POLICY "Users can update documents" ON public.documents FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'document.manage') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'document.manage') OR public.is_platform_admin());
CREATE POLICY "Users can delete documents" ON public.documents FOR DELETE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'document.manage') OR public.is_platform_admin());

-- tasks
CREATE POLICY "Users can view tasks in authorized properties" ON public.tasks FOR SELECT TO authenticated
  USING (public.can_access_property(property_id) OR assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_platform_admin());
CREATE POLICY "Users can insert tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK ((created_by = auth.uid() OR public.is_platform_admin()) AND (public.owns_property(property_id) OR public.has_property_permission(property_id, 'task.create') OR public.is_platform_admin()));
CREATE POLICY "Users can update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'task.manage') OR public.is_platform_admin())
  WITH CHECK (public.owns_property(property_id) OR public.has_property_permission(property_id, 'task.manage') OR public.is_platform_admin());
CREATE POLICY "Users can delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (public.owns_property(property_id) OR public.has_property_permission(property_id, 'task.manage') OR public.is_platform_admin());

-- notifications: no user INSERT
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

-- activity logs: no user INSERT (use log_activity)
CREATE POLICY "Users can view activity logs for authorized properties" ON public.activity_logs FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (property_id IS NOT NULL AND public.can_access_property(property_id))
    OR (workspace_id IS NOT NULL AND public.can_access_workspace(workspace_id))
    OR public.is_platform_admin()
  );

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_property_permission(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_accessible_property_ids(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_accessible_workspace_ids(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_activity(TEXT, TEXT, UUID, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_property(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_property(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_can_read_lease(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_can_read_unit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_workspace(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_or_member_workspace(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_property_permission(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_property_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_workspace_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, UUID, UUID, UUID, JSONB) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_payments FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.subscription_events FROM authenticated, anon;
REVOKE INSERT, DELETE ON public.account_context FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.platform_admins FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.activity_logs FROM authenticated, anon;
REVOKE INSERT, DELETE ON public.notifications FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.account_context TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT SELECT, INSERT ON public.payment_proofs TO authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.platform_roles TO authenticated;
GRANT SELECT ON public.platform_role_permissions TO authenticated;
GRANT SELECT ON public.platform_user_roles TO authenticated;
GRANT SELECT ON public.team_roles TO authenticated;
GRANT SELECT ON public.team_role_permissions TO authenticated;

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow authenticated users to upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role full access to payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can access payment receipts" ON storage.objects;

CREATE POLICY "Users can upload own payment receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.subscription_payments sp
        WHERE sp.id = public.receipt_payment_id_from_path(name)
          AND sp.account_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view own payment receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.subscription_payments sp
        WHERE sp.id = public.receipt_payment_id_from_path(name)
          AND sp.account_id = auth.uid()
      )
    )
  );

CREATE POLICY "Allow service role full access to payment receipts"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'payment-receipts')
  WITH CHECK (bucket_id = 'payment-receipts');

-- -----------------------------------------------------------------------------
-- RBAC seed (permissions, platform roles, canonical system team roles)
-- -----------------------------------------------------------------------------

INSERT INTO public.permissions (key, name, description, scope, resource, action) VALUES
  ('user.view', 'View Users', 'View platform users', 'PLATFORM', 'user', 'view'),
  ('user.create', 'Create Users', 'Create platform users', 'PLATFORM', 'user', 'create'),
  ('user.update', 'Update Users', 'Update platform users', 'PLATFORM', 'user', 'update'),
  ('user.delete', 'Delete Users', 'Delete platform users', 'PLATFORM', 'user', 'delete'),
  ('platform_role.view', 'View Platform Roles', 'View platform roles', 'PLATFORM', 'platform_role', 'view'),
  ('platform_role.create', 'Create Platform Roles', 'Create platform roles', 'PLATFORM', 'platform_role', 'create'),
  ('platform_role.update', 'Update Platform Roles', 'Update platform roles', 'PLATFORM', 'platform_role', 'update'),
  ('platform_role.delete', 'Delete Platform Roles', 'Delete platform roles', 'PLATFORM', 'platform_role', 'delete'),
  ('team.view', 'View Teams', 'View workspaces/teams', 'PLATFORM', 'team', 'view'),
  ('team.create', 'Create Teams', 'Create workspaces/teams', 'PLATFORM', 'team', 'create'),
  ('team.update', 'Update Teams', 'Update workspaces/teams', 'PLATFORM', 'team', 'update'),
  ('team.delete', 'Delete Teams', 'Delete workspaces/teams', 'PLATFORM', 'team', 'delete'),
  ('team_role.view', 'View Team Roles', 'View team role definitions', 'PLATFORM', 'team_role', 'view'),
  ('team_role.create', 'Create Team Roles', 'Create system team roles', 'PLATFORM', 'team_role', 'create'),
  ('team_role.update', 'Update Team Roles', 'Update team role definitions', 'PLATFORM', 'team_role', 'update'),
  ('team_role.delete', 'Delete Team Roles', 'Delete team roles', 'PLATFORM', 'team_role', 'delete'),
  ('team_role.assign', 'Assign Team Roles', 'Assign team roles platform-wide', 'PLATFORM', 'team_role', 'assign'),
  ('subscription.view', 'View Subscriptions', 'View subscriptions', 'PLATFORM', 'subscription', 'view'),
  ('subscription.manage', 'Manage Subscriptions', 'Manage subscriptions', 'PLATFORM', 'subscription', 'manage'),
  ('billing.view', 'View Billing', 'View billing', 'PLATFORM', 'billing', 'view'),
  ('billing.manage', 'Manage Billing', 'Manage billing', 'PLATFORM', 'billing', 'manage'),
  ('audit.view', 'View Audit Logs', 'View audit logs', 'PLATFORM', 'audit', 'view'),
  ('platform.settings.view', 'View Platform Settings', 'View platform settings', 'PLATFORM', 'platform.settings', 'view'),
  ('platform.settings.update', 'Update Platform Settings', 'Update platform settings', 'PLATFORM', 'platform.settings', 'update'),
  ('team.admin_access', 'Team Admin Access', 'Administrative access to workspaces', 'PLATFORM', 'team', 'admin_access'),
  ('team.data.view', 'View Team Data', 'View workspace data as admin', 'PLATFORM', 'team', 'data.view'),
  ('team.data.manage', 'Manage Team Data', 'Manage workspace data as admin', 'PLATFORM', 'team', 'data.manage'),
  ('team.impersonate', 'Impersonate Users', 'Impersonate workspace users', 'PLATFORM', 'team', 'impersonate'),
  ('property.view', 'View Properties', 'View properties', 'TEAM', 'property', 'view'),
  ('property.create', 'Create Properties', 'Create properties', 'TEAM', 'property', 'create'),
  ('property.update', 'Update Properties', 'Update properties', 'TEAM', 'property', 'update'),
  ('property.delete', 'Delete Properties', 'Delete properties', 'TEAM', 'property', 'delete'),
  ('tenant.view', 'View Tenants', 'View tenants', 'TEAM', 'tenant', 'view'),
  ('tenant.create', 'Create Tenants', 'Create tenants', 'TEAM', 'tenant', 'create'),
  ('tenant.update', 'Update Tenants', 'Update tenants', 'TEAM', 'tenant', 'update'),
  ('tenant.delete', 'Delete Tenants', 'Delete tenants', 'TEAM', 'tenant', 'delete'),
  ('lease.view', 'View Leases', 'View leases', 'TEAM', 'lease', 'view'),
  ('lease.create', 'Create Leases', 'Create leases', 'TEAM', 'lease', 'create'),
  ('lease.update', 'Update Leases', 'Update leases', 'TEAM', 'lease', 'update'),
  ('lease.delete', 'Delete Leases', 'Delete leases', 'TEAM', 'lease', 'delete'),
  ('invoice.view', 'View Invoices', 'View invoices', 'TEAM', 'invoice', 'view'),
  ('invoice.create', 'Create Invoices', 'Create invoices', 'TEAM', 'invoice', 'create'),
  ('invoice.update', 'Update Invoices', 'Update invoices', 'TEAM', 'invoice', 'update'),
  ('invoice.delete', 'Delete Invoices', 'Delete invoices', 'TEAM', 'invoice', 'delete'),
  ('payment.view', 'View Payments', 'View payments', 'TEAM', 'payment', 'view'),
  ('payment.create', 'Create Payments', 'Create payments', 'TEAM', 'payment', 'create'),
  ('payment.update', 'Update Payments', 'Update payments', 'TEAM', 'payment', 'update'),
  ('payment.delete', 'Delete Payments', 'Delete payments', 'TEAM', 'payment', 'delete'),
  ('expense.view', 'View Expenses', 'View expenses', 'TEAM', 'expense', 'view'),
  ('expense.create', 'Create Expenses', 'Create expenses', 'TEAM', 'expense', 'create'),
  ('expense.update', 'Update Expenses', 'Update expenses', 'TEAM', 'expense', 'update'),
  ('expense.delete', 'Delete Expenses', 'Delete expenses', 'TEAM', 'expense', 'delete'),
  ('maintenance.view', 'View Maintenance', 'View maintenance requests', 'TEAM', 'maintenance', 'view'),
  ('maintenance.create', 'Create Maintenance', 'Create maintenance requests', 'TEAM', 'maintenance', 'create'),
  ('maintenance.update', 'Update Maintenance', 'Update maintenance requests', 'TEAM', 'maintenance', 'update'),
  ('maintenance.delete', 'Delete Maintenance', 'Delete maintenance requests', 'TEAM', 'maintenance', 'delete'),
  ('maintenance.assign', 'Assign Maintenance', 'Assign maintenance requests', 'TEAM', 'maintenance', 'assign'),
  ('inspection.view', 'View Inspections', 'View inspections', 'TEAM', 'inspection', 'view'),
  ('inspection.create', 'Create Inspections', 'Create inspections', 'TEAM', 'inspection', 'create'),
  ('inspection.update', 'Update Inspections', 'Update inspections', 'TEAM', 'inspection', 'update'),
  ('inspection.delete', 'Delete Inspections', 'Delete inspections', 'TEAM', 'inspection', 'delete'),
  ('document.view', 'View Documents', 'View documents', 'TEAM', 'document', 'view'),
  ('document.create', 'Create Documents', 'Create documents', 'TEAM', 'document', 'create'),
  ('document.update', 'Update Documents', 'Update documents', 'TEAM', 'document', 'update'),
  ('document.delete', 'Delete Documents', 'Delete documents', 'TEAM', 'document', 'delete'),
  ('task.view', 'View Tasks', 'View tasks', 'TEAM', 'task', 'view'),
  ('task.create', 'Create Tasks', 'Create tasks', 'TEAM', 'task', 'create'),
  ('task.update', 'Update Tasks', 'Update tasks', 'TEAM', 'task', 'update'),
  ('task.delete', 'Delete Tasks', 'Delete tasks', 'TEAM', 'task', 'delete'),
  ('team.member.view', 'View Members', 'View team members', 'TEAM', 'team.member', 'view'),
  ('team.member.invite', 'Invite Members', 'Invite team members', 'TEAM', 'team.member', 'invite'),
  ('team.member.update', 'Update Members', 'Update team members', 'TEAM', 'team.member', 'update'),
  ('team.member.remove', 'Remove Members', 'Remove team members', 'TEAM', 'team.member', 'remove'),
  ('team.settings.view', 'View Settings', 'View workspace settings', 'TEAM', 'team.settings', 'view'),
  ('team.settings.update', 'Update Settings', 'Update workspace settings', 'TEAM', 'team.settings', 'update'),
  ('team.role.view', 'View Roles', 'View team roles', 'TEAM', 'team.role', 'view'),
  ('team.role.assign', 'Assign Roles', 'Assign team roles', 'TEAM', 'team.role', 'assign'),
  ('team.role.create', 'Create Roles', 'Create custom team roles', 'TEAM', 'team.role', 'create'),
  ('team.role.update', 'Update Roles', 'Update custom team roles', 'TEAM', 'team.role', 'update'),
  ('team.role.delete', 'Delete Roles', 'Delete custom team roles', 'TEAM', 'team.role', 'delete')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_roles (name, description, is_system_role) VALUES
  ('Super Admin', 'Full platform access', true),
  ('Support Admin', 'Customer support operations', true),
  ('Billing Admin', 'Billing and subscription management', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.platform_role_permissions (role_id, permission_id)
SELECT pr.id, p.id
FROM public.platform_roles pr
CROSS JOIN public.permissions p
WHERE pr.name = 'Super Admin' AND p.scope = 'PLATFORM'
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_role_permissions (role_id, permission_id)
SELECT pr.id, p.id
FROM public.platform_roles pr
CROSS JOIN public.permissions p
WHERE pr.name = 'Support Admin'
  AND p.key IN ('user.view', 'team.view', 'team.admin_access', 'team.data.view', 'audit.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_role_permissions (role_id, permission_id)
SELECT pr.id, p.id
FROM public.platform_roles pr
CROSS JOIN public.permissions p
WHERE pr.name = 'Billing Admin'
  AND p.key IN ('subscription.view', 'subscription.manage', 'billing.view', 'billing.manage', 'audit.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.team_roles (workspace_id, name, description, is_system_role)
SELECT v.workspace_id, v.name, v.description, v.is_system_role
FROM (VALUES
  (NULL::UUID, 'Owner', 'Full workspace control', true),
  (NULL::UUID, 'Admin', 'Administrative workspace access', true),
  (NULL::UUID, 'Manager', 'Operational management', true),
  (NULL::UUID, 'Viewer', 'Read-only workspace access', true),
  (NULL::UUID, 'Landlord', 'Property owner access', true)
) AS v(workspace_id, name, description, is_system_role)
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_roles tr
  WHERE tr.workspace_id IS NULL AND lower(tr.name) = lower(v.name)
);

INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.name = 'Owner' AND tr.workspace_id IS NULL AND p.scope = 'TEAM'
ON CONFLICT DO NOTHING;

INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.name = 'Admin' AND tr.workspace_id IS NULL AND p.scope = 'TEAM'
  AND p.key NOT IN ('team.role.create', 'team.role.delete')
ON CONFLICT DO NOTHING;

INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.name = 'Manager' AND tr.workspace_id IS NULL AND p.scope = 'TEAM'
  AND p.key IN (
    'property.view','property.create','property.update',
    'tenant.view','tenant.create','tenant.update',
    'lease.view','lease.create','lease.update',
    'invoice.view','invoice.create','invoice.update',
    'payment.view','payment.create','payment.update',
    'expense.view','expense.create','expense.update',
    'maintenance.view','maintenance.create','maintenance.update','maintenance.assign',
    'inspection.view','inspection.create','inspection.update',
    'document.view','document.create','document.update',
    'task.view','task.create','task.update',
    'team.member.view','team.member.invite','team.member.update',
    'team.settings.view','team.role.view','team.role.assign'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.name = 'Viewer' AND tr.workspace_id IS NULL AND p.scope = 'TEAM'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.name = 'Landlord' AND tr.workspace_id IS NULL AND p.scope = 'TEAM'
  AND p.key IN (
    'property.view','property.create','property.update','property.delete',
    'tenant.view','tenant.create','tenant.update',
    'lease.view','lease.create','lease.update',
    'invoice.view','payment.view','expense.view',
    'maintenance.view','inspection.view','document.view','task.view',
    'team.member.view','team.settings.view'
  )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Production catalog seed (plans + entitlements — prices unchanged)
-- -----------------------------------------------------------------------------

INSERT INTO public.subscription_plans (id, name, slug, description, status, display_order, price_cents, billing_interval)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Free', 'free', 'Ideal for getting started with basic property tracking.', 'active', 1, 0, 'monthly'),
  ('00000000-0000-0000-0000-000000000002', 'Pro', 'pro', 'For active landlords and real estate investors needing full features.', 'active', 2, 2900, 'monthly'),
  ('00000000-0000-0000-0000-000000000003', 'Business', 'business', 'For property managers and enterprise scale real estate teams.', 'active', 3, 9900, 'monthly'),
  ('00000000-0000-0000-0000-000000000004', 'Landlord', 'landlord', 'For individual real estate investors managing their portfolio.', 'active', 2, 2900, 'monthly'),
  ('00000000-0000-0000-0000-000000000005', 'Property Manager', 'manager', 'For growing portfolios and professional property managers.', 'active', 3, 7900, 'monthly')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  updated_at = NOW();

INSERT INTO public.entitlements (id, key, name, description, value_type)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'properties.max', 'Maximum Properties', 'Maximum number of managed properties allowed', 'number'),
  ('10000000-0000-0000-0000-000000000002', 'reports.enabled', 'Standard Reports', 'Access to basic financial and tenant reports', 'boolean'),
  ('10000000-0000-0000-0000-000000000003', 'advanced_reports.enabled', 'Advanced Analytics', 'Access to AI insights, export data, and custom reports', 'boolean'),
  ('10000000-0000-0000-0000-000000000004', 'team_members.max', 'Maximum Team Members', 'Maximum number of team seats allowed', 'number')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type,
  updated_at = NOW();

INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
VALUES
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'false'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'false'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '1'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '25'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '5'::jsonb),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '500'::jsonb),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '50'::jsonb),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '5'::jsonb),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'false'::jsonb),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '2'::jsonb),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '50'::jsonb),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', '10'::jsonb)
ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
