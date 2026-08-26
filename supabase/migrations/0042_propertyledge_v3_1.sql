-- =============================================================================
-- PropertyLedge V3.1 — incremental migration (apply to existing V3)
-- Canonical copy: also shipped as /propertyledge_v3_1.sql
--
-- Preserves V3 tables and catalog. Product language:
--   Workspace = renamed from organizations / organization_members
--   Property member = property_members (authorization gate)
-- Workspace membership alone does NOT grant property data access.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- platform_admins
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.platform_admins ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE INDEX IF NOT EXISTS idx_platform_admins_status ON public.platform_admins(status);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins FORCE ROW LEVEL SECURITY;

INSERT INTO public.platform_admins (user_id, status, created_by, notes)
SELECT u.id, 'active', u.id, 'Imported from raw_app_meta_data.role=admin'
FROM auth.users u
WHERE COALESCE(u.raw_app_meta_data->>'role', '') = 'admin'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.auth_is_service_role()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(auth.role(), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid() AND pa.status = 'active'
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Rename organization → workspace (in-place; data preserved)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.organizations') IS NOT NULL AND to_regclass('public.workspaces') IS NULL THEN
    ALTER TABLE public.organizations RENAME TO workspaces;
  END IF;
  IF to_regclass('public.organization_members') IS NOT NULL AND to_regclass('public.workspace_members') IS NULL THEN
    ALTER TABLE public.organization_members RENAME TO workspace_members;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspace_members' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.workspace_members RENAME COLUMN organization_id TO workspace_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.properties RENAME COLUMN organization_id TO workspace_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.activity_logs RENAME COLUMN organization_id TO workspace_id;
  END IF;
END $$;

ALTER INDEX IF EXISTS idx_organizations_owner_id RENAME TO idx_workspaces_owner_id;
ALTER INDEX IF EXISTS idx_organizations_slug RENAME TO idx_workspaces_slug;
ALTER INDEX IF EXISTS idx_organization_members_org_id RENAME TO idx_workspace_members_workspace_id;
ALTER INDEX IF EXISTS idx_organization_members_user_id RENAME TO idx_workspace_members_user_id;
ALTER INDEX IF EXISTS idx_properties_org_id RENAME TO idx_properties_workspace_id;
ALTER INDEX IF EXISTS idx_activity_logs_org_id RENAME TO idx_activity_logs_workspace_id;

ALTER TABLE public.workspace_members ALTER COLUMN role SET DEFAULT 'viewer';

-- -----------------------------------------------------------------------------
-- Billing uniqueness + composite FKs
-- -----------------------------------------------------------------------------
UPDATE public.subscription_payments sp
SET account_id = s.account_id, updated_at = NOW()
FROM public.subscriptions s
WHERE sp.subscription_id = s.id AND sp.account_id IS DISTINCT FROM s.account_id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY account_id ORDER BY updated_at DESC, created_at DESC) rn
  FROM public.subscriptions WHERE status IN ('trialing', 'active', 'past_due', 'paused')
)
UPDATE public.subscriptions s SET status = 'expired', updated_at = NOW()
FROM ranked r WHERE s.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY account_id ORDER BY updated_at DESC, created_at DESC) rn
  FROM public.subscriptions WHERE status IN ('pending_payment', 'under_review')
)
UPDATE public.subscriptions s
SET status = 'canceled', canceled_at = COALESCE(s.canceled_at, NOW()), updated_at = NOW()
FROM ranked r WHERE s.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_one_entitlement_current
  ON public.subscriptions (account_id)
  WHERE status IN ('trialing', 'active', 'past_due', 'paused');
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_one_checkout_current
  ON public.subscriptions (account_id)
  WHERE status IN ('pending_payment', 'under_review');
DROP INDEX IF EXISTS uq_subscriptions_one_current_per_account;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_subscriptions_id_account') THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT uq_subscriptions_id_account UNIQUE (id, account_id);
  END IF;
END $$;

