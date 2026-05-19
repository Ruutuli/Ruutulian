-- Page view analytics: event log + denormalized counters on content tables.
-- Public clients cannot UPDATE content rows (RLS); recording goes through SECURITY DEFINER RPCs.

CREATE TYPE public.page_entity_type AS ENUM (
  'oc',
  'world',
  'lore',
  'fanfic',
  'fanfic_chapter',
  'page'
);

CREATE TABLE IF NOT EXISTS public.page_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.page_entity_type NOT NULL,
  entity_id UUID,
  slug TEXT,
  path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_view_events_entity
  ON public.page_view_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_page_view_events_viewed_at
  ON public.page_view_events (viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_view_events_type_viewed
  ON public.page_view_events (entity_type, viewed_at DESC);

ALTER TABLE public.page_view_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read page_view_events" ON public.page_view_events;
CREATE POLICY "Authenticated can read page_view_events"
  ON public.page_view_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Denormalized counters for worlds, lore, fanfics (ocs already has these columns)
ALTER TABLE public.worlds ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.worlds ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
ALTER TABLE public.world_lore ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.world_lore ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
ALTER TABLE public.fanfics ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.fanfics ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'worlds_view_count_nonneg'
  ) THEN
    ALTER TABLE public.worlds
      ADD CONSTRAINT worlds_view_count_nonneg CHECK (view_count >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'world_lore_view_count_nonneg'
  ) THEN
    ALTER TABLE public.world_lore
      ADD CONSTRAINT world_lore_view_count_nonneg CHECK (view_count >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fanfics_view_count_nonneg'
  ) THEN
    ALTER TABLE public.fanfics
      ADD CONSTRAINT fanfics_view_count_nonneg CHECK (view_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_worlds_view_count ON public.worlds (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_world_lore_view_count ON public.world_lore (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_fanfics_view_count ON public.fanfics (view_count DESC);

CREATE OR REPLACE FUNCTION public.record_page_view(
  p_entity_type text,
  p_slug text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_path text DEFAULT NULL,
  p_world_slug text DEFAULT NULL,
  p_chapter_number integer DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_type public.page_entity_type;
  v_id uuid;
  v_slug text;
  v_is_public boolean;
  v_view_count integer;
  v_path text;
  v_meta jsonb;
BEGIN
  BEGIN
    v_entity_type := p_entity_type::public.page_entity_type;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_entity_type');
  END;

  v_meta := COALESCE(p_metadata, '{}'::jsonb);
  v_path := NULLIF(btrim(p_path), '');

  CASE v_entity_type
    WHEN 'oc' THEN
      SELECT o.id, o.slug, o.is_public, o.view_count
      INTO v_id, v_slug, v_is_public, v_view_count
      FROM public.ocs o
      WHERE (
        p_entity_id IS NOT NULL AND o.id = p_entity_id
      ) OR (
        p_slug IS NOT NULL AND o.slug = p_slug
      )
      ORDER BY o.created_at
      LIMIT 1;

      IF v_id IS NULL OR NOT COALESCE(v_is_public, false) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
      END IF;

      INSERT INTO public.page_view_events (entity_type, entity_id, slug, path, metadata)
      VALUES (v_entity_type, v_id, v_slug, v_path, v_meta);

      UPDATE public.ocs
      SET view_count = COALESCE(view_count, 0) + 1,
          last_viewed_at = NOW()
      WHERE id = v_id
      RETURNING view_count INTO v_view_count;

    WHEN 'world' THEN
      SELECT w.id, w.slug, w.is_public, w.view_count
      INTO v_id, v_slug, v_is_public, v_view_count
      FROM public.worlds w
      WHERE (
        p_entity_id IS NOT NULL AND w.id = p_entity_id
      ) OR (
        p_slug IS NOT NULL AND w.slug = p_slug
      )
      LIMIT 1;

      IF v_id IS NULL OR NOT COALESCE(v_is_public, false) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
      END IF;

      INSERT INTO public.page_view_events (entity_type, entity_id, slug, path, metadata)
      VALUES (v_entity_type, v_id, v_slug, v_path, v_meta);

      UPDATE public.worlds
      SET view_count = COALESCE(view_count, 0) + 1,
          last_viewed_at = NOW()
      WHERE id = v_id
      RETURNING view_count INTO v_view_count;

    WHEN 'lore' THEN
      SELECT wl.id, wl.slug, wl.is_public, wl.view_count
      INTO v_id, v_slug, v_is_public, v_view_count
      FROM public.world_lore wl
      INNER JOIN public.worlds w ON w.id = wl.world_id
      WHERE wl.is_public IS TRUE
        AND w.is_public IS TRUE
        AND (
          (p_entity_id IS NOT NULL AND wl.id = p_entity_id)
          OR (
            p_slug IS NOT NULL
            AND wl.slug = p_slug
            AND (
              p_world_slug IS NULL
              OR w.slug = p_world_slug
            )
          )
        )
      LIMIT 1;

      IF v_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
      END IF;

      INSERT INTO public.page_view_events (entity_type, entity_id, slug, path, metadata)
      VALUES (v_entity_type, v_id, v_slug, v_path, v_meta);

      UPDATE public.world_lore
      SET view_count = COALESCE(view_count, 0) + 1,
          last_viewed_at = NOW()
      WHERE id = v_id
      RETURNING view_count INTO v_view_count;

    WHEN 'fanfic' THEN
      SELECT f.id, f.slug, f.is_public, f.view_count
      INTO v_id, v_slug, v_is_public, v_view_count
      FROM public.fanfics f
      WHERE (
        p_entity_id IS NOT NULL AND f.id = p_entity_id
      ) OR (
        p_slug IS NOT NULL AND f.slug = p_slug
      )
      LIMIT 1;

      IF v_id IS NULL OR NOT COALESCE(v_is_public, false) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
      END IF;

      INSERT INTO public.page_view_events (entity_type, entity_id, slug, path, metadata)
      VALUES (v_entity_type, v_id, v_slug, v_path, v_meta);

      UPDATE public.fanfics
      SET view_count = COALESCE(view_count, 0) + 1,
          last_viewed_at = NOW()
      WHERE id = v_id
      RETURNING view_count INTO v_view_count;

    WHEN 'fanfic_chapter' THEN
      SELECT f.id, f.slug, f.is_public, f.view_count
      INTO v_id, v_slug, v_is_public, v_view_count
      FROM public.fanfics f
      INNER JOIN public.fanfic_chapters fc ON fc.fanfic_id = f.id
      WHERE f.is_public IS TRUE
        AND fc.is_published IS TRUE
        AND (
          (p_entity_id IS NOT NULL AND f.id = p_entity_id)
          OR (p_slug IS NOT NULL AND f.slug = p_slug)
        )
        AND (
          p_chapter_number IS NULL
          OR fc.chapter_number = p_chapter_number
        )
      LIMIT 1;

      IF v_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
      END IF;

      v_meta := v_meta || jsonb_build_object(
        'chapter_number',
        p_chapter_number
      );

      INSERT INTO public.page_view_events (entity_type, entity_id, slug, path, metadata)
      VALUES (v_entity_type, v_id, v_slug, v_path, v_meta);

      UPDATE public.fanfics
      SET view_count = COALESCE(view_count, 0) + 1,
          last_viewed_at = NOW()
      WHERE id = v_id
      RETURNING view_count INTO v_view_count;

    WHEN 'page' THEN
      IF v_path IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'path_required');
      END IF;

      INSERT INTO public.page_view_events (entity_type, entity_id, slug, path, metadata)
      VALUES (v_entity_type, NULL, p_slug, v_path, v_meta);

      SELECT COUNT(*)::integer INTO v_view_count
      FROM public.page_view_events
      WHERE entity_type = 'page' AND path = v_path;

    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'unsupported_entity_type');
  END CASE;

  RETURN jsonb_build_object(
    'ok', true,
    'entity_type', v_entity_type::text,
    'entity_id', v_id,
    'slug', v_slug,
    'view_count', v_view_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_summary(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT NOW() - make_interval(days => GREATEST(p_days, 1)) AS since
  ),
  event_totals AS (
    SELECT
      COUNT(*)::integer AS total_views,
      COUNT(*) FILTER (WHERE e.viewed_at >= b.since)::integer AS views_in_period
    FROM public.page_view_events e
    CROSS JOIN bounds b
  ),
  period_by_type AS (
    SELECT
      e.entity_type::text AS entity_type,
      COUNT(*)::integer AS views
    FROM public.page_view_events e
    CROSS JOIN bounds b
    WHERE e.viewed_at >= b.since
    GROUP BY e.entity_type
  ),
  top_ocs AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'slug', o.slug,
          'view_count', COALESCE(o.view_count, 0),
          'last_viewed_at', o.last_viewed_at
        )
        ORDER BY COALESCE(o.view_count, 0) DESC, o.name ASC
      ),
      '[]'::jsonb
    ) AS items
    FROM (
      SELECT id, name, slug, view_count, last_viewed_at
      FROM public.ocs
      WHERE is_public IS TRUE AND COALESCE(view_count, 0) > 0
      ORDER BY view_count DESC, name ASC
      LIMIT 10
    ) o
  ),
  top_worlds AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', w.id,
          'name', w.name,
          'slug', w.slug,
          'view_count', COALESCE(w.view_count, 0),
          'last_viewed_at', w.last_viewed_at
        )
        ORDER BY COALESCE(w.view_count, 0) DESC, w.name ASC
      ),
      '[]'::jsonb
    ) AS items
    FROM (
      SELECT id, name, slug, view_count, last_viewed_at
      FROM public.worlds
      WHERE is_public IS TRUE AND COALESCE(view_count, 0) > 0
      ORDER BY view_count DESC, name ASC
      LIMIT 10
    ) w
  ),
  top_lore AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', wl.id,
          'name', wl.name,
          'slug', wl.slug,
          'world_slug', wl.world_slug,
          'view_count', COALESCE(wl.view_count, 0),
          'last_viewed_at', wl.last_viewed_at
        )
        ORDER BY COALESCE(wl.view_count, 0) DESC, wl.name ASC
      ),
      '[]'::jsonb
    ) AS items
    FROM (
      SELECT wl.id, wl.name, wl.slug, wl.view_count, wl.last_viewed_at, w.slug AS world_slug
      FROM public.world_lore wl
      INNER JOIN public.worlds w ON w.id = wl.world_id
      WHERE wl.is_public IS TRUE
        AND w.is_public IS TRUE
        AND COALESCE(wl.view_count, 0) > 0
      ORDER BY wl.view_count DESC, wl.name ASC
      LIMIT 10
    ) wl
  ),
  top_fanfics AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'title', f.title,
          'slug', f.slug,
          'view_count', COALESCE(f.view_count, 0),
          'last_viewed_at', f.last_viewed_at
        )
        ORDER BY COALESCE(f.view_count, 0) DESC, f.title ASC
      ),
      '[]'::jsonb
    ) AS items
    FROM (
      SELECT id, title, slug, view_count, last_viewed_at
      FROM public.fanfics
      WHERE is_public IS TRUE AND COALESCE(view_count, 0) > 0
      ORDER BY view_count DESC, title ASC
      LIMIT 10
    ) f
  )
  SELECT jsonb_build_object(
    'total_views', et.total_views,
    'views_in_period', et.views_in_period,
    'period_days', GREATEST(p_days, 1),
    'views_by_type', COALESCE(
      (SELECT jsonb_object_agg(pbt.entity_type, pbt.views) FROM period_by_type pbt),
      '{}'::jsonb
    ),
    'top_ocs', (SELECT items FROM top_ocs),
    'top_worlds', (SELECT items FROM top_worlds),
    'top_lore', (SELECT items FROM top_lore),
    'top_fanfics', (SELECT items FROM top_fanfics)
  )
  FROM event_totals et;
$$;

CREATE OR REPLACE FUNCTION public.get_recent_page_views(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id uuid,
  slug text,
  path text,
  metadata jsonb,
  viewed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.entity_type::text,
    e.entity_id,
    e.slug,
    e.path,
    e.metadata,
    e.viewed_at
  FROM public.page_view_events e
  ORDER BY e.viewed_at DESC
  LIMIT GREATEST(LEAST(p_limit, 200), 1);
$$;

GRANT EXECUTE ON FUNCTION public.record_page_view(
  text, text, uuid, text, text, integer, jsonb
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_analytics_summary(integer) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_recent_page_views(integer) TO authenticated;
