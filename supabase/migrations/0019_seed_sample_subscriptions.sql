-- Migration 0019: Seed sample subscriptions and payments for testing admin view

-- Insert sample subscriptions for seeded accounts (Sarah Williams and Sty Tv)
INSERT INTO public.subscriptions (id, account_id, plan_id, status, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    'd0d346bf-5582-411a-8e2b-7c5efbb56f8f',
    '00000000-0000-0000-0000-000000000002',
    'under_review',
    NOW() - INTERVAL '1 day',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '21c490f9-76da-4c19-b961-de43360ecb96',
    '00000000-0000-0000-0000-000000000003',
    'active',
    NOW() - INTERVAL '2 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample payments for seeded subscriptions
INSERT INTO public.subscription_payments (id, subscription_id, account_id, reference, expected_amount, submitted_amount, currency, status, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'd0d346bf-5582-411a-8e2b-7c5efbb56f8f',
    'PL-2026-84920',
    79.00,
    79.00,
    'AUD',
    'under_review',
    NOW() - INTERVAL '1 day',
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000102',
    '21c490f9-76da-4c19-b961-de43360ecb96',
    'PL-2026-19402',
    99.00,
    99.00,
    'AUD',
    'verified',
    NOW() - INTERVAL '2 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
