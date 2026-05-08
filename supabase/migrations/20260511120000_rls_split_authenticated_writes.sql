-- Linter 0024 (rls_policy_always_true): split authenticated FOR ALL policies that use true/true.
-- SELECT with USING (true) stays allowed; writes need non-literal USING / WITH CHECK (same approach as 20260510121000).
-- Also drops duplicate / dashboard policy names reported by the linter.

-- ---------------------------------------------------------------------------
-- current_projects
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated admin writes" ON current_projects;
DROP POLICY IF EXISTS "Authenticated users can manage current projects" ON current_projects;
CREATE POLICY "Authenticated users can insert current projects" ON current_projects FOR INSERT TO authenticated
  WITH CHECK (
    description IS NOT NULL
    AND length(trim(description)) > 0
    AND project_items IS NOT NULL
  );
CREATE POLICY "Authenticated users can update current projects" ON current_projects FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    description IS NOT NULL
    AND length(trim(description)) > 0
    AND project_items IS NOT NULL
  );
CREATE POLICY "Authenticated users can delete current projects" ON current_projects FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- dropdown_options
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated admin writes" ON dropdown_options;
DROP POLICY IF EXISTS "Authenticated users can manage dropdown options" ON dropdown_options;
CREATE POLICY "Authenticated users can insert dropdown options" ON dropdown_options FOR INSERT TO authenticated
  WITH CHECK (
    field IS NOT NULL
    AND length(trim(field)) > 0
    AND option IS NOT NULL
    AND length(trim(option)) > 0
  );
CREATE POLICY "Authenticated users can update dropdown options" ON dropdown_options FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    field IS NOT NULL
    AND length(trim(field)) > 0
    AND option IS NOT NULL
    AND length(trim(option)) > 0
  );
CREATE POLICY "Authenticated users can delete dropdown options" ON dropdown_options FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- fanfics
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage fanfics" ON fanfics;
CREATE POLICY "Authenticated users can insert fanfics" ON fanfics FOR INSERT TO authenticated
  WITH CHECK (
    title IS NOT NULL
    AND length(trim(title)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
    AND world_id IS NOT NULL
  );
CREATE POLICY "Authenticated users can update fanfics" ON fanfics FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    title IS NOT NULL
    AND length(trim(title)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
    AND world_id IS NOT NULL
  );
CREATE POLICY "Authenticated users can delete fanfics" ON fanfics FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- fanfic_characters
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage fanfic characters" ON fanfic_characters;
CREATE POLICY "Authenticated users can insert fanfic characters" ON fanfic_characters FOR INSERT TO authenticated
  WITH CHECK (
    fanfic_id IS NOT NULL
    AND (oc_id IS NOT NULL OR (name IS NOT NULL AND length(trim(name)) > 0))
  );
CREATE POLICY "Authenticated users can update fanfic characters" ON fanfic_characters FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    fanfic_id IS NOT NULL
    AND (oc_id IS NOT NULL OR (name IS NOT NULL AND length(trim(name)) > 0))
  );
CREATE POLICY "Authenticated users can delete fanfic characters" ON fanfic_characters FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- fanfic_chapters
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage fanfic chapters" ON fanfic_chapters;
CREATE POLICY "Authenticated users can insert fanfic chapters" ON fanfic_chapters FOR INSERT TO authenticated
  WITH CHECK (fanfic_id IS NOT NULL AND chapter_number IS NOT NULL);
CREATE POLICY "Authenticated users can update fanfic chapters" ON fanfic_chapters FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (fanfic_id IS NOT NULL AND chapter_number IS NOT NULL);
CREATE POLICY "Authenticated users can delete fanfic chapters" ON fanfic_chapters FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- fanfic_relationships
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage fanfic relationships" ON fanfic_relationships;
CREATE POLICY "Authenticated users can insert fanfic relationships" ON fanfic_relationships FOR INSERT TO authenticated
  WITH CHECK (
    fanfic_id IS NOT NULL
    AND relationship_text IS NOT NULL
    AND length(trim(relationship_text)) > 0
  );
