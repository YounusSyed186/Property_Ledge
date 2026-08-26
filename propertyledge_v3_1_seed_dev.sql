-- =============================================================================
-- DEVELOPMENT ONLY — DO NOT RUN IN PRODUCTION
-- PropertyLedge V3.1 development seed
-- Creates local Auth users, platform admin, workspaces, and isolated
-- property membership (agent can access Property A only).
--
-- Sample payment amount is aligned to the Pro plan ($29.00 / 2900 cents).
-- The previous V3 seed billed $79.00 against a Pro subscription (mismatch).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- SQL editor / CLI has no end-user JWT; triggers require service_role or matching auth.uid().
SELECT set_config('request.jwt.claim.role', 'service_role', true);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, phone, phone_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  'a1e258cb-3a8f-4d9e-a00d-5871dfcb8d9e',
  'authenticated', 'authenticated',
  'admin@propertyledge.com.au',
  crypt('admin123', gen_salt('bf', 10)),
  now(), '+61 2 9000 1234', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"PropertyLedge Administrator","first_name":"PropertyLedge","last_name":"Administrator"}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'd0d346bf-5582-411a-8e2b-7c5efbb56f8f',
  'authenticated', 'authenticated',
  'sarah.williams@propertyledge.com.au',
  crypt('password123', gen_salt('bf', 10)),
  now(), '+61 491 570 156', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Sarah Williams","first_name":"Sarah","last_name":"Williams"}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'authenticated', 'authenticated',
  'landlord@test.com',
  crypt('TestPassword123!', gen_salt('bf', 10)),
  now(), NULL, NULL,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Test Landlord"}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'authenticated', 'authenticated',
  'agent@test.com',
  crypt('TestPassword123!', gen_salt('bf', 10)),
  now(), NULL, NULL,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Test Agent"}'::jsonb,
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'authenticated', 'authenticated',
  'admin@test.com',
  crypt('AdminPassword123!', gen_salt('bf', 10)),
  now(), NULL, NULL,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"E2E Admin"}'::jsonb,
  now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email, updated_at = now();

INSERT INTO public.platform_admins (user_id, status)
VALUES
  ('a1e258cb-3a8f-4d9e-a00d-5871dfcb8d9e', 'active'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'active')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.workspaces (id, name, slug, owner_id, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Property Management', 'test-pm', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspace_members (id, workspace_id, user_id, role, status, joined_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', 'active', NOW()),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'agent', 'active', NOW())
ON CONFLICT (workspace_id, user_id) DO NOTHING;