ALTER TABLE public.subscription_payments DROP CONSTRAINT IF EXISTS fk_subscription_payments_sub_account;
ALTER TABLE public.subscription_payments DROP CONSTRAINT IF EXISTS fk_sub_payments_sub_account;
ALTER TABLE public.subscription_payments
  ADD CONSTRAINT fk_subscription_payments_sub_account
  FOREIGN KEY (subscription_id, account_id) REFERENCES public.subscriptions (id, account_id) ON DELETE CASCADE;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_units_id_property') THEN
    ALTER TABLE public.units ADD CONSTRAINT uq_units_id_property UNIQUE (id, property_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenants_id_property') THEN
    ALTER TABLE public.tenants ADD CONSTRAINT uq_tenants_id_property UNIQUE (id, property_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_leases_id_property') THEN
    ALTER TABLE public.leases ADD CONSTRAINT uq_leases_id_property UNIQUE (id, property_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_invoices_id_property') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT uq_invoices_id_property UNIQUE (id, property_id);
  END IF;
END $$;

ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS fk_leases_unit_prop;
ALTER TABLE public.leases ADD CONSTRAINT fk_leases_unit_prop
  FOREIGN KEY (unit_id, property_id) REFERENCES public.units (id, property_id) ON DELETE SET NULL;
ALTER TABLE public.lease_tenants DROP CONSTRAINT IF EXISTS fk_lease_tenants_lease_prop;
ALTER TABLE public.lease_tenants ADD CONSTRAINT fk_lease_tenants_lease_prop
  FOREIGN KEY (lease_id, property_id) REFERENCES public.leases (id, property_id) ON DELETE CASCADE;
ALTER TABLE public.lease_tenants DROP CONSTRAINT IF EXISTS fk_lease_tenants_tenant_prop;
ALTER TABLE public.lease_tenants ADD CONSTRAINT fk_lease_tenants_tenant_prop
  FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants (id, property_id) ON DELETE RESTRICT;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_unit_prop;
ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_unit_prop
  FOREIGN KEY (unit_id, property_id) REFERENCES public.units (id, property_id) ON DELETE SET NULL;

UPDATE public.invoices SET total_amount = subtotal + tax_amount
WHERE total_amount IS DISTINCT FROM (subtotal + tax_amount);
UPDATE public.invoices SET balance_due = total_amount WHERE balance_due > total_amount;
UPDATE public.invoice_items SET amount = round(quantity * unit_price, 2)
WHERE amount IS DISTINCT FROM round(quantity * unit_price, 2);

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_totals;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_total;
ALTER TABLE public.invoices ADD CONSTRAINT chk_invoice_totals CHECK (total_amount = subtotal + tax_amount);
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS chk_invoice_balance;
ALTER TABLE public.invoices ADD CONSTRAINT chk_invoice_balance CHECK (balance_due <= total_amount);
ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS chk_invoice_item_amount;
ALTER TABLE public.invoice_items ADD CONSTRAINT chk_invoice_item_amount CHECK (amount = round(quantity * unit_price, 2));
ALTER TABLE public.payment_proofs DROP CONSTRAINT IF EXISTS chk_payment_proofs_mime;
ALTER TABLE public.payment_proofs ADD CONSTRAINT chk_payment_proofs_mime
  CHECK (mime_type IN ('application/pdf', 'image/png', 'image/jpeg', 'image/jpg'));
ALTER TABLE public.payment_proofs DROP CONSTRAINT IF EXISTS chk_payment_proofs_size;
ALTER TABLE public.payment_proofs ADD CONSTRAINT chk_payment_proofs_size CHECK (file_size > 0 AND file_size <= 5242880);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owns_property(p_property_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.can_access_property(p_property_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.owns_property(p_property_id) OR EXISTS (
    SELECT 1 FROM public.property_members
    WHERE property_id = p_property_id AND user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_workspace(p_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id AND (
      w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid() AND wm.status = 'active'
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_organization(p_organization_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_access_workspace(p_organization_id);
$$;

CREATE OR REPLACE FUNCTION public.has_property_permission(p_property_id UUID, p_permission TEXT, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID; v_role TEXT; v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN FALSE; END IF;
  IF v_user IS DISTINCT FROM auth.uid() AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN
    RETURN FALSE;
  END IF;
  SELECT owner_id INTO v_owner FROM public.properties WHERE id = p_property_id;
  IF v_owner IS NULL THEN RETURN FALSE; END IF;
  IF v_owner = v_user THEN RETURN TRUE; END IF;
  SELECT role INTO v_role FROM public.property_members
  WHERE property_id = p_property_id AND user_id = v_user AND status = 'active';
  IF v_role IS NULL THEN RETURN FALSE; END IF;
  CASE p_permission
    WHEN 'property.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'property.update' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'property.delete' THEN RETURN v_role = 'owner';
    WHEN 'team.invite' THEN RETURN v_role IN ('owner','manager');
    WHEN 'team.manage_members' THEN RETURN v_role IN ('owner','manager');
    WHEN 'team.remove' THEN RETURN v_role IN ('owner','manager');
    WHEN 'team.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'tenant.create' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'tenant.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'tenant.update' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'lease.create' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'lease.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'lease.update' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'financial.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'financial.manage' THEN RETURN v_role IN ('owner','manager');
    WHEN 'maintenance.create' THEN RETURN v_role IN ('owner','manager','agent','staff');
    WHEN 'maintenance.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'maintenance.manage' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'inspection.create' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'inspection.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'document.create' THEN RETURN v_role IN ('owner','manager','agent','staff');
    WHEN 'document.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'task.create' THEN RETURN v_role IN ('owner','manager','agent','staff');
    WHEN 'task.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'reports.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    ELSE RETURN FALSE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_property(p_property_id UUID, p_permission TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin() OR public.owns_property(p_property_id)
      OR public.has_property_permission(p_property_id, p_permission);
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_property_ids(p_user_id UUID DEFAULT NULL)
RETURNS SETOF UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF v_user IS DISTINCT FROM auth.uid() AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id FROM public.properties p WHERE p.owner_id = v_user AND p.status = 'active'
  UNION
  SELECT pm.property_id FROM public.property_members pm
  JOIN public.properties p ON pm.property_id = p.id
  WHERE pm.user_id = v_user AND pm.status = 'active' AND p.status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_workspace_ids(p_user_id UUID DEFAULT NULL)
RETURNS SETOF UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF v_user IS DISTINCT FROM auth.uid() AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT w.id FROM public.workspaces w WHERE w.owner_id = v_user AND w.status = 'active'
  UNION
  SELECT wm.workspace_id FROM public.workspace_members wm
  JOIN public.workspaces w ON wm.workspace_id = w.id
  WHERE wm.user_id = v_user AND wm.status = 'active' AND w.status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_organization_ids(p_user_id UUID DEFAULT NULL)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_user_accessible_workspace_ids(p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.owns_subscription_payment(p_payment_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscription_payments WHERE id = p_payment_id AND account_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.payment_id_from_storage_path(p_name TEXT)
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE part1 TEXT; part2 TEXT; candidate TEXT;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN RETURN NULL; END IF;
  part1 := split_part(p_name, '/', 1); part2 := split_part(p_name, '/', 2);
  IF part2 IS NULL OR part2 = '' THEN RETURN NULL; END IF;
  IF part1 = 'receipts' THEN
    IF split_part(p_name, '/', 3) = '' THEN RETURN NULL; END IF;
    candidate := part2;
  ELSE candidate := part1; END IF;
  BEGIN RETURN candidate::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN NULL; END;
END;
$$;

CREATE OR REPLACE FUNCTION public.receipt_payment_id_from_path(p_name TEXT)
RETURNS UUID LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.payment_id_from_storage_path(p_name);
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_activity_log_modification()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Forbidden: Activity logs are append-only'; END; $$;
DROP TRIGGER IF EXISTS trg_prevent_activity_log_modification ON public.activity_logs;
CREATE TRIGGER trg_prevent_activity_log_modification
  BEFORE UPDATE OR DELETE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_activity_log_modification();

CREATE OR REPLACE FUNCTION public.protect_account_context_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN NEW.updated_at := NOW(); RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.first_login_at IS DISTINCT FROM OLD.first_login_at
     OR NEW.last_login_at IS DISTINCT FROM OLD.last_login_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: account_context server fields are not client-writable';
  END IF;
  NEW.updated_at := NOW(); RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_account_context ON public.account_context;
CREATE TRIGGER trg_protect_account_context BEFORE UPDATE ON public.account_context
  FOR EACH ROW EXECUTE FUNCTION public.protect_account_context_fields();

CREATE OR REPLACE FUNCTION public.enforce_property_owner_in_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = NEW.workspace_id AND (
      w.owner_id = NEW.owner_id OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = NEW.workspace_id AND wm.user_id = NEW.owner_id AND wm.status = 'active'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Property owner must belong to the workspace';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_property_owner_in_workspace ON public.properties;
CREATE TRIGGER trg_property_owner_in_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, owner_id ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_owner_in_workspace();

CREATE OR REPLACE FUNCTION public.protect_child_property_id()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.property_id IS DISTINCT FROM OLD.property_id
     AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: property_id cannot be changed by clients';
  END IF;
  RETURN NEW;
END; $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['units','tenants','leases','invoices','payments','expenses','maintenance_requests','inspections','documents','tasks']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_protect_%s_property ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_protect_%s_property BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.protect_child_property_id()', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.protect_created_by()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid();
    ELSIF NEW.created_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Forbidden: created_by must equal the authenticated user';
    END IF;
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Forbidden: created_by is immutable';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_leases_created_by ON public.leases;
CREATE TRIGGER trg_leases_created_by BEFORE INSERT OR UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.protect_created_by();
DROP TRIGGER IF EXISTS trg_invoices_created_by ON public.invoices;
CREATE TRIGGER trg_invoices_created_by BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.protect_created_by();
DROP TRIGGER IF EXISTS trg_payments_created_by ON public.payments;
CREATE TRIGGER trg_payments_created_by BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.protect_created_by();
DROP TRIGGER IF EXISTS trg_expenses_created_by ON public.expenses;
CREATE TRIGGER trg_expenses_created_by BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.protect_created_by();

CREATE OR REPLACE FUNCTION public.enforce_rent_payment_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
     OR NEW.lease_id IS DISTINCT FROM OLD.lease_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Forbidden: payment ownership fields are not client-writable';
  END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'pending' AND NEW.status IN ('completed','failed') THEN RETURN NEW; END IF;
  IF OLD.status = 'failed' AND NEW.status = 'pending' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Forbidden: invalid payment status transition % → %', OLD.status, NEW.status;
END; $$;
DROP TRIGGER IF EXISTS trg_rent_payment_lifecycle ON public.payments;
CREATE TRIGGER trg_rent_payment_lifecycle BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rent_payment_lifecycle();

CREATE OR REPLACE FUNCTION public.protect_subscription_payment_client()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  RAISE EXCEPTION 'Forbidden: subscription_payments may only be mutated by trusted server/admin paths';
END; $$;
DROP TRIGGER IF EXISTS trg_protect_subscription_payments ON public.subscription_payments;
CREATE TRIGGER trg_protect_subscription_payments BEFORE UPDATE OR DELETE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_payment_client();

CREATE OR REPLACE FUNCTION public.protect_notifications_read_state()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.type IS DISTINCT FROM OLD.type OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: only notification read_at may be updated by clients';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_notifications ON public.notifications;
CREATE TRIGGER trg_protect_notifications BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_notifications_read_state();

CREATE OR REPLACE FUNCTION public.protect_platform_admins_mutations()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.auth_is_service_role() OR current_user IN ('postgres','supabase_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Forbidden: platform_admins may only be changed via service_role';
END; $$;
DROP TRIGGER IF EXISTS trg_protect_platform_admins ON public.platform_admins;
CREATE TRIGGER trg_protect_platform_admins BEFORE INSERT OR UPDATE OR DELETE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.protect_platform_admins_mutations();

CREATE OR REPLACE FUNCTION public.ensure_single_current_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('trialing','active','past_due','paused') THEN
    UPDATE public.subscriptions SET status = 'expired', updated_at = NOW()
    WHERE account_id = NEW.account_id AND id IS DISTINCT FROM NEW.id
      AND status IN ('trialing','active','past_due','paused');
  ELSIF NEW.status IN ('pending_payment','under_review') THEN
    UPDATE public.subscriptions SET status = 'canceled', canceled_at = COALESCE(canceled_at, NOW()), updated_at = NOW()
    WHERE account_id = NEW.account_id AND id IS DISTINCT FROM NEW.id
      AND status IN ('pending_payment','under_review');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_ensure_single_current_subscription ON public.subscriptions;
CREATE TRIGGER trg_ensure_single_current_subscription
  BEFORE INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_current_subscription();

CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT, p_entity_type TEXT, p_entity_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL, p_workspace_id UUID DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL AND NOT public.auth_is_service_role() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_action IS NULL OR btrim(p_action) = '' THEN RAISE EXCEPTION 'action is required'; END IF;
  IF upper(p_action) LIKE 'ADMIN_%' AND NOT public.is_platform_admin() AND NOT public.auth_is_service_role() THEN
    RAISE EXCEPTION 'Forbidden: cannot record administrative actions';
  END IF;
  IF p_property_id IS NOT NULL AND NOT public.can_access_property(p_property_id)
     AND NOT public.is_platform_admin() AND NOT public.auth_is_service_role() THEN
    RAISE EXCEPTION 'Forbidden: no access to property';
  END IF;
  IF p_workspace_id IS NOT NULL AND NOT public.can_access_workspace(p_workspace_id)
     AND NOT public.is_platform_admin() AND NOT public.auth_is_service_role() THEN
    RAISE EXCEPTION 'Forbidden: no access to workspace';
  END IF;
  INSERT INTO public.activity_logs (workspace_id, property_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_workspace_id, p_property_id,
    CASE WHEN public.auth_is_service_role() THEN NULL ELSE auth.uid() END,
    p_action, p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE free_plan_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, created_at, updated_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'phone',
          NEW.raw_user_meta_data->>'avatar_url', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW();
  INSERT INTO public.account_context (user_id, status, onboarding_status, created_at, updated_at)
  VALUES (NEW.id, 'active', 'completed', NOW(), NOW()) ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  IF free_plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE account_id = NEW.id
      AND status IN ('trialing','active','past_due','paused')
  ) THEN
    INSERT INTO public.subscriptions (account_id, plan_id, status) VALUES (NEW.id, free_plan_id, 'active');
  END IF;
  RETURN NEW;
END; $$;

-- -----------------------------------------------------------------------------
-- Drop old policies (names from V3)
-- -----------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT pol.polname AS pname, c.relname AS tname
           FROM pg_policy pol JOIN pg_class c ON c.oid = pol.polrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pname, r.tname);
  END LOOP;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to upload payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to view payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Allow service role full access to payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload own payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Platform admins can access payment receipts" ON storage.objects;
  DROP POLICY IF EXISTS "receipts_insert_own" ON storage.objects;
  DROP POLICY IF EXISTS "receipts_select_own" ON storage.objects;
  DROP POLICY IF EXISTS "receipts_update_own" ON storage.objects;
  DROP POLICY IF EXISTS "receipts_delete_own" ON storage.objects;
  DROP POLICY IF EXISTS "receipts_service" ON storage.objects;
END $$;

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------
CREATE POLICY "platform_admins_select_own" ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "platform_admins_select_admin" ON public.platform_admins FOR SELECT TO authenticated USING (public.is_platform_admin());

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated USING (public.is_platform_admin());

CREATE POLICY "account_select_own" ON public.account_context FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "account_update_own" ON public.account_context FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "account_select_admin" ON public.account_context FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "account_update_admin" ON public.account_context FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "plans_select_active" ON public.subscription_plans FOR SELECT USING (status = 'active' OR public.is_platform_admin() OR public.auth_is_service_role());
CREATE POLICY "plans_admin_ins" ON public.subscription_plans FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "plans_admin_upd" ON public.subscription_plans FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "plans_admin_del" ON public.subscription_plans FOR DELETE TO authenticated USING (public.is_platform_admin());

CREATE POLICY "entitlements_select" ON public.entitlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "entitlements_admin_ins" ON public.entitlements FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "entitlements_admin_upd" ON public.entitlements FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "entitlements_admin_del" ON public.entitlements FOR DELETE TO authenticated USING (public.is_platform_admin());
CREATE POLICY "plan_entitlements_select" ON public.plan_entitlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "plan_entitlements_admin_ins" ON public.plan_entitlements FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "plan_entitlements_admin_upd" ON public.plan_entitlements FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "plan_entitlements_admin_del" ON public.plan_entitlements FOR DELETE TO authenticated USING (public.is_platform_admin());

CREATE POLICY "subs_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = account_id OR public.is_platform_admin());
CREATE POLICY "subs_admin_ins" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "subs_admin_upd" ON public.subscriptions FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "subs_admin_del" ON public.subscriptions FOR DELETE TO authenticated USING (public.is_platform_admin());

CREATE POLICY "sub_events_admin" ON public.subscription_events FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "audit_admin_sel" ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "audit_admin_ins" ON public.admin_audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin() AND admin_user_id = auth.uid());

CREATE POLICY "subpay_select_own" ON public.subscription_payments FOR SELECT TO authenticated USING (auth.uid() = account_id OR public.is_platform_admin());
CREATE POLICY "subpay_admin_ins" ON public.subscription_payments FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "subpay_admin_upd" ON public.subscription_payments FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY "proofs_select_own" ON public.payment_proofs FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.subscription_payments sp WHERE sp.id = payment_id AND sp.account_id = auth.uid()));
CREATE POLICY "proofs_insert_own" ON public.payment_proofs FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.subscription_payments sp WHERE sp.id = payment_id AND sp.account_id = auth.uid()));

CREATE POLICY "email_admin" ON public.email_events FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "email_own" ON public.email_events FOR SELECT TO authenticated USING (auth.jwt() ->> 'email' = recipient);

CREATE POLICY "ws_select" ON public.workspaces FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.can_access_workspace(id) OR public.is_platform_admin());
CREATE POLICY "ws_insert" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ws_update" ON public.workspaces FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_platform_admin()) WITH CHECK (owner_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "wsm_select" ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()) OR public.is_platform_admin());
CREATE POLICY "wsm_insert" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));
CREATE POLICY "wsm_update" ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));
CREATE POLICY "wsm_delete" ON public.workspace_members FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "prop_select" ON public.properties FOR SELECT TO authenticated
  USING (public.can_access_property(id) OR public.is_platform_admin());
CREATE POLICY "prop_insert" ON public.properties FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.can_access_workspace(workspace_id));
CREATE POLICY "prop_update" ON public.properties FOR UPDATE TO authenticated
  USING (public.can_write_property(id, 'property.update')) WITH CHECK (public.can_write_property(id, 'property.update'));
CREATE POLICY "prop_delete" ON public.properties FOR DELETE TO authenticated
  USING (public.owns_property(id) OR public.is_platform_admin());

CREATE POLICY "pm_select" ON public.property_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.owns_property(property_id) OR public.has_property_permission(property_id,'team.view') OR public.is_platform_admin());
CREATE POLICY "pm_insert" ON public.property_members FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'team.manage_members'));
CREATE POLICY "pm_update" ON public.property_members FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'team.manage_members')) WITH CHECK (public.can_write_property(property_id,'team.manage_members'));
CREATE POLICY "pm_delete" ON public.property_members FOR DELETE TO authenticated USING (public.can_write_property(property_id,'team.manage_members'));

