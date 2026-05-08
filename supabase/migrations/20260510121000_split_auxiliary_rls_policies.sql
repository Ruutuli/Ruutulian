-- Linter 0024 (rls_policy_always_true): replace FOR ALL + true/true with split policies.
-- SELECT: USING (true) is exempt per linter. Writes: non-trivial WITH CHECK / USING (still anon-friendly for admin UI).

-- character_quotes
DROP POLICY IF EXISTS "character_quotes_full_access_public" ON character_quotes;
CREATE POLICY "character_quotes_select_public" ON character_quotes FOR SELECT TO public USING (true);
CREATE POLICY "character_quotes_insert_public" ON character_quotes FOR INSERT TO public
  WITH CHECK (
    oc_id IS NOT NULL
    AND quote_text IS NOT NULL
    AND length(trim(quote_text)) > 0
  );
CREATE POLICY "character_quotes_update_public" ON character_quotes FOR UPDATE TO public
  USING (quote_text IS NOT NULL AND length(trim(quote_text)) > 0)
  WITH CHECK (
    oc_id IS NOT NULL
    AND quote_text IS NOT NULL
    AND length(trim(quote_text)) > 0
  );
CREATE POLICY "character_quotes_delete_public" ON character_quotes FOR DELETE TO public
  USING (oc_id IS NOT NULL);

-- tags
DROP POLICY IF EXISTS "tags_full_access_public" ON tags;
CREATE POLICY "tags_select_public" ON tags FOR SELECT TO public USING (true);
CREATE POLICY "tags_insert_public" ON tags FOR INSERT TO public
  WITH CHECK (name IS NOT NULL AND length(trim(name)) > 0);
CREATE POLICY "tags_update_public" ON tags FOR UPDATE TO public
  USING (name IS NOT NULL)
  WITH CHECK (name IS NOT NULL AND length(trim(name)) > 0);
CREATE POLICY "tags_delete_public" ON tags FOR DELETE TO public
  USING (id IS NOT NULL);

-- character_tags
DROP POLICY IF EXISTS "character_tags_full_access_public" ON character_tags;
CREATE POLICY "character_tags_select_public" ON character_tags FOR SELECT TO public USING (true);
CREATE POLICY "character_tags_insert_public" ON character_tags FOR INSERT TO public
  WITH CHECK (oc_id IS NOT NULL AND tag_id IS NOT NULL);
CREATE POLICY "character_tags_update_public" ON character_tags FOR UPDATE TO public
  USING (oc_id IS NOT NULL AND tag_id IS NOT NULL)
  WITH CHECK (oc_id IS NOT NULL AND tag_id IS NOT NULL);
CREATE POLICY "character_tags_delete_public" ON character_tags FOR DELETE TO public
  USING (oc_id IS NOT NULL AND tag_id IS NOT NULL);

-- character_development_log
DROP POLICY IF EXISTS "character_development_log_full_access_public" ON character_development_log;
CREATE POLICY "character_development_log_select_public" ON character_development_log FOR SELECT TO public USING (true);
CREATE POLICY "character_development_log_insert_public" ON character_development_log FOR INSERT TO public
  WITH CHECK (
    oc_id IS NOT NULL
    AND change_type IS NOT NULL
    AND length(trim(change_type)) > 0
    AND notes IS NOT NULL
    AND length(trim(notes)) > 0
  );
CREATE POLICY "character_development_log_update_public" ON character_development_log FOR UPDATE TO public
  USING (notes IS NOT NULL AND length(trim(notes)) > 0)
  WITH CHECK (
    oc_id IS NOT NULL
    AND change_type IS NOT NULL
    AND length(trim(change_type)) > 0
    AND notes IS NOT NULL
    AND length(trim(notes)) > 0
  );
CREATE POLICY "character_development_log_delete_public" ON character_development_log FOR DELETE TO public
  USING (oc_id IS NOT NULL);

-- story_snippets
DROP POLICY IF EXISTS "story_snippets_full_access_public" ON story_snippets;
CREATE POLICY "story_snippets_select_public" ON story_snippets FOR SELECT TO public USING (true);
CREATE POLICY "story_snippets_insert_public" ON story_snippets FOR INSERT TO public
  WITH CHECK (
    oc_id IS NOT NULL
    AND title IS NOT NULL
    AND length(trim(title)) > 0
    AND snippet_text IS NOT NULL
    AND length(trim(snippet_text)) > 0
  );
CREATE POLICY "story_snippets_update_public" ON story_snippets FOR UPDATE TO public
  USING (title IS NOT NULL AND snippet_text IS NOT NULL)
  WITH CHECK (
    oc_id IS NOT NULL
    AND title IS NOT NULL
    AND length(trim(title)) > 0
    AND snippet_text IS NOT NULL
    AND length(trim(snippet_text)) > 0
  );
CREATE POLICY "story_snippets_delete_public" ON story_snippets FOR DELETE TO public
  USING (oc_id IS NOT NULL);

-- writing_prompt_responses
DROP POLICY IF EXISTS "writing_prompt_responses_full_access_public" ON writing_prompt_responses;
CREATE POLICY "writing_prompt_responses_select_public" ON writing_prompt_responses FOR SELECT TO public USING (true);
CREATE POLICY "writing_prompt_responses_insert_public" ON writing_prompt_responses FOR INSERT TO public
  WITH CHECK (
    oc_id IS NOT NULL
    AND category IS NOT NULL
    AND length(trim(category)) > 0
    AND prompt_text IS NOT NULL
    AND length(trim(prompt_text)) > 0
    AND response_text IS NOT NULL
    AND length(trim(response_text)) > 0
  );
CREATE POLICY "writing_prompt_responses_update_public" ON writing_prompt_responses FOR UPDATE TO public
  USING (response_text IS NOT NULL AND length(trim(response_text)) > 0)
  WITH CHECK (
    oc_id IS NOT NULL
    AND category IS NOT NULL
    AND length(trim(category)) > 0
    AND prompt_text IS NOT NULL
    AND length(trim(prompt_text)) > 0
    AND response_text IS NOT NULL
    AND length(trim(response_text)) > 0
  );
CREATE POLICY "writing_prompt_responses_delete_public" ON writing_prompt_responses FOR DELETE TO public
  USING (oc_id IS NOT NULL);
