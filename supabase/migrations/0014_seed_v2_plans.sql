-- Migration 0014: Add Landlord and Property Manager plans matching V2 schema

INSERT INTO public.subscription_plans (id, name, slug, description, status, display_order, price_cents, billing_interval)
VALUES 
  ('00000000-0000-0000-0000-000000000004', 'Landlord', 'landlord', 'For individual real estate investors managing their portfolio.', 'active', 2, 2900, 'monthly'),
  ('00000000-0000-0000-0000-000000000005', 'Property Manager', 'manager', 'For growing portfolios and professional property managers.', 'active', 3, 7900, 'monthly')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  updated_at = NOW();

-- Entitlements for landlord (properties.max = 5)
INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
VALUES
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '5'::jsonb),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'false'::jsonb),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '2'::jsonb)
ON CONFLICT DO NOTHING;

-- Entitlements for manager (properties.max = 50)
INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
VALUES
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '50'::jsonb),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', '10'::jsonb)
ON CONFLICT DO NOTHING;
