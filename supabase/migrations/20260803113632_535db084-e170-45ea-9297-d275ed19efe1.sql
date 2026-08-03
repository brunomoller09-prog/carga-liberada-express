DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='cargo_releases' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.cargo_releases', p.policyname);
  END LOOP;
END $$;
REVOKE SELECT ON public.cargo_releases FROM anon;
REVOKE SELECT ON public.cargo_releases FROM authenticated;
GRANT ALL ON public.cargo_releases TO service_role;