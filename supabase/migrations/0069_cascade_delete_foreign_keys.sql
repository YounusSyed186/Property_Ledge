-- Migration 0069: Add ON DELETE CASCADE to foreign keys for properties and tenants

-- 1. lease_tenants -> tenants, properties, leases
ALTER TABLE public.lease_tenants DROP CONSTRAINT IF EXISTS lease_tenants_tenant_id_fkey;
ALTER TABLE public.lease_tenants ADD CONSTRAINT lease_tenants_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.lease_tenants DROP CONSTRAINT IF EXISTS fk_lease_tenants_tenant_prop;
ALTER TABLE public.lease_tenants ADD CONSTRAINT fk_lease_tenants_tenant_prop
  FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE CASCADE;

ALTER TABLE public.lease_tenants DROP CONSTRAINT IF EXISTS lease_tenants_property_id_fkey;
ALTER TABLE public.lease_tenants ADD CONSTRAINT lease_tenants_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.lease_tenants DROP CONSTRAINT IF EXISTS lease_tenants_lease_id_fkey;
ALTER TABLE public.lease_tenants ADD CONSTRAINT lease_tenants_lease_id_fkey
  FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;

ALTER TABLE public.lease_tenants DROP CONSTRAINT IF EXISTS fk_lease_tenants_lease_prop;
ALTER TABLE public.lease_tenants ADD CONSTRAINT fk_lease_tenants_lease_prop
  FOREIGN KEY (lease_id, property_id) REFERENCES public.leases(id, property_id) ON DELETE CASCADE;

-- 2. tenants -> properties
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_property_id_fkey;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- 3. leases -> properties
ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_property_id_fkey;
ALTER TABLE public.leases ADD CONSTRAINT leases_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- 4. invoices -> properties & tenants
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_property_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_tenant_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS fk_invoices_tenant_prop;
ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_tenant_prop
  FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL;

-- 5. payments -> properties & tenants
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_property_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_tenant_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS fk_payments_tenant_prop;
ALTER TABLE public.payments ADD CONSTRAINT fk_payments_tenant_prop
  FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL;

-- 6. expenses -> properties
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_property_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- 7. maintenance_requests -> properties & tenants
ALTER TABLE public.maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_property_id_fkey;
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_tenant_id_fkey;
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.maintenance_requests DROP CONSTRAINT IF EXISTS fk_maintenance_tenant_prop;
ALTER TABLE public.maintenance_requests ADD CONSTRAINT fk_maintenance_tenant_prop
  FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL;

-- 8. inspections -> properties
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_property_id_fkey;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- 9. documents -> properties & tenants
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_property_id_fkey;
ALTER TABLE public.documents ADD CONSTRAINT documents_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_tenant_id_fkey;
ALTER TABLE public.documents ADD CONSTRAINT documents_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS fk_docs_tenant_prop;
ALTER TABLE public.documents ADD CONSTRAINT fk_docs_tenant_prop
  FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL;

-- 10. activity_logs -> properties (SET NULL on delete to preserve audit trail)
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_property_id_fkey;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.prevent_activity_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Allow service_role, postgres, supabase_admin, or admin context
  IF (SELECT current_user) IN ('postgres', 'service_role', 'supabase_admin') OR public.auth_is_service_role() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Allow setting foreign keys to NULL during parent entity deletion
  IF TG_OP = 'UPDATE' AND (
    (OLD.property_id IS NOT NULL AND NEW.property_id IS NULL) OR
    (OLD.workspace_id IS NOT NULL AND NEW.workspace_id IS NULL)
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Forbidden: Activity logs are append-only and cannot be updated or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_activity_log_modification ON public.activity_logs;
CREATE TRIGGER trg_prevent_activity_log_modification
  BEFORE UPDATE OR DELETE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_activity_log_modification();
