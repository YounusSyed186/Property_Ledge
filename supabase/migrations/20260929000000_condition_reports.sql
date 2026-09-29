-- ====================================================================
-- PropertyLedge Condition Reports & Inspection System
-- Migration: 20260929000000_condition_reports.sql
-- ====================================================================

-- 1. Main Condition Reports Table
CREATE TABLE IF NOT EXISTS public.condition_reports (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID                     NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id         UUID                     NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lease_id            UUID                     REFERENCES public.leases(id) ON DELETE SET NULL,
  baseline_report_id  UUID                     REFERENCES public.condition_reports(id) ON DELETE SET NULL,
  inspector_id        UUID                     REFERENCES auth.users(id) ON DELETE SET NULL,
  type                VARCHAR(50)              NOT NULL CHECK (type IN ('Move In', 'Routine', 'Move Out', 'Custom')),
  inspection_date     DATE                     NOT NULL DEFAULT CURRENT_DATE,
  inspector_name      VARCHAR(255)             NOT NULL,
  status              VARCHAR(50)              NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed')),
  notes               TEXT,
  signature_manager   TEXT,
  signature_tenant    TEXT,
  signature_landlord  TEXT,
  completed_at        TIMESTAMP WITH TIME ZONE,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.condition_reports ADD COLUMN IF NOT EXISTS baseline_report_id UUID REFERENCES public.condition_reports(id) ON DELETE SET NULL;

-- 2. Inspection Rooms Table
CREATE TABLE IF NOT EXISTS public.inspection_rooms (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id           UUID                     NOT NULL REFERENCES public.condition_reports(id) ON DELETE CASCADE,
  name                VARCHAR(255)             NOT NULL,
  status              VARCHAR(50)              NOT NULL DEFAULT 'Incomplete' CHECK (status IN ('Incomplete', 'Completed')),
  room_order          INT                      NOT NULL DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Inspection Items Table
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID                     NOT NULL REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  name                VARCHAR(255)             NOT NULL,
  rating              VARCHAR(50)              CHECK (rating IN ('Excellent', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Not Applicable')),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Inspection Defects Table
CREATE TABLE IF NOT EXISTS public.inspection_defects (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID                     NOT NULL REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  item_name           VARCHAR(255),
  notes               TEXT                     NOT NULL,
  severity            VARCHAR(50)              NOT NULL CHECK (severity IN ('Minor', 'Moderate', 'Major', 'Urgent')),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Inspection Photos Table
CREATE TABLE IF NOT EXISTS public.inspection_photos (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID                     NOT NULL REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  defect_id           UUID                     REFERENCES public.inspection_defects(id) ON DELETE CASCADE,
  item_id             UUID                     REFERENCES public.inspection_items(id) ON DELETE CASCADE,
  photo_url           TEXT                     NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.inspection_photos ADD COLUMN IF NOT EXISTS defect_id UUID REFERENCES public.inspection_defects(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_photos ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.inspection_items(id) ON DELETE CASCADE;

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_condition_reports_workspace_id ON public.condition_reports (workspace_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_property_id ON public.condition_reports (property_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_lease_id ON public.condition_reports (lease_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_baseline_report_id ON public.condition_reports (baseline_report_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_status ON public.condition_reports (status);
CREATE INDEX IF NOT EXISTS idx_condition_reports_inspection_date ON public.condition_reports (inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_rooms_report_id ON public.inspection_rooms (report_id, room_order);
CREATE INDEX IF NOT EXISTS idx_inspection_items_room_id ON public.inspection_items (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_defects_room_id ON public.inspection_defects (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_room_id ON public.inspection_photos (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_defect_id ON public.inspection_photos (defect_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_item_id ON public.inspection_photos (item_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "cr_select" ON public.condition_reports;
DROP POLICY IF EXISTS "cr_insert" ON public.condition_reports;
DROP POLICY IF EXISTS "cr_update" ON public.condition_reports;
DROP POLICY IF EXISTS "cr_delete" ON public.condition_reports;

DROP POLICY IF EXISTS "ir_select" ON public.inspection_rooms;
DROP POLICY IF EXISTS "ir_insert" ON public.inspection_rooms;
DROP POLICY IF EXISTS "ir_update" ON public.inspection_rooms;
DROP POLICY IF EXISTS "ir_delete" ON public.inspection_rooms;

DROP POLICY IF EXISTS "ii_select" ON public.inspection_items;
DROP POLICY IF EXISTS "ii_insert" ON public.inspection_items;
DROP POLICY IF EXISTS "ii_update" ON public.inspection_items;
DROP POLICY IF EXISTS "ii_delete" ON public.inspection_items;

DROP POLICY IF EXISTS "id_select" ON public.inspection_defects;
DROP POLICY IF EXISTS "id_insert" ON public.inspection_defects;
DROP POLICY IF EXISTS "id_update" ON public.inspection_defects;
DROP POLICY IF EXISTS "id_delete" ON public.inspection_defects;

DROP POLICY IF EXISTS "ip_select" ON public.inspection_photos;
DROP POLICY IF EXISTS "ip_insert" ON public.inspection_photos;
DROP POLICY IF EXISTS "ip_update" ON public.inspection_photos;
DROP POLICY IF EXISTS "ip_delete" ON public.inspection_photos;

-- Condition Reports RLS Policies
CREATE POLICY "cr_select" ON public.condition_reports
  FOR SELECT TO authenticated
  USING (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_access_property(property_id) OR
      public.is_platform_admin() OR
      EXISTS (SELECT 1 FROM public.tenants t WHERE t.user_id = auth.uid() AND t.property_id = condition_reports.property_id)
    )
  );

CREATE POLICY "cr_insert" ON public.condition_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.create'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  );

CREATE POLICY "cr_update" ON public.condition_reports
  FOR UPDATE TO authenticated
  USING (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.update'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  )
  WITH CHECK (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.update'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  );

CREATE POLICY "cr_delete" ON public.condition_reports
  FOR DELETE TO authenticated
  USING (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.delete'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  );

-- Inspection Rooms Policies
CREATE POLICY "ir_select" ON public.inspection_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ir_insert" ON public.inspection_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ir_update" ON public.inspection_rooms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ir_delete" ON public.inspection_rooms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Inspection Items Policies
CREATE POLICY "ii_select" ON public.inspection_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ii_insert" ON public.inspection_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ii_update" ON public.inspection_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ii_delete" ON public.inspection_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Inspection Defects Policies
CREATE POLICY "id_select" ON public.inspection_defects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "id_insert" ON public.inspection_defects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "id_update" ON public.inspection_defects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "id_delete" ON public.inspection_defects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Inspection Photos Policies
CREATE POLICY "ip_select" ON public.inspection_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ip_insert" ON public.inspection_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ip_update" ON public.inspection_photos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ip_delete" ON public.inspection_photos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Service role & postgres permissions
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condition_reports TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_rooms TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_items TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_defects TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_photos TO authenticated, service_role, postgres;
