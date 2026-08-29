-- Migration 0065: Restore V1 property model parity on public.properties table

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_category TEXT CHECK (property_category IN ('Residential', 'Commercial')),
  ADD COLUMN IF NOT EXISTS rent_amount NUMERIC(10, 2) CHECK (rent_amount >= 0),
  ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'Weekly',
  ADD COLUMN IF NOT EXISTS property_id TEXT,
  ADD COLUMN IF NOT EXISTS suburb TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS car_spaces INTEGER DEFAULT 0 CHECK (car_spaces >= 0),
  ADD COLUMN IF NOT EXISTS tenant_name TEXT,
  ADD COLUMN IF NOT EXISTS tenant_email TEXT,
  ADD COLUMN IF NOT EXISTS lease_start DATE,
  ADD COLUMN IF NOT EXISTS lease_duration TEXT;

COMMENT ON COLUMN public.properties.property_category IS 'Property category: Residential or Commercial';
COMMENT ON COLUMN public.properties.rent_amount IS 'Advertised rent amount';
COMMENT ON COLUMN public.properties.payment_frequency IS 'Rent payment frequency: Weekly, Fortnightly, or Monthly';
COMMENT ON COLUMN public.properties.property_id IS 'Custom identifier string e.g. PL-1024';
COMMENT ON COLUMN public.properties.car_spaces IS 'Car parking spaces';
