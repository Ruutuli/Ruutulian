-- Linter: enable RLS on public-schema tables exposed to PostgREST.
-- OC adjunct tables: admin UI uses the anon key (custom cookie auth), not Supabase Auth, so policies
-- use TO public for ALL — same practical access as when RLS was off. Harden later by routing writes through API + service_role.
-- admin_sessions: server-only via createAdminClient (service role bypasses RLS); no policies for anon/authenticated.

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_token_key ON admin_sessions (token);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- character_quotes
ALTER TABLE character_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "character_quotes_full_access_public" ON character_quotes;
CREATE POLICY "character_quotes_full_access_public" ON character_quotes FOR ALL TO public USING (true) WITH CHECK (true);

-- tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_full_access_public" ON tags;
CREATE POLICY "tags_full_access_public" ON tags FOR ALL TO public USING (true) WITH CHECK (true);

-- character_tags
ALTER TABLE character_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "character_tags_full_access_public" ON character_tags;
CREATE POLICY "character_tags_full_access_public" ON character_tags FOR ALL TO public USING (true) WITH CHECK (true);

-- character_development_log
ALTER TABLE character_development_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "character_development_log_full_access_public" ON character_development_log;
CREATE POLICY "character_development_log_full_access_public" ON character_development_log FOR ALL TO public USING (true) WITH CHECK (true);

-- story_snippets
ALTER TABLE story_snippets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "story_snippets_full_access_public" ON story_snippets;
CREATE POLICY "story_snippets_full_access_public" ON story_snippets FOR ALL TO public USING (true) WITH CHECK (true);

-- writing_prompt_responses
ALTER TABLE writing_prompt_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "writing_prompt_responses_full_access_public" ON writing_prompt_responses;
CREATE POLICY "writing_prompt_responses_full_access_public" ON writing_prompt_responses FOR ALL TO public USING (true) WITH CHECK (true);
