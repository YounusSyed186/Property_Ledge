-- Migration 0022 (V3.1): properties belong to workspaces
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

CREATE INDEX IF NOT EXISTS idx_properties_workspace_id ON public.properties(workspace_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
