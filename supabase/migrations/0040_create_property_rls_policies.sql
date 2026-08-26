-- Migration 0040: Create comprehensive RLS policies for property management tables
-- This migration applies the authorization helper functions to all property-scoped tables

-- Enable RLS on all tables (already enabled in individual migrations, but ensuring)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
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

-- Properties policies (already defined in 0022, but ensuring they use helpers)
DROP POLICY IF EXISTS "Users can view authorized properties" ON public.properties;
CREATE POLICY "Users can view authorized properties"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(id) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can insert properties in their org" ON public.properties;
CREATE POLICY "Users can insert properties in their org"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid() AND
    public.can_access_workspace(workspace_id)
  );

DROP POLICY IF EXISTS "Users can update authorized properties" ON public.properties;
CREATE POLICY "Users can update authorized properties"
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (
    public.owns_property(id) OR
    public.has_property_permission(id, 'property.update') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(id) OR
    public.has_property_permission(id, 'property.update') OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can delete owned properties" ON public.properties;
CREATE POLICY "Users can delete owned properties"
  ON public.properties
  FOR DELETE
  TO authenticated
  USING (
    public.owns_property(id) OR
    public.is_platform_admin()
  );

-- Property Members policies (already defined in 0023)
DROP POLICY IF EXISTS "Users can view property memberships" ON public.property_members;
CREATE POLICY "Users can view property memberships"
  ON public.property_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'team.view') OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Property owners can manage members" ON public.property_members;
CREATE POLICY "Property owners can manage members"
  ON public.property_members
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'team.manage_members') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'team.manage_members') OR
    public.is_platform_admin()
  );

-- Units policies (already defined in 0024)
DROP POLICY IF EXISTS "Users can view units in authorized properties" ON public.units;
CREATE POLICY "Users can view units in authorized properties"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage units in authorized properties" ON public.units;
CREATE POLICY "Users can manage units in authorized properties"
  ON public.units
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'property.update') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'property.update') OR
    public.is_platform_admin()
  );

-- Tenants policies (already defined in 0025)
DROP POLICY IF EXISTS "Users can view tenants in authorized properties" ON public.tenants;
CREATE POLICY "Users can view tenants in authorized properties"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    user_id = auth.uid() OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage tenants in authorized properties" ON public.tenants;
CREATE POLICY "Users can manage tenants in authorized properties"
  ON public.tenants
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'tenant.manage') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'tenant.manage') OR
    public.is_platform_admin()
  );

-- Leases policies (already defined in 0026)
DROP POLICY IF EXISTS "Users can view leases in authorized properties" ON public.leases;
CREATE POLICY "Users can view leases in authorized properties"
  ON public.leases
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage leases in authorized properties" ON public.leases;
CREATE POLICY "Users can manage leases in authorized properties"
  ON public.leases
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'lease.manage') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'lease.manage') OR
    public.is_platform_admin()
  );

-- Lease Tenants policies (already defined in 0027)
DROP POLICY IF EXISTS "Users can view lease tenants in authorized properties" ON public.lease_tenants;
CREATE POLICY "Users can view lease tenants in authorized properties"
  ON public.lease_tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_id AND public.can_access_property(l.property_id)
    ) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage lease tenants in authorized properties" ON public.lease_tenants;
CREATE POLICY "Users can manage lease tenants in authorized properties"
  ON public.lease_tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_id AND (
        public.owns_property(l.property_id) OR
        public.has_property_permission(l.property_id, 'lease.manage')
      )
    ) OR
    public.is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_id AND (
        public.owns_property(l.property_id) OR
        public.has_property_permission(l.property_id, 'lease.manage')
      )
    ) OR
    public.is_platform_admin()
  );

-- Invoices policies (already defined in 0028)
DROP POLICY IF EXISTS "Users can view invoices in authorized properties" ON public.invoices;
CREATE POLICY "Users can view invoices in authorized properties"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage invoices in authorized properties" ON public.invoices;
CREATE POLICY "Users can manage invoices in authorized properties"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'financial.manage') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'financial.manage') OR
    public.is_platform_admin()
  );

-- Invoice Items policies (already defined in 0029)
DROP POLICY IF EXISTS "Users can view invoice items for authorized properties" ON public.invoice_items;
CREATE POLICY "Users can view invoice items for authorized properties"
  ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND public.can_access_property(i.property_id)
    ) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage invoice items for authorized properties" ON public.invoice_items;
