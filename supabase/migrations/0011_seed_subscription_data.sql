-- Migration 0011: Seed plans, entitlements, plan_entitlements and auto-subscription trigger

-- Seed Plans
INSERT INTO public.subscription_plans (id, name, slug, description, status, display_order, price_cents, billing_interval)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Free', 'free', 'Ideal for getting started with basic property tracking.', 'active', 1, 0, 'monthly'),
  ('00000000-0000-0000-0000-000000000002', 'Pro', 'pro', 'For active landlords and real estate investors needing full features.', 'active', 2, 2900, 'monthly'),
  ('00000000-0000-0000-0000-000000000003', 'Business', 'business', 'For property managers and enterprise scale real estate teams.', 'active', 3, 9900, 'monthly')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  updated_at = NOW();

-- Seed Entitlements
INSERT INTO public.entitlements (id, key, name, description, value_type)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'properties.max', 'Maximum Properties', 'Maximum number of managed properties allowed', 'number'),
  ('10000000-0000-0000-0000-000000000002', 'reports.enabled', 'Standard Reports', 'Access to basic financial and tenant reports', 'boolean'),
  ('10000000-0000-0000-0000-000000000003', 'advanced_reports.enabled', 'Advanced Analytics', 'Access to AI insights, export data, and custom reports', 'boolean'),
  ('10000000-0000-0000-0000-000000000004', 'team_members.max', 'Maximum Team Members', 'Maximum number of team seats allowed', 'number')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type,
  updated_at = NOW();

-- Seed Plan Entitlements
-- Free Plan Entitlements: properties.max = 2, reports.enabled = false, advanced_reports.enabled = false, team_members.max = 1
INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
VALUES
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'false'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'false'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '1'::jsonb)
ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Pro Plan Entitlements: properties.max = 25, reports.enabled = true, advanced_reports.enabled = true, team_members.max = 5
INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
VALUES
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '25'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '5'::jsonb)
ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Business Plan Entitlements: properties.max = 500, reports.enabled = true, advanced_reports.enabled = true, team_members.max = 50
INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
VALUES
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '500'::jsonb),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'true'::jsonb),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '50'::jsonb)
ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Update user creation trigger function to auto-assign default Free subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  -- Insert account context
  INSERT INTO public.account_context (user_id, status, onboarding_status, created_at, updated_at)
  VALUES (
    NEW.id,
    'active',
    'completed',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign free subscription to account if not exists
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (account_id, plan_id, status, created_at, updated_at)
    VALUES (NEW.id, free_plan_id, 'active', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
