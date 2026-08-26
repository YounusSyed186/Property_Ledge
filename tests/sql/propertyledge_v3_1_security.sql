-- PropertyLedge V3.1 security test matrix (manual / SQL)
-- Run after applying 0042 and (optionally) propertyledge_v3_1_seed_dev.sql
--
-- These statements are intended to be executed as:
--   A) service_role / postgres (setup + diagnostics)
--   B) JWT of landlord@test.com (aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
--   C) JWT of agent@test.com    (bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb)
--   D) JWT of a third user with user_metadata.is_admin=true but no platform_admins row
--
-- Expected: every "MUST FAIL" statement returns 0 rows or a policy/trigger error.

-- ---------------------------------------------------------------------------
-- Diagnostics (postgres)
-- ---------------------------------------------------------------------------
-- Duplicate current subscriptions (must be 0 groups with cnt>1)
SELECT account_id, count(*) AS cnt
FROM public.subscriptions
WHERE status IN ('pending_payment', 'under_review', 'trialing', 'active', 'past_due', 'paused')
GROUP BY account_id
HAVING count(*) > 1;

-- Payment/subscription account mismatch (must be 0)
SELECT sp.id
FROM public.subscription_payments sp
JOIN public.subscriptions s ON s.id = sp.subscription_id
WHERE sp.account_id IS DISTINCT FROM s.account_id;

-- Public payment-receipts bucket (must be false)
SELECT id, public FROM storage.buckets WHERE id = 'payment-receipts';

-- is_platform_admin must not read user_metadata (source check)
SELECT pg_get_functiondef('public.is_platform_admin()'::regprocedure);

-- ---------------------------------------------------------------------------
-- Admin escalation (JWT D: normal user, user_metadata.is_admin=true)
-- MUST FAIL: SELECT from platform_admins of others, UPDATE subscriptions of others,
--            SELECT payment_proofs of others, INSERT activity_logs as ADMIN_*
-- ---------------------------------------------------------------------------
-- SELECT public.is_platform_admin();  -- expected false
-- UPDATE public.subscriptions SET status = 'active';  -- expected 0 / policy
-- INSERT INTO public.platform_admins(user_id) VALUES (auth.uid()); -- trigger

-- ---------------------------------------------------------------------------
-- Billing (JWT landlord)
-- MUST FAIL
-- ---------------------------------------------------------------------------
-- UPDATE public.subscriptions SET plan_id = '00000000-0000-0000-0000-000000000003';
-- UPDATE public.subscriptions SET status = 'active';
-- UPDATE public.subscription_payments SET status = 'verified', verified_by = auth.uid();
-- UPDATE public.subscription_payments SET account_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- MUST SUCCEED
-- SELECT * FROM public.subscriptions WHERE account_id = auth.uid();
-- SELECT * FROM public.subscription_payments WHERE account_id = auth.uid();

-- ---------------------------------------------------------------------------
-- Payment proofs (JWT agent against landlord payment 60000000-... )
-- MUST FAIL
-- ---------------------------------------------------------------------------
-- SELECT * FROM public.payment_proofs
-- WHERE payment_id = '60000000-0000-0000-0000-0000000000aa';
-- INSERT INTO public.payment_proofs (payment_id, storage_path, file_name, mime_type, file_size)
-- VALUES ('60000000-0000-0000-0000-0000000000aa', 'x', 'x.pdf', 'application/pdf', 100);

-- ---------------------------------------------------------------------------
-- Storage (JWT agent)
-- MUST FAIL: upload/read landlord payment path
-- ---------------------------------------------------------------------------
-- INSERT into storage.objects name = '60000000-0000-0000-0000-0000000000aa/evil.pdf'
-- SELECT storage.objects WHERE name like '60000000-0000-0000-0000-0000000000aa/%'
-- Public URL of private bucket must 400

-- ---------------------------------------------------------------------------
-- Cross-property (JWT agent: member of Property A only)
-- MUST SUCCEED: Property A units/tenants/invoices
-- MUST FAIL: Property B (55555555-5555-5555-5555-555555555555)
-- ---------------------------------------------------------------------------
-- SELECT * FROM public.properties WHERE id = '55555555-5555-5555-5555-555555555555';
-- SELECT * FROM public.units WHERE property_id = '55555555-5555-5555-5555-555555555555';
-- SELECT * FROM public.tenants WHERE property_id = '55555555-5555-5555-5555-555555555555';
-- SELECT * FROM public.leases WHERE property_id = '55555555-5555-5555-5555-555555555555';
-- SELECT * FROM public.invoices WHERE property_id = '55555555-5555-5555-5555-555555555555';
-- SELECT * FROM public.payments WHERE property_id = '55555555-5555-5555-5555-555555555555';
-- SELECT * FROM public.expenses WHERE property_id = '55555555-5555-5555-5555-555555555555';

-- Cross-property write MUST FAIL (composite FK / trigger)
-- UPDATE public.leases SET unit_id = '10000000-0000-0000-0000-0000000000bb'
-- WHERE id = '30000000-0000-0000-0000-0000000000aa';
-- INSERT INTO public.lease_tenants (lease_id, tenant_id, property_id)
-- VALUES ('30000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000bb', '44444444-4444-4444-4444-444444444444');

-- ---------------------------------------------------------------------------
-- Audit
-- MUST FAIL for normal users
-- ---------------------------------------------------------------------------
-- INSERT INTO public.activity_logs (user_id, action, entity_type)
-- VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ADMIN_SUBSCRIPTION_ACCEPTED', 'subscription');
-- UPDATE public.activity_logs SET action = 'tamper';
-- DELETE FROM public.activity_logs;
-- SELECT public.log_activity('ADMIN_SUBSCRIPTION_ACCEPTED', 'subscription'); -- non-admin

-- ---------------------------------------------------------------------------
-- Financial delete
-- MUST FAIL: DELETE completed payments / issued invoices
-- ---------------------------------------------------------------------------
-- DELETE FROM public.payments WHERE status = 'completed';
-- DELETE FROM public.invoices WHERE status = 'issued';
