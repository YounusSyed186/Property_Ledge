-- Migration 0015: Create Supabase Storage Bucket for payment receipts and proofs

-- Create payment-receipts bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  true,
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for storage.objects
DROP POLICY IF EXISTS "Allow authenticated users to upload payment receipts" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload payment receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "Allow authenticated users to view payment receipts" ON storage.objects;
CREATE POLICY "Allow authenticated users to view payment receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "Allow service role full access to payment receipts" ON storage.objects;
CREATE POLICY "Allow service role full access to payment receipts"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'payment-receipts');