CREATE POLICY "units_select" ON public.units FOR SELECT TO authenticated USING (public.can_access_property(property_id) OR public.is_platform_admin());
CREATE POLICY "units_insert" ON public.units FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'property.update'));
CREATE POLICY "units_update" ON public.units FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'property.update')) WITH CHECK (public.can_write_property(property_id,'property.update'));
CREATE POLICY "units_delete" ON public.units FOR DELETE TO authenticated USING (public.can_write_property(property_id,'property.update'));

CREATE POLICY "tenants_select" ON public.tenants FOR SELECT TO authenticated USING (public.can_access_property(property_id) OR user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'tenant.update'));
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'tenant.update')) WITH CHECK (public.can_write_property(property_id,'tenant.update'));
CREATE POLICY "tenants_delete" ON public.tenants FOR DELETE TO authenticated USING (public.can_write_property(property_id,'tenant.update'));

CREATE POLICY "leases_select" ON public.leases FOR SELECT TO authenticated USING (public.can_access_property(property_id) OR public.is_platform_admin());
CREATE POLICY "leases_insert" ON public.leases FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'lease.update'));
CREATE POLICY "leases_update" ON public.leases FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'lease.update')) WITH CHECK (public.can_write_property(property_id,'lease.update'));
CREATE POLICY "leases_delete" ON public.leases FOR DELETE TO authenticated USING (public.can_write_property(property_id,'lease.update'));

