-- Seed timeline data for Final Fantasy VII: "Astra inclinant, sed non obligant"
-- World ID: 6575230e-be28-4723-8a95-e30cc39f8480

-- First, create or get the story alias
DO $$
DECLARE
  v_world_id UUID := '6575230e-be28-4723-8a95-e30cc39f8480';
  v_story_alias_id UUID;
  v_timeline_id UUID;
BEGIN
  -- Get or create story alias
  INSERT INTO story_aliases (world_id, name, slug, description)
  VALUES (
    v_world_id,
    'Astra inclinant, sed non obligant',
    'astra-inclinant-sed-non-obligant',
    'A Final Fantasy VII fanfiction following Faye and Joel, Cetra hybrids, and their connection to Sephiroth, Genesis, and the broader events of the FFVII timeline.'
  )
  ON CONFLICT (world_id, slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_story_alias_id;

  -- If ON CONFLICT didn't return id, get it
  IF v_story_alias_id IS NULL THEN
    SELECT id INTO v_story_alias_id FROM story_aliases WHERE world_id = v_world_id AND slug = 'astra-inclinant-sed-non-obligant';
  END IF;

  -- Create the timeline if it doesn't exist
  SELECT id INTO v_timeline_id FROM timelines WHERE world_id = v_world_id AND story_alias_id = v_story_alias_id;
  
  IF v_timeline_id IS NULL THEN
    INSERT INTO timelines (world_id, name, description_markdown, date_format, era, story_alias_id)
    VALUES (
      v_world_id,
      'Astra inclinant, sed non obligant Timeline',
      'A comprehensive timeline of events in the "Astra inclinant, sed non obligant" story, covering the years εγλ 1976 through εγλ 0007.',
      '[era] – εγλ YYYY',
      'μ,ν',
      v_story_alias_id
    )
    RETURNING id INTO v_timeline_id;
  ELSE
    -- Update existing timeline
    UPDATE timelines
    SET name = 'Astra inclinant, sed non obligant Timeline',
        description_markdown = 'A comprehensive timeline of events in the "Astra inclinant, sed non obligant" story, covering the years εγλ 1976 through εγλ 0007.',
        date_format = '[era] – εγλ YYYY',
        era = 'μ,ν'
    WHERE id = v_timeline_id;
  END IF;

  -- Delete existing timeline events for this timeline to make the migration idempotent
  DELETE FROM timeline_events WHERE timeline_id = v_timeline_id AND story_alias_id = v_story_alias_id;

  -- Create timeline events
  -- εγλ 1976
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Construction of Midgar Complete',
    'June 24: Construction of Midgar is complete, and Shinra relocates headquarters to the Shinra Building in the center of the city.',
    '[ μ ] – εγλ 1976',
    1976,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1976', 'year', 1976, 'month', 6, 'day', 24),
    ARRAY['Construction', 'Shinra']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1977
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Key Events of εγλ 1977',
    E'**Characters:** Sephiroth (Not yet born), Genesis Rhapsodos (Not yet born), Angeal Hewley (Not yet born), Rufus Shinra (Born), Quinn Carlisle (23), Tseng (Born), Rude (Born)\n\n**Key Events:**\n- Rufus Shinra is Born\n- Tseng and Rude are Born\n- Project G and Project S Begin\n- Deepground Division Begins Experiments\n- Professor Gast Resigns\n- July 7: Jenova is officially "verified" as a Cetra.\n- September 13: The Jenova Project is approved. Mako Reactor 1 is authorized for use.',
    '[ μ ] – εγλ 1977',
    1977,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1977', 'year', 1977),
    ARRAY['Birth', 'Project', 'Shinra']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1978
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'The Births and Project Revival',
    E'**Characters:** Sephiroth (Born), Genesis Rhapsodos (Born), Angeal Hewley (Born), Rufus Shinra (1), Quinn Carlisle (24), Tseng (1), Rude (1)\n\n**Key Events:**\n- Sephiroth, Genesis, and Angeal are Born: Sephiroth is born as a result of Project S, while Genesis and Angeal are born under Project G.\n- Project Revival Begins: Quinn Carlisle starts Project Revival in Kalm, aiming to revive the Cetra race.',
    '[ μ ] – εγλ 1978',
    1978,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1978', 'year', 1978),
    ARRAY['Birth', 'Project']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1979
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Birth of Faye, Joel, and Reno',
    E'**Characters:** Sephiroth (1), Genesis Rhapsodos (1), Angeal Hewley (1), Faye (Born), Joel (Born), Rufus Shinra (2), Quinn Carlisle (25), Tseng (2), Rude (2), Reno (Born)\n\n**Key Events:**\n- Faye and Joel are Born\n- Reno is Born',
    '[ μ ] – εγλ 1979',
    1979,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1979', 'year', 1979),
    ARRAY['Birth']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1982
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Military Academy Enrollments',
    E'**Characters:** Sephiroth (4), Genesis Rhapsodos (4), Angeal Hewley (4), Faye (3), Joel (3), Rufus Shinra (5), Quinn Carlisle (28), Tseng (5), Rude (5), Reno (3)\n\n**Key Events:**\n- Rufus Joins the Military Academy: Rufus Shinra, at age 5\n- Rude, and Tseng Join the Military Academy: Reno, Rude, and Tseng begin their training at the Shinra Private Military Academy.',
    '[ μ ] – εγλ 1982',
    1982,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1982', 'year', 1982),
    ARRAY['Academy', 'Training']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1983
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Sephiroth Joins Academy',
    E'**Characters:** Sephiroth (5), Genesis Rhapsodos (5), Angeal Hewley (5), Faye (4), Joel (4), Rufus Shinra (6), Quinn Carlisle (29), Tseng (6), Rude (6), Reno (4)\n\n**Key Events:**\n- Sephiroth Joins the Shinra Military Academy: At age 5',
    '[ μ ] – εγλ 1983',
    1983,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1983', 'year', 1983),
    ARRAY['Academy', 'Training']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1984
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Birth of Zack Fair and Reno Joins Academy',
    E'**Characters:** Sephiroth (6), Genesis Rhapsodos (6), Angeal Hewley (6), Faye (5), Joel (5), Rufus Shinra (7), Quinn Carlisle (30), Tseng (7), Rude (7), Reno (5)\n\n**Key Events:**\n- Zack Fair is Born\n- Reno joins the military academy',
    '[ μ ] – εγλ 1984',
    1984,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1984', 'year', 1984),
    ARRAY['Birth', 'Academy']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1985
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Start of Wutai War and Genesis Joins Academy',
    E'**Characters:** Sephiroth (7), Genesis Rhapsodos (7), Angeal Hewley (7), Faye (6), Joel (6), Rufus Shinra (8), Quinn Carlisle (31), Tseng (8), Rude (8), Reno (6)\n\n**Key Events:**\n- Start of the Wutai War: The conflict between Wutai and Shinra begins.\n- Genesis Joins the Military Academy: Genesis Rhapsodos joins the Shinra Military Academy at age 7',
    '[ μ ] – εγλ 1985',
    1985,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1985', 'year', 1985),
    ARRAY['War', 'Academy']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1986
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Faye and Joel Move to Midgar and Join Academy',
    E'**Characters:** Sephiroth (8), Genesis Rhapsodos (8), Angeal Hewley (8), Faye (7), Joel (7), Rufus Shinra (9), Quinn Carlisle (32), Tseng (9), Rude (9), Reno (7)\n\n**Key Events:**\n- Faye and Joel Move to Midgar: The family relocates to Midgar.\n- Faye and Joel Join the Academy: Faye and Joel, at age 7, join the Shinra Military Academy, where they meet Sephiroth, Genesis, and Rufus.\n- Cloud Strife is Born\n- Faye and Joel join the SPMA',
    '[ μ ] – εγλ 1986',
    1986,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1986', 'year', 1986),
    ARRAY['Birth', 'Academy', 'Relocation']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1987
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Birth of Tifa Lockhart',
    E'**Characters:** Sephiroth (9), Genesis Rhapsodos (9), Angeal Hewley (9), Faye (8), Joel (8), Rufus Shinra (10), Quinn Carlisle (33), Tseng (10), Rude (10), Reno (8), Cloud Strife (1)\n\n**Key Events:**\n- Tifa Lockhart is Born: Tifa Lockhart is born on May 3.',
    '[ μ ] – εγλ 1987',
    1987,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1987', 'year', 1987, 'month', 5, 'day', 3),
    ARRAY['Birth']::TEXT[],
    false,
    v_story_alias_id
  );

  -- εγλ 1988
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'εγλ 1988',
    E'**Characters:** Sephiroth (10), Genesis Rhapsodos (10), Angeal Hewley (10), Faye (9), Joel (9), Rufus Shinra (11), Quinn Carlisle (34), Tseng (11), Rude (11), Reno (9), Cloud Strife (2), Tifa Lockhart (1)',
    '[ μ ] – εγλ 1988',
    1988,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1988', 'year', 1988),
    ARRAY[]::TEXT[],
    false,
    v_story_alias_id
  );

  -- εγλ 1989
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'εγλ 1989',
    E'**Characters:** Sephiroth (11), Genesis Rhapsodos (11), Angeal Hewley (11), Faye (10), Joel (10), Rufus Shinra (12), Quinn Carlisle (35), Tseng (12), Rude (12), Reno (10), Cloud Strife (3), Tifa Lockhart (2)',
    '[ μ ] – εγλ 1989',
    1989,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1989', 'year', 1989),
    ARRAY[]::TEXT[],
    false,
    v_story_alias_id
  );

  -- εγλ 1990
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Sephiroth Joins SOLDIER',
    E'**Characters:** Sephiroth (12), Genesis Rhapsodos (12), Angeal Hewley (12), Faye (11), Joel (11), Rufus Shinra (13), Quinn Carlisle (36), Tseng (13), Rude (13), Reno (11), Cloud Strife (4), Tifa Lockhart (3)\n\n**Key Events:**\n- Sephiroth Joins SOLDIER: After graduating early at the Shinra Military Academy, Sephiroth is promoted to SOLDIER',
    '[ μ ] – εγλ 1990',
    1990,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1990', 'year', 1990),
    ARRAY['SOLDIER', 'Promotion']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1991
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Birth of Yuffie Kisaragi',
    E'**Characters:** Sephiroth (13), Genesis Rhapsodos (13), Angeal Hewley (13), Faye (12), Joel (12), Rufus Shinra (14), Quinn Carlisle (37), Tseng (14), Rude (14), Reno (12), Cloud Strife (5), Tifa Lockhart (4)\n\n**Key Events:**\n- November 20: Yuffie Kisaragi is born',
    '[ μ ] – εγλ 1991',
    1991,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1991', 'year', 1991, 'month', 11, 'day', 20),
    ARRAY['Birth']::TEXT[],
    false,
    v_story_alias_id
  );

  -- εγλ 1992
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Faye and Sephiroth Begin Dating',
    E'**Characters:** Sephiroth (14), Genesis Rhapsodos (14), Angeal Hewley (14), Faye (13), Joel (13), Rufus Shinra (15), Quinn Carlisle (38)\n\n**Key Events:**\n- Faye and Sephiroth Begin Dating: Faye and Sephiroth develop a romantic relationship',
    '[ μ ] – εγλ 1992',
    1992,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1992', 'year', 1992),
    ARRAY['Relationship']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 1993
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'εγλ 1993',
    E'**Characters:** Sephiroth (15), Genesis Rhapsodos (15), Angeal Hewley (15), Faye (14), Joel (14), Rufus Shinra (16), Quinn Carlisle (39)',
    '[ μ ] – εγλ 1993',
    1993,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1993', 'year', 1993),
    ARRAY[]::TEXT[],
    false,
    v_story_alias_id
  );

  -- εγλ 1994
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Genesis and Angeal Join SOLDIER',
    E'**Characters:** Sephiroth (16), Genesis Rhapsodos (16), Angeal Hewley (16), Faye (15), Joel (15), Rufus Shinra (17), Quinn Carlisle (40)\n\n**Key Events:**\n- Genesis and Angeal Join SOLDIER: Genesis and Angeal are promoted to SOLDIER after years of training.',
    '[ μ ] – εγλ 1994',
    1994,
    jsonb_build_object('era', 'μ', 'format', '[ μ ] – εγλ 1994', 'year', 1994),
    ARRAY['SOLDIER', 'Promotion']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 0000 (End of Wutai War)
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'End of the Wutai War',
    E'**Characters:** Sephiroth (22), Genesis Rhapsodos (22), Angeal Hewley (22), Faye (21), Joel (21), Rufus Shinra (23), Quinn Carlisle (46)\n\n**Key Events:**\n- End of the Wutai War: The war concludes, establishing Sephiroth as a hero.',
    '[ ν ] – εγλ 0000',
    2000,
    jsonb_build_object('era', 'ν', 'format', '[ ν ] – εγλ 0000', 'year', 2000),
    ARRAY['War']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 0002 (September 30) - Faye becomes pregnant
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Faye Becomes Pregnant with Eden',
    E'**Characters:** Sephiroth (24), Genesis Rhapsodos (24), Angeal Hewley (24), Faye (23), Joel (23), Rufus Shinra (25), Quinn Carlisle (48), Eden (Conceived)\n\n**Key Events:**\n- Faye Becomes Pregnant with Eden: Faye becomes pregnant with Sephiroth''s child, Eden.',
    '[ ν ] – εγλ 0002 (September 30)',
    2002,
    jsonb_build_object('era', 'ν', 'format', '[ ν ] – εγλ 0002', 'year', 2002, 'month', 9, 'day', 30),
    ARRAY['Birth', 'Relationship']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 0002 (October) - Faye captured
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Faye is Captured by Hojo',
    E'**Characters:** Sephiroth (24), Genesis Rhapsodos (24), Angeal Hewley (24), Faye (23), Joel (23), Rufus Shinra (25), Quinn Carlisle (48)\n\n**Key Events:**\n- Faye is Captured by Hojo: Faye is captured by Hojo, where it''s discovered she is pregnant. She is kept captive.',
    '[ ν ] – εγλ 0002 (October)',
    2002,
    jsonb_build_object('era', 'ν', 'format', '[ ν ] – εγλ 0002', 'year', 2002, 'month', 10),
    ARRAY['Capture', 'Hojo']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 0003 - Eden born, Faye escapes
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Birth of Eden and Faye''s Escape',
    E'**Characters:** Sephiroth (25), Genesis Rhapsodos (25), Angeal Hewley (25), Faye (24), Joel (24), Rufus Shinra (26), Quinn Carlisle (49), Eden (Born)\n\n**Key Events:**\n- Faye Gives Birth to Eden: Nine months after her capture, Faye gives birth to her son, Eden.\n- Faye Escapes Shinra: Faye manages to escape from Hojo''s captivity, but her son is left behind.\n- Rufus Adopts Eden: Rufus Shinra adopts Eden as his own.\n- Faye Returns to Midgar: Faye returns to Midgar, living in the slums as she plans her revenge and to get her son back.',
    '[ ν ] – εγλ 0003',
    2003,
    jsonb_build_object('era', 'ν', 'format', '[ ν ] – εγλ 0003', 'year', 2003),
    ARRAY['Birth', 'Escape', 'Adoption']::TEXT[],
    true,
    v_story_alias_id
  );

  -- εγλ 0007 - Start of FFVII
  INSERT INTO timeline_events (world_id, timeline_id, title, description_markdown, date_text, year, date_data, categories, is_key_event, story_alias_id)
  VALUES (
    v_world_id,
    v_timeline_id,
    'Start of Final Fantasy VII',
    E'**Characters:** Sephiroth (29), Genesis Rhapsodos (29), Angeal Hewley (29), Faye (28), Joel (28), Rufus Shinra (30), Quinn Carlisle (54), Eden (4)\n\n**Key Events:**\n- Start of Final Fantasy VII: Sephiroth returns as the main antagonist, with Faye and Joel playing crucial roles in the unfolding events.',
    '[ ν ] – εγλ 0007',
    2007,
    jsonb_build_object('era', 'ν', 'format', '[ ν ] – εγλ 0007', 'year', 2007),
    ARRAY['Game Start', 'Main Story']::TEXT[],
    true,
    v_story_alias_id
  );

END $$;

