-- Migration 0068: Allow NULL end_date on public.leases for periodic / open-ended leases

ALTER TABLE public.leases ALTER COLUMN end_date DROP NOT NULL;

-- Update constraint to permit NULL end_date for periodic leases
ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS chk_lease_dates;
ALTER TABLE public.leases ADD CONSTRAINT chk_lease_dates CHECK (end_date IS NULL OR end_date >= start_date);