CREATE POLICY "lt_select" ON public.lease_tenants FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND public.can_access_property(l.property_id)));
CREATE POLICY "lt_insert" ON public.lease_tenants FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND public.can_write_property(l.property_id,'lease.update')));
CREATE POLICY "lt_update" ON public.lease_tenants FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND public.can_write_property(l.property_id,'lease.update')))
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND public.can_write_property(l.property_id,'lease.update')));
CREATE POLICY "lt_delete" ON public.lease_tenants FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND public.can_write_property(l.property_id,'lease.update')));

CREATE POLICY "inv_select" ON public.invoices FOR SELECT TO authenticated USING (public.can_access_property(property_id) OR public.is_platform_admin());
CREATE POLICY "inv_insert" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'financial.manage'));
CREATE POLICY "inv_update" ON public.invoices FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'financial.manage')) WITH CHECK (public.can_write_property(property_id,'financial.manage'));
CREATE POLICY "inv_delete_draft" ON public.invoices FOR DELETE TO authenticated USING (status = 'draft' AND public.can_write_property(property_id,'financial.manage'));

CREATE POLICY "invitem_select" ON public.invoice_items FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.can_access_property(i.property_id)));
CREATE POLICY "invitem_insert" ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.can_write_property(i.property_id,'financial.manage')));
CREATE POLICY "invitem_update" ON public.invoice_items FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.can_write_property(i.property_id,'financial.manage')))
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.can_write_property(i.property_id,'financial.manage')));
CREATE POLICY "invitem_delete_draft" ON public.invoice_items FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.status = 'draft' AND public.can_write_property(i.property_id,'financial.manage')));