INSERT INTO public.properties (id, workspace_id, owner_id, name, property_type, status, address_line_1, address_line_2, city, state, postal_code, country, bedrooms, bathrooms, parking_spaces, square_feet, description)
VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Property A - Downtown Apartment', 'apartment', 'active', '123 Main Street', 'Unit 5A', 'Sydney', 'NSW', '2000', 'Australia', 2, 1.5, 1, 850, 'Modern 2-bedroom apartment in downtown Sydney'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Property B - Suburban House', 'house', 'active', '456 Oak Avenue', NULL, 'Melbourne', 'VIC', '3000', 'Australia', 3, 2, 2, 1500, 'Spacious 3-bedroom family house in suburban Melbourne')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.property_members (id, property_id, user_id, role, status, joined_at)
VALUES
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', 'active', NOW()),
  ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', 'active', NOW()),
  ('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'agent', 'active', NOW())
ON CONFLICT (property_id, user_id) DO NOTHING;

INSERT INTO public.units (id, property_id, name, unit_number, unit_type, status, bedrooms, bathrooms, square_feet, rent_amount)
VALUES
  ('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'Unit 5A', '5A', 'apartment', 'occupied', 2, 1.5, 850, 650),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444', 'Unit 5B', '5B', 'apartment', 'vacant', 1, 1, 600, 500),
  ('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', '55555555-5555-5555-5555-555555555555', 'Main House', '1', 'house', 'occupied', 3, 2, 1500, 800),
  ('c0c0c0c0-d0d0-e0e0-f0f0-c0c0c0c0c0c1', '55555555-5555-5555-5555-555555555555', 'Granny Flat', 'GF', 'granny_flat', 'vacant', 1, 1, 400, 350)
ON CONFLICT (property_id, unit_number) DO NOTHING;

INSERT INTO public.tenants (id, property_id, first_name, last_name, email, phone, status)
VALUES
  ('d0d0d0d0-e0e0-f0f0-a0a0-d0d0d0d0d0d1', '44444444-4444-4444-4444-444444444444', 'John', 'Smith', 'john.smith@tenant.com', '+61 400 123 456', 'active'),
  ('e0e0e0e0-f0f0-a0a0-b0b0-e0e0e0e0e0e2', '44444444-4444-4444-4444-444444444444', 'Sarah', 'Johnson', 'sarah.johnson@tenant.com', '+61 400 789 012', 'active'),
  ('f0f0f0f0-a0a0-b0b0-c0c0-f0f0f0f0f0f3', '55555555-5555-5555-5555-555555555555', 'Michael', 'Brown', 'michael.brown@tenant.com', '+61 400 345 678', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leases (id, property_id, unit_id, status, start_date, end_date, rent_amount, security_deposit, payment_due_day, rent_frequency, created_by)
VALUES
  ('a1000001-0001-0001-0001-000000000001', '44444444-4444-4444-4444-444444444444', '99999999-9999-9999-9999-999999999999', 'active', '2024-01-01', '2024-12-31', 650, 1300, 1, 'monthly', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('a1000002-0002-0002-0002-000000000002', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'draft', '2025-01-01', '2025-12-31', 500, 1000, 1, 'monthly', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('a1000003-0003-0003-0003-000000000003', '55555555-5555-5555-5555-555555555555', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'active', '2024-02-01', '2025-01-31', 800, 1600, 1, 'monthly', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lease_tenants (id, lease_id, tenant_id, property_id, role, is_primary)
VALUES
  ('a2000001-0001-0001-0001-000000000001', 'a1000001-0001-0001-0001-000000000001', 'd0d0d0d0-e0e0-f0f0-a0a0-d0d0d0d0d0d1', '44444444-4444-4444-4444-444444444444', 'primary', true),
  ('a2000002-0002-0002-0002-000000000002', 'a1000001-0001-0001-0001-000000000001', 'e0e0e0e0-f0f0-a0a0-b0b0-e0e0e0e0e0e2', '44444444-4444-4444-4444-444444444444', 'co-tenant', false),
  ('a2000003-0003-0003-0003-000000000003', 'a1000003-0003-0003-0003-000000000003', 'f0f0f0f0-a0a0-b0b0-c0c0-f0f0f0f0f0f3', '55555555-5555-5555-5555-555555555555', 'primary', true)
ON CONFLICT (lease_id, tenant_id) DO NOTHING;

INSERT INTO public.invoices (id, property_id, unit_id, lease_id, tenant_id, invoice_number, status, issue_date, due_date, subtotal, tax_amount, total_amount, balance_due, description, created_by)
VALUES
  ('b1000001-0001-0001-0001-000000000001', '44444444-4444-4444-4444-444444444444', '99999999-9999-9999-9999-999999999999', 'a1000001-0001-0001-0001-000000000001', 'd0d0d0d0-e0e0-f0f0-a0a0-d0d0d0d0d0d1', 'INV-2024-001', 'paid', '2024-01-01', '2024-01-07', 650, 0, 650, 0, 'January 2024 Rent', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('b1000002-0002-0002-0002-000000000002', '44444444-4444-4444-4444-444444444444', '99999999-9999-9999-9999-999999999999', 'a1000001-0001-0001-0001-000000000001', 'd0d0d0d0-e0e0-f0f0-a0a0-d0d0d0d0d0d1', 'INV-2024-002', 'issued', '2024-02-01', '2024-02-07', 650, 0, 650, 650, 'February 2024 Rent', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('b1000003-0003-0003-0003-000000000003', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'a1000002-0002-0002-0002-000000000002', 'e0e0e0e0-f0f0-a0a0-b0b0-e0e0e0e0e0e2', 'INV-2024-003', 'overdue', '2024-01-01', '2024-01-07', 500, 0, 500, 500, 'January 2024 Rent - Unit 5B', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('b1000004-0004-0004-0004-000000000004', '55555555-5555-5555-5555-555555555555', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'a1000003-0003-0003-0003-000000000003', 'f0f0f0f0-a0a0-b0b0-c0c0-f0f0f0f0f0f3', 'INV-2024-004', 'paid', '2024-02-01', '2024-02-07', 800, 0, 800, 0, 'February 2024 Rent', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO public.payments (id, property_id, invoice_id, lease_id, tenant_id, amount, payment_date, payment_method, status, reference, created_by)
VALUES
  ('c1000001-0001-0001-0001-000000000001', '44444444-4444-4444-4444-444444444444', 'b1000001-0001-0001-0001-000000000001', 'a1000001-0001-0001-0001-000000000001', 'd0d0d0d0-e0e0-f0f0-a0a0-d0d0d0d0d0d1', 650, '2024-01-05', 'bank_transfer', 'completed', 'PAY-001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('c1000002-0002-0002-0002-000000000002', '55555555-5555-5555-5555-555555555555', 'b1000004-0004-0004-0004-000000000004', 'a1000003-0003-0003-0003-000000000003', 'f0f0f0f0-a0a0-b0b0-c0c0-f0f0f0f0f0f3', 800, '2024-02-05', 'bank_transfer', 'completed', 'PAY-002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

-- Sarah Williams: convert the trigger-created current (Free/active) row to Pro under_review.
-- expected_amount matches Pro monthly ($29.00), not the previous $79.00 mismatch.
UPDATE public.subscriptions
SET
  plan_id = '00000000-0000-0000-0000-000000000002',
  status = 'under_review',
  updated_at = NOW()
WHERE account_id = 'd0d346bf-5582-411a-8e2b-7c5efbb56f8f'
  AND status IN ('pending_payment', 'under_review', 'trialing', 'active', 'past_due', 'paused');

INSERT INTO public.subscription_payments (id, subscription_id, account_id, reference, expected_amount, submitted_amount, currency, status, created_at, updated_at)
SELECT
  '00000000-0000-0000-0000-000000000201',
  s.id,
  'd0d346bf-5582-411a-8e2b-7c5efbb56f8f',
  'PL-2026-84920',
  29.00,
  29.00,
  'AUD',
  'under_review',
  NOW() - INTERVAL '1 day',
  NOW()
FROM public.subscriptions s
WHERE s.account_id = 'd0d346bf-5582-411a-8e2b-7c5efbb56f8f'
  AND s.status = 'under_review'
ON CONFLICT (id) DO NOTHING;