CREATE POLICY "Users can manage invoice items for authorized properties"
  ON public.invoice_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND (
        public.owns_property(i.property_id) OR
        public.has_property_permission(i.property_id, 'financial.manage')
      )
    ) OR
    public.is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND (
        public.owns_property(i.property_id) OR
        public.has_property_permission(i.property_id, 'financial.manage')
      )
    ) OR
    public.is_platform_admin()
  );

-- Payments policies (already defined in 0030)
DROP POLICY IF EXISTS "Users can view payments in authorized properties" ON public.payments;
CREATE POLICY "Users can view payments in authorized properties"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage payments in authorized properties" ON public.payments;
CREATE POLICY "Users can manage payments in authorized properties"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'financial.manage') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'financial.manage') OR
    public.is_platform_admin()
  );

-- Expenses policies (already defined in 0031)
DROP POLICY IF EXISTS "Users can view expenses in authorized properties" ON public.expenses;
CREATE POLICY "Users can view expenses in authorized properties"
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage expenses in authorized properties" ON public.expenses;
CREATE POLICY "Users can manage expenses in authorized properties"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'financial.manage') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'financial.manage') OR
    public.is_platform_admin()
  );

-- Maintenance Requests policies (already defined in 0032)
DROP POLICY IF EXISTS "Users can view maintenance in authorized properties" ON public.maintenance_requests;
CREATE POLICY "Users can view maintenance in authorized properties"
  ON public.maintenance_requests
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    assigned_to = auth.uid() OR
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage maintenance in authorized properties" ON public.maintenance_requests;
CREATE POLICY "Users can manage maintenance in authorized properties"
  ON public.maintenance_requests
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'maintenance.manage') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'maintenance.manage') OR
    public.is_platform_admin()
  );

-- Inspections policies (already defined in 0033)
DROP POLICY IF EXISTS "Users can view inspections in authorized properties" ON public.inspections;
CREATE POLICY "Users can view inspections in authorized properties"
  ON public.inspections
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    inspector_id = auth.uid() OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage inspections in authorized properties" ON public.inspections;
CREATE POLICY "Users can manage inspections in authorized properties"
  ON public.inspections
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'inspection.manage') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'inspection.manage') OR
    public.is_platform_admin()
  );

-- Inspection Items policies (already defined in 0034)
DROP POLICY IF EXISTS "Users can view inspection items for authorized properties" ON public.inspection_items;
CREATE POLICY "Users can view inspection items for authorized properties"
  ON public.inspection_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id AND public.can_access_property(i.property_id)
    ) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage inspection items for authorized properties" ON public.inspection_items;
CREATE POLICY "Users can manage inspection items for authorized properties"
  ON public.inspection_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id AND (
        public.owns_property(i.property_id) OR
        public.has_property_permission(i.property_id, 'inspection.manage')
      )
    ) OR
    public.is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id AND (
        public.owns_property(i.property_id) OR
        public.has_property_permission(i.property_id, 'inspection.manage')
      )
    ) OR
    public.is_platform_admin()
  );

-- Documents policies (already defined in 0035)
DROP POLICY IF EXISTS "Users can view documents in authorized properties" ON public.documents;
CREATE POLICY "Users can view documents in authorized properties"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    uploaded_by = auth.uid() OR
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage documents in authorized properties" ON public.documents;
CREATE POLICY "Users can manage documents in authorized properties"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'document.manage') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'document.manage') OR
    public.is_platform_admin()
  );

-- Tasks policies (already defined in 0036)
DROP POLICY IF EXISTS "Users can view tasks in authorized properties" ON public.tasks;
CREATE POLICY "Users can view tasks in authorized properties"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_property(property_id) OR
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Users can manage tasks in authorized properties" ON public.tasks;
CREATE POLICY "Users can manage tasks in authorized properties"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'task.manage') OR
    public.is_platform_admin()
  )
  WITH CHECK (
    public.owns_property(property_id) OR
    public.has_property_permission(property_id, 'task.manage') OR
    public.is_platform_admin()
  );

-- Notifications policies (already defined in 0037)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

-- Activity logs: SELECT only for clients. Inserts go through public.log_activity().
DROP POLICY IF EXISTS "Users can view activity logs for authorized properties" ON public.activity_logs;
CREATE POLICY "Users can view activity logs for authorized properties"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (property_id IS NOT NULL AND public.can_access_property(property_id)) OR
    (workspace_id IS NOT NULL AND public.can_access_workspace(workspace_id)) OR
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;