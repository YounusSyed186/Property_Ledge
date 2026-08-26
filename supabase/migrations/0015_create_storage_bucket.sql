-- Migration 0015: Private payment-receipts bucket (V3.1)
-- Object path convention: {payment_id}/{filename}
-- Full path policies are applied in propertyledge_v3_1.sql / schema.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow authenticated users to upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role full access to payment receipts" ON storage.objects;

CREATE POLICY "Allow service role full access to payment receipts"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'payment-receipts')
  WITH CHECK (bucket_id = 'payment-receipts');
