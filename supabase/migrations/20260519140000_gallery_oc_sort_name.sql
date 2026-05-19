-- Admin gallery "Name" sort: linked character name (MIN when multiple), not Drive filename.

ALTER TABLE public.gallery_items
  ADD COLUMN IF NOT EXISTS oc_sort_name text;

COMMENT ON COLUMN public.gallery_items.oc_sort_name IS
  'MIN(linked OC name) for admin list sort; maintained by triggers on gallery_item_ocs and ocs.name.';

UPDATE public.gallery_items AS gi
SET oc_sort_name = sub.min_name
FROM (
  SELECT gio.gallery_item_id, MIN(o.name) AS min_name
  FROM public.gallery_item_ocs AS gio
  INNER JOIN public.ocs AS o ON o.id = gio.oc_id
  GROUP BY gio.gallery_item_id
) AS sub
WHERE gi.id = sub.gallery_item_id;

UPDATE public.gallery_items AS gi
SET oc_sort_name = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.gallery_item_ocs AS gio WHERE gio.gallery_item_id = gi.id
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_oc_sort_name
  ON public.gallery_items (oc_sort_name ASC NULLS LAST, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_gallery_item_oc_sort_name(p_item_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = pg_catalog, public
AS $$
  UPDATE public.gallery_items AS gi
  SET oc_sort_name = (
    SELECT MIN(o.name)
    FROM public.gallery_item_ocs AS gio
    INNER JOIN public.ocs AS o ON o.id = gio.oc_id
    WHERE gio.gallery_item_id = p_item_id
  )
  WHERE gi.id = p_item_id;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_gallery_item_oc_sort_name_from_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM public.sync_gallery_item_oc_sort_name(COALESCE(NEW.gallery_item_id, OLD.gallery_item_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_gallery_item_oc_sort_name_on_links ON public.gallery_item_ocs;
CREATE TRIGGER sync_gallery_item_oc_sort_name_on_links
  AFTER INSERT OR UPDATE OR DELETE ON public.gallery_item_ocs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_gallery_item_oc_sort_name_from_links();

CREATE OR REPLACE FUNCTION public.trg_sync_gallery_items_oc_sort_name_on_oc_rename()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.gallery_items AS gi
    SET oc_sort_name = sub.min_name
    FROM (
      SELECT gio.gallery_item_id, MIN(o.name) AS min_name
      FROM public.gallery_item_ocs AS gio
      INNER JOIN public.ocs AS o ON o.id = gio.oc_id
      WHERE gio.oc_id = NEW.id
      GROUP BY gio.gallery_item_id
    ) AS sub
    WHERE gi.id = sub.gallery_item_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_gallery_items_oc_sort_name_on_oc_rename ON public.ocs;
CREATE TRIGGER sync_gallery_items_oc_sort_name_on_oc_rename
  AFTER UPDATE OF name ON public.ocs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_gallery_items_oc_sort_name_on_oc_rename();

REVOKE ALL ON FUNCTION public.sync_gallery_item_oc_sort_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_gallery_item_oc_sort_name(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.sync_gallery_item_oc_sort_name(uuid) TO service_role;