CREATE POLICY "Authenticated users can update fanfic relationships" ON fanfic_relationships FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    fanfic_id IS NOT NULL
    AND relationship_text IS NOT NULL
    AND length(trim(relationship_text)) > 0
  );
CREATE POLICY "Authenticated users can delete fanfic relationships" ON fanfic_relationships FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- fanfic_tags
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage fanfic tags" ON fanfic_tags;
CREATE POLICY "Authenticated users can insert fanfic tags" ON fanfic_tags FOR INSERT TO authenticated
  WITH CHECK (fanfic_id IS NOT NULL AND tag_id IS NOT NULL);
CREATE POLICY "Authenticated users can update fanfic tags" ON fanfic_tags FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (fanfic_id IS NOT NULL AND tag_id IS NOT NULL);
CREATE POLICY "Authenticated users can delete fanfic tags" ON fanfic_tags FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- oc_identities
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage identities" ON oc_identities;
DROP POLICY IF EXISTS "Authenticated users can manage oc identities" ON oc_identities;
CREATE POLICY "Authenticated users can insert oc identities" ON oc_identities FOR INSERT TO authenticated
  WITH CHECK (name IS NOT NULL AND length(trim(name)) > 0);
CREATE POLICY "Authenticated users can update oc identities" ON oc_identities FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (name IS NOT NULL AND length(trim(name)) > 0);
CREATE POLICY "Authenticated users can delete oc identities" ON oc_identities FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- ocs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage ocs" ON ocs;
CREATE POLICY "Authenticated users can insert ocs" ON ocs FOR INSERT TO authenticated
  WITH CHECK (
    name IS NOT NULL
    AND length(trim(name)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
    AND template_type IS NOT NULL
    AND length(trim(template_type)) > 0
  );
CREATE POLICY "Authenticated users can update ocs" ON ocs FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    name IS NOT NULL
    AND length(trim(name)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
    AND template_type IS NOT NULL
    AND length(trim(template_type)) > 0
  );
CREATE POLICY "Authenticated users can delete ocs" ON ocs FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- site_settings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can update site settings" ON site_settings;
DROP POLICY IF EXISTS "Authenticated users can insert site settings" ON site_settings;
CREATE POLICY "Authenticated users can insert site settings" ON site_settings FOR INSERT TO authenticated
  WITH CHECK (
    website_name IS NOT NULL
    AND length(trim(website_name)) > 0
    AND website_description IS NOT NULL
    AND icon_url IS NOT NULL
    AND length(trim(icon_url)) > 0
    AND site_url IS NOT NULL
    AND length(trim(site_url)) > 0
    AND author_name IS NOT NULL
    AND short_name IS NOT NULL
    AND length(trim(short_name)) > 0
  );
CREATE POLICY "Authenticated users can update site settings" ON site_settings FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    website_name IS NOT NULL
    AND length(trim(website_name)) > 0
    AND website_description IS NOT NULL
    AND icon_url IS NOT NULL
    AND length(trim(icon_url)) > 0
    AND site_url IS NOT NULL
    AND length(trim(site_url)) > 0
    AND author_name IS NOT NULL
    AND short_name IS NOT NULL
    AND length(trim(short_name)) > 0
  );

-- ---------------------------------------------------------------------------
-- story_aliases
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage story aliases" ON story_aliases;
DROP POLICY IF EXISTS "Authenticated users can manage story_aliases" ON story_aliases;
CREATE POLICY "Authenticated users can insert story aliases" ON story_aliases FOR INSERT TO authenticated
  WITH CHECK (
    world_id IS NOT NULL
    AND name IS NOT NULL
    AND length(trim(name)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
  );
CREATE POLICY "Authenticated users can update story aliases" ON story_aliases FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    world_id IS NOT NULL
    AND name IS NOT NULL
    AND length(trim(name)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
  );
CREATE POLICY "Authenticated users can delete story aliases" ON story_aliases FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- timeline_event_characters
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage timeline event characters" ON timeline_event_characters;
DROP POLICY IF EXISTS "Authenticated users can manage timeline_event_characters" ON timeline_event_characters;
CREATE POLICY "Authenticated users can insert timeline event characters" ON timeline_event_characters FOR INSERT TO authenticated
  WITH CHECK (
    timeline_event_id IS NOT NULL
    AND (oc_id IS NOT NULL OR (custom_name IS NOT NULL AND length(trim(custom_name)) > 0))
  );
CREATE POLICY "Authenticated users can update timeline event characters" ON timeline_event_characters FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    timeline_event_id IS NOT NULL
    AND (oc_id IS NOT NULL OR (custom_name IS NOT NULL AND length(trim(custom_name)) > 0))
  );
