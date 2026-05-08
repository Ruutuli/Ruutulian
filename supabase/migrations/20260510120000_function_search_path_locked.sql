-- Supabase linter 0011_function_search_path_mutable: pin search_path on SECURITY-sensitive functions.
-- Use pg_catalog, public so unqualified names resolve predictably (mitigates search_path injection).

ALTER FUNCTION public.update_site_settings_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_worlds_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_oc_identities_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_story_aliases_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_ocs_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_world_story_data_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_world_races_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_timelines_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_timeline_events_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_world_lore_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_dropdown_options_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_current_projects_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_character_quotes_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_tags_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_story_snippets_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_writing_prompts_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_writing_prompt_responses_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_fanfics_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_fanfic_chapters_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_gallery_items_updated_at() SET search_path = pg_catalog, public;

ALTER FUNCTION public.upsert_gallery_item_from_sync(text, text, text, text, timestamptz)
  SET search_path = pg_catalog, public;
