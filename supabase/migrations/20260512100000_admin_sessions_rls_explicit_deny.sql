-- Linter 0008 (rls_enabled_no_policy): RLS is enabled on admin_sessions but had no policies.
-- Mirror admin_credentials: explicit deny for API-facing roles. service_role bypasses RLS and
-- remains used by createAdminClient() for session storage.

DROP POLICY IF EXISTS "No public access to admin sessions" ON admin_sessions;
CREATE POLICY "No public access to admin sessions" ON admin_sessions FOR ALL TO public USING (false) WITH CHECK (false);
