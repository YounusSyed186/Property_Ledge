-- Migration 0070: Add Lease Renewal Support
-- Supports the complete lease renewal lifecycle:
-- 1. Links new renewed lease to its previous historical lease (renewed_from_lease_id)
-- 2. Adds 'renewed' to the status check constraint for historical completed renewals

-- 1. Add renewed_from_lease_id self-referential foreign key
ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS renewed_from_lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL;

-- Index for lookup performance on renewal chains
CREATE INDEX IF NOT EXISTS idx_leases_renewed_from ON public.leases(renewed_from_lease_id);

-- 2. Update status check constraint to include 'renewed'
ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_status_check;
ALTER TABLE public.leases ADD CONSTRAINT leases_status_check
  CHECK (status IN ('draft', 'pending', 'active', 'expired', 'terminated', 'cancelled', 'renewed'));
