-- Pre-aggregate public site statistics server-side (avoids shipping every OC row to the client).

CREATE OR REPLACE FUNCTION public.get_public_site_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_public_oc_count bigint;
  v_all_oc_count bigint;
  v_public_world_count bigint;
  v_all_world_count bigint;
  v_with_birthday bigint;
  v_ages_count bigint;
  v_with_dnd bigint;
BEGIN
  SELECT count(*) INTO v_public_oc_count FROM ocs WHERE is_public IS TRUE;
  SELECT count(*) INTO v_all_oc_count FROM ocs;
  SELECT count(*) INTO v_public_world_count FROM worlds WHERE is_public IS TRUE;
  SELECT count(*) INTO v_all_world_count FROM worlds;
  SELECT count(*) INTO v_with_birthday FROM ocs WHERE is_public IS TRUE AND date_of_birth IS NOT NULL AND btrim(date_of_birth) <> '';
  SELECT count(*) INTO v_ages_count FROM ocs WHERE is_public IS TRUE AND age IS NOT NULL;
  SELECT count(*) INTO v_with_dnd FROM ocs WHERE is_public IS TRUE AND (
    stat_strength IS NOT NULL OR stat_dexterity IS NOT NULL OR stat_constitution IS NOT NULL
    OR stat_intelligence IS NOT NULL OR stat_wisdom IS NOT NULL OR stat_charisma IS NOT NULL
  );

  RETURN jsonb_build_object(
    'counts', jsonb_build_object(
      'public_worlds', v_public_world_count,
      'all_worlds', v_all_world_count,
      'public_ocs', v_public_oc_count,
      'all_ocs', v_all_oc_count,
      'public_lore', (SELECT count(*) FROM world_lore WHERE is_public IS TRUE),
      'all_lore', (SELECT count(*) FROM world_lore),
      'timeline_events', (SELECT count(*) FROM timeline_events),
      'timelines', (SELECT count(*) FROM timelines),
      'identities', (SELECT count(*) FROM oc_identities)
    ),
    'world_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(w.name, o.world_name, 'Unknown') AS label, count(*)::int AS cnt
        FROM ocs o
        LEFT JOIN worlds w ON w.id = o.world_id
        WHERE o.is_public IS TRUE
        GROUP BY 1
        ORDER BY cnt DESC
        LIMIT 15
      ) sub
    ), '[]'::jsonb),
    'series_type_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', initcap(coalesce(series_type, 'unknown')),
        'count', cnt,
        'percentage', CASE WHEN v_public_world_count > 0 THEN round((cnt::numeric * 100) / v_public_world_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(series_type, 'unknown') AS series_type, count(*)::int AS cnt
        FROM worlds WHERE is_public IS TRUE GROUP BY 1
      ) sub
    ), '[]'::jsonb),
    'template_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', initcap(replace(coalesce(template_type, 'unknown'), '-', ' ')),
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(template_type, 'unknown') AS template_type, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1
      ) sub
    ), '[]'::jsonb),
    'gender_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ))
      FROM (
        SELECT coalesce(nullif(btrim(gender), ''), 'not specified') AS label, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1
      ) sub
    ), '[]'::jsonb),
    'sex_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ))
      FROM (
        SELECT coalesce(nullif(btrim(sex), ''), 'not specified') AS label, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1
      ) sub
    ), '[]'::jsonb),
    'pronoun_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(nullif(btrim(pronouns), ''), 'not specified') AS label, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1 ORDER BY cnt DESC LIMIT 10
      ) sub
    ), '[]'::jsonb),
    'alignment_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(nullif(btrim(alignment), ''), 'not specified') AS label, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1
      ) sub
    ), '[]'::jsonb),
    'age_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_ages_count > 0 THEN round((cnt::numeric * 100) / v_ages_count) ELSE 0 END
      ))
      FROM (
        SELECT label, count(*)::int AS cnt FROM (
          SELECT CASE
            WHEN age <= 10 THEN '0-10'
            WHEN age <= 20 THEN '11-20'
            WHEN age <= 30 THEN '21-30'
            WHEN age <= 40 THEN '31-40'
            WHEN age <= 50 THEN '41-50'
            WHEN age <= 60 THEN '51-60'
            WHEN age <= 70 THEN '61-70'
            ELSE '71+'
          END AS label
          FROM ocs WHERE is_public IS TRUE AND age IS NOT NULL
        ) ranges GROUP BY label
      ) sub WHERE cnt > 0
    ), '[]'::jsonb),
    'age_summary', jsonb_build_object(
      'count', v_ages_count,
      'avg', COALESCE((SELECT round(avg(age)::numeric, 1) FROM ocs WHERE is_public IS TRUE AND age IS NOT NULL), 0),
      'min', COALESCE((SELECT min(age) FROM ocs WHERE is_public IS TRUE AND age IS NOT NULL), 0),
      'max', COALESCE((SELECT max(age) FROM ocs WHERE is_public IS TRUE AND age IS NOT NULL), 0)
    ),
    'birthday_month_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_with_birthday > 0 THEN round((cnt::numeric * 100) / v_with_birthday) ELSE 0 END
      ))
      FROM (
        SELECT to_char(d, 'FMMonth') AS label, count(*)::int AS cnt
        FROM (
          SELECT CASE
            WHEN btrim(date_of_birth) ~ '^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$' THEN
              make_date(
                split_part(btrim(date_of_birth), '-', 1)::int,
                split_part(btrim(date_of_birth), '-', 2)::int,
                split_part(btrim(date_of_birth), '-', 3)::int
              )
            WHEN btrim(date_of_birth) ~ '^[0-9]{1,2}/[0-9]{1,2}(/[0-9]{4})?$' THEN
              make_date(
                coalesce(nullif(split_part(btrim(date_of_birth), '/', 3), '')::int, 2000),
                split_part(btrim(date_of_birth), '/', 1)::int,
                split_part(btrim(date_of_birth), '/', 2)::int
              )
            ELSE NULL
          END AS d
          FROM ocs WHERE is_public IS TRUE AND date_of_birth IS NOT NULL AND btrim(date_of_birth) <> ''
        ) parsed WHERE d IS NOT NULL
        GROUP BY to_char(d, 'FMMonth'), extract(month from d)
        ORDER BY extract(month from d)
      ) sub
    ), '[]'::jsonb),
    'with_birthday', v_with_birthday,
    'star_sign_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(nullif(btrim(star_sign), ''), 'not specified') AS label, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1
      ) sub
    ), '[]'::jsonb),
    'romantic_orientation_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(nullif(btrim(romantic_orientation), ''), 'not specified') AS label, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1 ORDER BY cnt DESC LIMIT 8
      ) sub
    ), '[]'::jsonb),
    'sexual_orientation_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(nullif(btrim(sexual_orientation), ''), 'not specified') AS label, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1 ORDER BY cnt DESC LIMIT 8
      ) sub
    ), '[]'::jsonb),
    'status_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', initcap(replace(label, '-', ' ')),
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(nullif(btrim(status), ''), 'unknown') AS label, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1
      ) sub
    ), '[]'::jsonb),
    'species_distribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', label,
        'count', cnt,
        'percentage', CASE WHEN v_public_oc_count > 0 THEN round((cnt::numeric * 100) / v_public_oc_count) ELSE 0 END
      ) ORDER BY cnt DESC)
      FROM (
        SELECT coalesce(
          nullif(btrim(species), ''),
          nullif(btrim(modular_fields->>'species'), ''),
          'not specified'
        ) AS label, count(*)::int AS cnt
        FROM ocs WHERE is_public IS TRUE GROUP BY 1 ORDER BY cnt DESC LIMIT 10
      ) sub
    ), '[]'::jsonb),
    'personality_averages', COALESCE((
      SELECT jsonb_object_agg(metric, round(avg_val::numeric, 1))
      FROM (
        SELECT 'sociability' AS metric, avg(sociability) AS avg_val FROM ocs WHERE is_public IS TRUE AND sociability IS NOT NULL
        UNION ALL SELECT 'communication_style', avg(communication_style) FROM ocs WHERE is_public IS TRUE AND communication_style IS NOT NULL
        UNION ALL SELECT 'judgment', avg(judgment) FROM ocs WHERE is_public IS TRUE AND judgment IS NOT NULL
        UNION ALL SELECT 'emotional_resilience', avg(emotional_resilience) FROM ocs WHERE is_public IS TRUE AND emotional_resilience IS NOT NULL
        UNION ALL SELECT 'courage', avg(courage) FROM ocs WHERE is_public IS TRUE AND courage IS NOT NULL
        UNION ALL SELECT 'risk_behavior', avg(risk_behavior) FROM ocs WHERE is_public IS TRUE AND risk_behavior IS NOT NULL
        UNION ALL SELECT 'honesty', avg(honesty) FROM ocs WHERE is_public IS TRUE AND honesty IS NOT NULL
        UNION ALL SELECT 'discipline', avg(discipline) FROM ocs WHERE is_public IS TRUE AND discipline IS NOT NULL
        UNION ALL SELECT 'temperament', avg(temperament) FROM ocs WHERE is_public IS TRUE AND temperament IS NOT NULL
        UNION ALL SELECT 'humor', avg(humor) FROM ocs WHERE is_public IS TRUE AND humor IS NOT NULL
      ) metrics WHERE avg_val IS NOT NULL
    ), '{}'::jsonb),
    'dnd_stats', jsonb_build_object(
      'count', v_with_dnd,
      'averages', jsonb_build_object(
        'strength', COALESCE((SELECT round(avg(stat_strength)) FROM ocs WHERE is_public IS TRUE AND stat_strength IS NOT NULL), 0),
        'dexterity', COALESCE((SELECT round(avg(stat_dexterity)) FROM ocs WHERE is_public IS TRUE AND stat_dexterity IS NOT NULL), 0),
        'constitution', COALESCE((SELECT round(avg(stat_constitution)) FROM ocs WHERE is_public IS TRUE AND stat_constitution IS NOT NULL), 0),
        'intelligence', COALESCE((SELECT round(avg(stat_intelligence)) FROM ocs WHERE is_public IS TRUE AND stat_intelligence IS NOT NULL), 0),
        'wisdom', COALESCE((SELECT round(avg(stat_wisdom)) FROM ocs WHERE is_public IS TRUE AND stat_wisdom IS NOT NULL), 0),
        'charisma', COALESCE((SELECT round(avg(stat_charisma)) FROM ocs WHERE is_public IS TRUE AND stat_charisma IS NOT NULL), 0)
      )
    ),
    'media', jsonb_build_object(
      'with_image', (SELECT count(*) FROM ocs WHERE is_public IS TRUE AND image_url IS NOT NULL AND btrim(image_url) <> ''),
      'with_icon', (SELECT count(*) FROM ocs WHERE is_public IS TRUE AND icon_url IS NOT NULL AND btrim(icon_url) <> ''),
      'with_gallery', (SELECT count(*) FROM ocs WHERE is_public IS TRUE AND gallery IS NOT NULL AND cardinality(gallery) > 0),
      'with_theme_song', (SELECT count(*) FROM ocs WHERE is_public IS TRUE AND theme_song IS NOT NULL AND btrim(theme_song) <> ''),
      'with_voice_actor', (SELECT count(*) FROM ocs WHERE is_public IS TRUE AND (
        (voice_actor IS NOT NULL AND btrim(voice_actor) <> '') OR (seiyuu IS NOT NULL AND btrim(seiyuu) <> '')
      ))
    ),
    'relationships', jsonb_build_object(
      'with_family', (SELECT count(*) FROM ocs WHERE is_public IS TRUE AND family IS NOT NULL AND btrim(family) <> ''),
      'with_friends', (SELECT count(*) FROM ocs WHERE is_public IS TRUE AND friends_allies IS NOT NULL AND btrim(friends_allies) <> ''),
      'with_rivals', (SELECT count(*) FROM ocs WHERE is_public IS TRUE AND rivals_enemies IS NOT NULL AND btrim(rivals_enemies) <> ''),
      'with_romantic', (SELECT count(*) FROM ocs WHERE is_public IS TRUE AND romantic IS NOT NULL AND btrim(romantic) <> '')
    ),
    'analytics_ocs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'image_url', image_url,
        'age', age,
        'view_count', coalesce(view_count, 0),
        'last_viewed_at', last_viewed_at,
        'updated_at', updated_at,
        'personality_summary', personality_summary,
        'history_summary', history_summary,
        'stat_strength', stat_strength,
        'stat_dexterity', stat_dexterity,
        'stat_constitution', stat_constitution,
        'stat_intelligence', stat_intelligence,
        'stat_wisdom', stat_wisdom,
        'stat_charisma', stat_charisma,
        'alignment', alignment,
        'status', status
      ) ORDER BY name)
      FROM ocs WHERE is_public IS TRUE
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_site_stats() TO anon, authenticated;
