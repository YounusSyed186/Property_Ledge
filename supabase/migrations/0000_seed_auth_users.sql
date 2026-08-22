-- Seed Auth Users for PropertyLedge Development/Testing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1e258cb-3a8f-4d9e-a00d-5871dfcb8d9e',
  'authenticated',
  'authenticated',
  'admin@propertyledge.com.au',
  crypt('admin123', gen_salt('bf', 10)),
  now(),
  '+61 2 9000 1234',
  now(),
  '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
  '{"full_name":"PropertyLedge Administrator [Admin]","first_name":"PropertyLedge","last_name":"Administrator","is_admin":true}'::jsonb,
  now(),
  now(),
  '', '', '', ''
), (
  '00000000-0000-0000-0000-000000000000',
  'd0d346bf-5582-411a-8e2b-7c5efbb56f8f',
  'authenticated',
  'authenticated',
  'sarah.williams@propertyledge.com.au',
  crypt('password123', gen_salt('bf', 10)),
  now(),
  '+61 491 570 156',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Sarah Williams","first_name":"Sarah","last_name":"Williams"}'::jsonb,
  now(),
  now(),
  '', '', '', ''
) ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

INSERT INTO public.profiles (id, full_name, phone)
VALUES 
  ('a1e258cb-3a8f-4d9e-a00d-5871dfcb8d9e', 'PropertyLedge Administrator [Admin]', '+61 2 9000 1234'),
  ('d0d346bf-5582-411a-8e2b-7c5efbb56f8f', 'Sarah Williams', '+61 491 570 156')
ON CONFLICT (id) DO UPDATE 
SET full_name = EXCLUDED.full_name, 
    phone = EXCLUDED.phone;

INSERT INTO public.account_context (user_id, status, onboarding_status)
VALUES
  ('a1e258cb-3a8f-4d9e-a00d-5871dfcb8d9e', 'active', 'completed'),
  ('d0d346bf-5582-411a-8e2b-7c5efbb56f8f', 'active', 'completed')
ON CONFLICT (user_id) DO NOTHING;