CREATE POLICY "pay_select" ON public.payments FOR SELECT TO authenticated USING (public.can_access_property(property_id) OR public.is_platform_admin());
CREATE POLICY "pay_insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'financial.manage'));
CREATE POLICY "pay_update" ON public.payments FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'financial.manage')) WITH CHECK (public.can_write_property(property_id,'financial.manage'));
CREATE POLICY "pay_delete_pending" ON public.payments FOR DELETE TO authenticated USING (status = 'pending' AND public.can_write_property(property_id,'financial.manage'));

CREATE POLICY "exp_select" ON public.expenses FOR SELECT TO authenticated USING (public.can_access_property(property_id) OR public.is_platform_admin());
CREATE POLICY "exp_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'financial.manage'));
CREATE POLICY "exp_update" ON public.expenses FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'financial.manage')) WITH CHECK (public.can_write_property(property_id,'financial.manage'));
CREATE POLICY "exp_delete_pending" ON public.expenses FOR DELETE TO authenticated USING (status IN ('pending','cancelled') AND public.can_write_property(property_id,'financial.manage'));

CREATE POLICY "mnt_select" ON public.maintenance_requests FOR SELECT TO authenticated
  USING (public.can_access_property(property_id) OR assigned_to = auth.uid() OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()) OR public.is_platform_admin());