CREATE POLICY "Authenticated users can delete timeline event characters" ON timeline_event_characters FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- timeline_event_timelines
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage timeline event timelines" ON timeline_event_timelines;
DROP POLICY IF EXISTS "Authenticated users can manage timeline_event_timelines" ON timeline_event_timelines;
CREATE POLICY "Authenticated users can insert timeline event timelines" ON timeline_event_timelines FOR INSERT TO authenticated
  WITH CHECK (timeline_id IS NOT NULL AND timeline_event_id IS NOT NULL);
CREATE POLICY "Authenticated users can update timeline event timelines" ON timeline_event_timelines FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (timeline_id IS NOT NULL AND timeline_event_id IS NOT NULL);
CREATE POLICY "Authenticated users can delete timeline event timelines" ON timeline_event_timelines FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- timeline_events
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage timeline events" ON timeline_events;
DROP POLICY IF EXISTS "Authenticated users can manage timeline_events" ON timeline_events;
CREATE POLICY "Authenticated users can insert timeline events" ON timeline_events FOR INSERT TO authenticated
  WITH CHECK (
    world_id IS NOT NULL
    AND title IS NOT NULL
    AND length(trim(title)) > 0
  );
CREATE POLICY "Authenticated users can update timeline events" ON timeline_events FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    world_id IS NOT NULL
    AND title IS NOT NULL
    AND length(trim(title)) > 0
  );
CREATE POLICY "Authenticated users can delete timeline events" ON timeline_events FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- timelines
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage timelines" ON timelines;
CREATE POLICY "Authenticated users can insert timelines" ON timelines FOR INSERT TO authenticated
  WITH CHECK (
    world_id IS NOT NULL
    AND name IS NOT NULL
    AND length(trim(name)) > 0
  );
CREATE POLICY "Authenticated users can update timelines" ON timelines FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    world_id IS NOT NULL
    AND name IS NOT NULL
    AND length(trim(name)) > 0
  );
CREATE POLICY "Authenticated users can delete timelines" ON timelines FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- world_lore
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage world lore" ON world_lore;
DROP POLICY IF EXISTS "Authenticated users can manage world_lore" ON world_lore;
CREATE POLICY "Authenticated users can insert world lore" ON world_lore FOR INSERT TO authenticated
  WITH CHECK (
    name IS NOT NULL
    AND length(trim(name)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
    AND world_id IS NOT NULL
    AND lore_type IS NOT NULL
    AND length(trim(lore_type)) > 0
  );
CREATE POLICY "Authenticated users can update world lore" ON world_lore FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    name IS NOT NULL
    AND length(trim(name)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
    AND world_id IS NOT NULL
    AND lore_type IS NOT NULL
    AND length(trim(lore_type)) > 0
  );
CREATE POLICY "Authenticated users can delete world lore" ON world_lore FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- world_lore_ocs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage world lore ocs" ON world_lore_ocs;
DROP POLICY IF EXISTS "Authenticated users can manage world_lore_ocs" ON world_lore_ocs;
CREATE POLICY "Authenticated users can insert world lore ocs" ON world_lore_ocs FOR INSERT TO authenticated
  WITH CHECK (world_lore_id IS NOT NULL AND oc_id IS NOT NULL);
CREATE POLICY "Authenticated users can update world lore ocs" ON world_lore_ocs FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (world_lore_id IS NOT NULL AND oc_id IS NOT NULL);
CREATE POLICY "Authenticated users can delete world lore ocs" ON world_lore_ocs FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- world_lore_timeline_events
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage world lore timeline events" ON world_lore_timeline_events;
DROP POLICY IF EXISTS "Authenticated users can manage world_lore_timeline_events" ON world_lore_timeline_events;
CREATE POLICY "Authenticated users can insert world lore timeline events" ON world_lore_timeline_events FOR INSERT TO authenticated
  WITH CHECK (world_lore_id IS NOT NULL AND timeline_event_id IS NOT NULL);
CREATE POLICY "Authenticated users can update world lore timeline events" ON world_lore_timeline_events FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (world_lore_id IS NOT NULL AND timeline_event_id IS NOT NULL);
CREATE POLICY "Authenticated users can delete world lore timeline events" ON world_lore_timeline_events FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- world_races
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage world races" ON world_races;
CREATE POLICY "Authenticated users can insert world races" ON world_races FOR INSERT TO authenticated
  WITH CHECK (
    world_id IS NOT NULL
    AND name IS NOT NULL
    AND length(trim(name)) > 0
  );
CREATE POLICY "Authenticated users can update world races" ON world_races FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    world_id IS NOT NULL
    AND name IS NOT NULL
    AND length(trim(name)) > 0
  );
