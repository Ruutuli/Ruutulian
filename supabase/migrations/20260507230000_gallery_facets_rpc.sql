-- Fast facet aggregation + index for published gallery listing (avoids loading every row for filter chips).

CREATE INDEX IF NOT EXISTS idx_gallery_items_published_list
  ON public.gallery_items (published, sort_order ASC, created_at DESC);

-- One round-trip for tag + character filter options (small JSON payload).
CREATE OR REPLACE FUNCTION public.get_gallery_public_facets()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'published_count',
    (SELECT count(*)::int FROM public.gallery_items AS gi WHERE gi.published = true),
    'tags',
    COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(x.tag) ORDER BY x.tag)
        FROM (
          SELECT DISTINCT trim(t) AS tag
          FROM public.gallery_items AS gi
          CROSS JOIN LATERAL unnest(gi.tags) AS u(t)
          WHERE gi.published = true
            AND trim(t) <> ''
        ) AS x
      ),
      '[]'::jsonb
    ),
    'characters',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('slug', c.slug, 'name', c.name)
          ORDER BY c.name, c.slug
        )
        FROM (
          SELECT DISTINCT o.slug, o.name
          FROM public.gallery_item_ocs AS gio
          INNER JOIN public.gallery_items AS gi
            ON gi.id = gio.gallery_item_id
            AND gi.published = true
          INNER JOIN public.ocs AS o
            ON o.id = gio.oc_id
            AND o.is_public = true
        ) AS c
      ),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_gallery_public_facets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gallery_public_facets() TO anon;
GRANT EXECUTE ON FUNCTION public.get_gallery_public_facets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gallery_public_facets() TO service_role;
