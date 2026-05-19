-- Capped tag search for admin gallery (avoids huge ID lists in the API layer).

CREATE OR REPLACE FUNCTION public.admin_gallery_tag_search_ids(p_search text, p_limit int DEFAULT 100)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT gi.id
  FROM public.gallery_items AS gi
  WHERE trim(coalesce(p_search, '')) <> ''
    AND EXISTS (
      SELECT 1
      FROM unnest(gi.tags) AS t(tag)
      WHERE t.tag ILIKE '%' || p_search || '%'
    )
  LIMIT greatest(1, least(coalesce(p_limit, 100), 200));
$$;

REVOKE ALL ON FUNCTION public.admin_gallery_tag_search_ids(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_gallery_tag_search_ids(text, int) TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_gallery_tag_search_ids(text, int) TO service_role;
