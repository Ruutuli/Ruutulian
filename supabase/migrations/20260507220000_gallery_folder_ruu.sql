-- If gallery folders are still the old template pair, switch to the live art root folder.
UPDATE site_settings
SET gallery_drive_folder_ids = ARRAY['1zS9w5oYwZU8zRa5mFcYLcXh8PKrdACHL']::TEXT[]
WHERE gallery_drive_folder_ids = ARRAY[
  '1cNbJyTekBz-72AuUFIK6nq38cWfj212F',
  '0B91YVOBsNxk_VnNteHpZWWE5TGM'
]::TEXT[];
