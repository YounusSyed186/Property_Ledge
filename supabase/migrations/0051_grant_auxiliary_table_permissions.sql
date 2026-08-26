-- Grant table privileges for auxiliary tables not covered by 0045–0047.
-- Without these GRANTs, RLS-allowed reads can still fail with "permission denied".

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
