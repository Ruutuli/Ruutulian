-- Tighter fuzzy search: subsequence match only for short queries on character names/slugs.
-- Filenames, tags, and drive IDs use substring (ILIKE) only.

CREATE OR REPLACE FUNCTION public.gallery_text_fuzzy_match(haystack text, needle text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  h text := lower(regexp_replace(coalesce(haystack, ''), '[^a-z0-9]', '', 'g'));
  n text := lower(regexp_replace(coalesce(needle, ''), '[^a-z0-9]', '', 'g'));
  i int := 1;
  j int := 1;
BEGIN
  IF n = '' THEN
    RETURN true;
  END IF;
  IF h = '' THEN
    RETURN false;
  END IF;
  -- Subsequence fuzzy is only useful for short character-name lookups (e.g. naho → ItsNahochan).
  IF length(n) < 3 OR length(n) > 4 THEN
    RETURN false;
  END IF;
  WHILE i <= length(h) AND j <= length(n) LOOP
    IF substr(h, i, 1) = substr(n, j, 1) THEN
      j := j + 1;
    END IF;
    i := i + 1;
  END LOOP;
  RETURN j > length(n);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_gallery_search_ids(p_search text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT DISTINCT gi.id
  FROM public.gallery_items AS gi
  LEFT JOIN public.gallery_item_ocs AS gio ON gio.gallery_item_id = gi.id
  LEFT JOIN public.ocs AS o ON o.id = gio.oc_id
  WHERE trim(coalesce(p_search, '')) = ''
     OR gi.name ILIKE '%' || p_search || '%'
     OR gi.drive_file_id ILIKE '%' || p_search || '%'
     OR o.name ILIKE '%' || p_search || '%'
     OR o.slug ILIKE '%' || p_search || '%'
     OR public.gallery_text_fuzzy_match(o.name, p_search)
     OR public.gallery_text_fuzzy_match(o.slug, p_search)
     OR EXISTS (
       SELECT 1
       FROM unnest(gi.tags) AS t(tag)
       WHERE t.tag ILIKE '%' || p_search || '%'
     );
$$;
