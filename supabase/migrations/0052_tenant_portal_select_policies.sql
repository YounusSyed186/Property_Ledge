-- Extend SELECT policies so linked tenants (tenants.user_id = auth.uid()) can read
-- their own property, lease, unit, invoice, and payment data in the tenant portal.

ALTER POLICY "prop_select" ON public.properties
  USING (
    public.can_access_property(id)
    OR id IN (SELECT property_id FROM public.tenants WHERE user_id = auth.uid())
    OR public.is_platform_admin()
  );

ALTER POLICY "units_select" ON public.units
  USING (
    public.can_access_property(property_id)
    OR EXISTS (
      SELECT 1
      FROM public.lease_tenants lt
      JOIN public.leases l ON l.id = lt.lease_id AND l.property_id = lt.property_id
      WHERE l.unit_id = units.id
        AND lt.tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    )
    OR public.is_platform_admin()
  );

ALTER POLICY "leases_select" ON public.leases
  USING (
    public.can_access_property(property_id)
    OR id IN (
      SELECT lease_id FROM public.lease_tenants
      WHERE tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    )
    OR public.is_platform_admin()
  );

ALTER POLICY "lt_select" ON public.lease_tenants
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_id AND public.can_access_property(l.property_id)
    )
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

ALTER POLICY "inv_select" ON public.invoices
  USING (
    public.can_access_property(property_id)
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    OR public.is_platform_admin()
  );

ALTER POLICY "pay_select" ON public.payments
  USING (
    public.can_access_property(property_id)
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    OR public.is_platform_admin()
  );