CREATE POLICY "Authenticated users can delete world races" ON world_races FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- world_story_data
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage world story data" ON world_story_data;
CREATE POLICY "Authenticated users can insert world story data" ON world_story_data FOR INSERT TO authenticated
  WITH CHECK (world_id IS NOT NULL);
CREATE POLICY "Authenticated users can update world story data" ON world_story_data FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (world_id IS NOT NULL);
CREATE POLICY "Authenticated users can delete world story data" ON world_story_data FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- worlds
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage worlds" ON worlds;
CREATE POLICY "Authenticated users can insert worlds" ON worlds FOR INSERT TO authenticated
  WITH CHECK (
    name IS NOT NULL
    AND length(trim(name)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
    AND series_type IS NOT NULL
    AND summary IS NOT NULL
    AND length(trim(summary)) > 0
    AND primary_color IS NOT NULL
    AND length(trim(primary_color)) > 0
    AND accent_color IS NOT NULL
    AND length(trim(accent_color)) > 0
  );
CREATE POLICY "Authenticated users can update worlds" ON worlds FOR UPDATE TO authenticated
  USING (id IS NOT NULL)
  WITH CHECK (
    name IS NOT NULL
    AND length(trim(name)) > 0
    AND slug IS NOT NULL
    AND length(trim(slug)) > 0
    AND series_type IS NOT NULL
    AND summary IS NOT NULL
    AND length(trim(summary)) > 0
    AND primary_color IS NOT NULL
    AND length(trim(primary_color)) > 0
    AND accent_color IS NOT NULL
    AND length(trim(accent_color)) > 0
  );
CREATE POLICY "Authenticated users can delete worlds" ON worlds FOR DELETE TO authenticated
  USING (id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- fanfic_worlds (exists on some deployments; not in baseline migrations)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.fanfic_worlds') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated admin writes" ON public.fanfic_worlds';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can manage fanfic worlds" ON public.fanfic_worlds';
    EXECUTE $sql$
      CREATE POLICY "Authenticated users can insert fanfic worlds" ON public.fanfic_worlds FOR INSERT TO authenticated
        WITH CHECK (fanfic_id IS NOT NULL AND world_id IS NOT NULL);
    $sql$;
    EXECUTE $sql$
      CREATE POLICY "Authenticated users can update fanfic worlds" ON public.fanfic_worlds FOR UPDATE TO authenticated
        USING (fanfic_id IS NOT NULL AND world_id IS NOT NULL)
        WITH CHECK (fanfic_id IS NOT NULL AND world_id IS NOT NULL);
    $sql$;
    EXECUTE $sql$
      CREATE POLICY "Authenticated users can delete fanfic worlds" ON public.fanfic_worlds FOR DELETE TO authenticated
        USING (fanfic_id IS NOT NULL AND world_id IS NOT NULL);
    $sql$;
  END IF;
END
$$;
