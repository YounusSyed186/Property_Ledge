-- Migration 0064: Restore generate_profile_public_id function
CREATE OR REPLACE FUNCTION public.generate_profile_public_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_id := 'PL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = v_id) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_profile_public_id() TO authenticated, anon, service_role;