CREATE POLICY "mnt_insert" ON public.maintenance_requests FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'maintenance.manage'));
CREATE POLICY "mnt_update" ON public.maintenance_requests FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'maintenance.manage')) WITH CHECK (public.can_write_property(property_id,'maintenance.manage'));
CREATE POLICY "mnt_delete" ON public.maintenance_requests FOR DELETE TO authenticated USING (public.can_write_property(property_id,'maintenance.manage'));

CREATE POLICY "insp_select" ON public.inspections FOR SELECT TO authenticated USING (public.can_access_property(property_id) OR inspector_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "insp_insert" ON public.inspections FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'inspection.create'));
CREATE POLICY "insp_update" ON public.inspections FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'inspection.create')) WITH CHECK (public.can_write_property(property_id,'inspection.create'));
CREATE POLICY "insp_delete" ON public.inspections FOR DELETE TO authenticated USING (public.can_write_property(property_id,'inspection.create'));

CREATE POLICY "inspitem_select" ON public.inspection_items FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND public.can_access_property(i.property_id)));
CREATE POLICY "inspitem_insert" ON public.inspection_items FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND public.can_write_property(i.property_id,'inspection.create')));
CREATE POLICY "inspitem_update" ON public.inspection_items FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND public.can_write_property(i.property_id,'inspection.create')))
  WITH CHECK (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND public.can_write_property(i.property_id,'inspection.create')));
