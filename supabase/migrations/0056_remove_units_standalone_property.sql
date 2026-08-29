-- Migration 0056: Remove units table and refactor to single standalone property structure

-- 1. Ensure foreign keys on dependent tables reference properties(id) directly
DO $$ 
BEGIN
  -- Leases
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leases' AND column_name = 'unit_id') THEN
    ALTER TABLE leases DROP COLUMN IF EXISTS unit_id;
  END IF;

  -- Maintenance requests
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_requests' AND column_name = 'unit_id') THEN
    ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS unit_id;
  END IF;

  -- Inspections
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspections' AND column_name = 'unit_id') THEN
    ALTER TABLE inspections DROP COLUMN IF EXISTS unit_id;
  END IF;

  -- Documents
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'unit_id') THEN
    ALTER TABLE documents DROP COLUMN IF EXISTS unit_id;
  END IF;
END $$;

-- 2. Drop units table if present
DROP TABLE IF EXISTS units CASCADE;
