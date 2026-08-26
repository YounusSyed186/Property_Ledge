-- Fix infinite recursion (42P17) between leases_select and lt_select introduced in 0052.
-- lt_select must not subquery leases; leases_select must not subquery lease_tenants under RLS.

CREATE OR REPLACE FUNCTION public.tenant_can_read_lease(p_lease_id uuid)
RETURNS boolean
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

CREATE OR REPLACE FUNCTION public.tenant_can_read_unit(p_unit_id uuid)
RETURNS boolean
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

GRANT EXECUTE ON FUNCTION public.tenant_can_read_lease(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_can_read_unit(uuid) TO authenticated;

-- Use property_id directly instead of joining back into leases (breaks recursion).
ALTER POLICY "lt_select" ON public.lease_tenants
  USING (
    public.is_platform_admin()
    OR public.can_access_property(property_id)
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

ALTER POLICY "leases_select" ON public.leases
  USING (
    public.can_access_property(property_id)
    OR public.tenant_can_read_lease(id)
    OR public.is_platform_admin()
  );

ALTER POLICY "units_select" ON public.units
  USING (
    public.can_access_property(property_id)
    OR public.tenant_can_read_unit(id)
    OR public.is_platform_admin()
  );
