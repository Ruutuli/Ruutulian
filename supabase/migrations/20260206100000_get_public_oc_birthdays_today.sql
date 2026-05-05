-- Server-side birthday matching for public OCs (avoids loading every DOB row into Node).
-- Mirrors home page logic: ISO YYYY-M-D and slash M/D[/Y].
CREATE OR REPLACE FUNCTION public.get_public_oc_birthdays_today(p_month integer, p_day integer)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  date_of_birth text,
  image_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.slug, o.date_of_birth, o.image_url
  FROM public.ocs o
  WHERE o.is_public IS TRUE
    AND o.date_of_birth IS NOT NULL
    AND btrim(o.date_of_birth) <> ''
    AND (
      (
        btrim(o.date_of_birth) ~ '^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$'
        AND split_part(btrim(o.date_of_birth), '-', 2)::integer = p_month
        AND split_part(btrim(o.date_of_birth), '-', 3)::integer = p_day
      )
      OR (
        btrim(o.date_of_birth) ~ '^[0-9]{1,2}/[0-9]{1,2}(/[0-9]{4})?$'
        AND split_part(btrim(o.date_of_birth), '/', 1)::integer = p_month
        AND split_part(btrim(o.date_of_birth), '/', 2)::integer = p_day
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_oc_birthdays_today(integer, integer) TO anon, authenticated;