CREATE POLICY "inspitem_delete" ON public.inspection_items FOR DELETE TO authenticated
  USING (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND public.can_write_property(i.property_id,'inspection.create')));

CREATE POLICY "doc_select" ON public.documents FOR SELECT TO authenticated
  USING (public.can_access_property(property_id) OR uploaded_by = auth.uid() OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()) OR public.is_platform_admin());
CREATE POLICY "doc_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'document.create'));
CREATE POLICY "doc_update" ON public.documents FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'document.create')) WITH CHECK (public.can_write_property(property_id,'document.create'));
CREATE POLICY "doc_delete" ON public.documents FOR DELETE TO authenticated USING (public.can_write_property(property_id,'document.create'));

CREATE POLICY "task_select" ON public.tasks FOR SELECT TO authenticated
  USING (public.can_access_property(property_id) OR assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_platform_admin());
CREATE POLICY "task_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.can_write_property(property_id,'task.create'));
CREATE POLICY "task_update" ON public.tasks FOR UPDATE TO authenticated USING (public.can_write_property(property_id,'task.create')) WITH CHECK (public.can_write_property(property_id,'task.create'));
CREATE POLICY "task_delete" ON public.tasks FOR DELETE TO authenticated USING (public.can_write_property(property_id,'task.create'));

CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update_read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "act_select" ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (property_id IS NOT NULL AND public.can_access_property(property_id))
     OR (workspace_id IS NOT NULL AND public.can_access_workspace(workspace_id)) OR public.is_platform_admin());
CREATE POLICY "act_insert_admin" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-receipts','payment-receipts', false, 5242880, ARRAY['application/pdf','image/png','image/jpeg','image/jpg'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf','image/png','image/jpeg','image/jpg'];

CREATE POLICY "receipts_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts' AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name))));
CREATE POLICY "receipts_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name))));
CREATE POLICY "receipts_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-receipts' AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name))))
  WITH CHECK (bucket_id = 'payment-receipts' AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name))));
CREATE POLICY "receipts_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-receipts' AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name))));
CREATE POLICY "receipts_service" ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'payment-receipts') WITH CHECK (bucket_id = 'payment-receipts');

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, UUID, UUID, UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.payment_id_from_storage_path(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_workspace(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_property(UUID, TEXT) TO authenticated, service_role;
