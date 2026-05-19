-- Include published artwork count per character in gallery facet RPC.

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
          jsonb_build_object('slug', c.slug, 'name', c.name, 'count', c.cnt)
          ORDER BY c.name, c.slug
        )
        FROM (
          SELECT
            o.slug,
            o.name,
            count(DISTINCT gi.id)::int AS cnt
          FROM public.gallery_item_ocs AS gio
          INNER JOIN public.gallery_items AS gi
            ON gi.id = gio.gallery_item_id
            AND gi.published = true
          INNER JOIN public.ocs AS o
            ON o.id = gio.oc_id
            AND o.is_public = true
          GROUP BY o.slug, o.name
        ) AS c
      ),
      '[]'::jsonb
    )
  );
$$;
