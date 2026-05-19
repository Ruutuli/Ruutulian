-- Gallery sync: use the two Drive folders only
-- https://drive.google.com/drive/folders/1cNbJyTekBz-72AuUFIK6nq38cWfj212F
-- https://drive.google.com/drive/folders/0B91YVOBsNxk_VnNteHpZWWE5TGM
UPDATE site_settings
SET gallery_drive_folder_ids = ARRAY[
  '1cNbJyTekBz-72AuUFIK6nq38cWfj212F',
  '0B91YVOBsNxk_VnNteHpZWWE5TGM'
]::TEXT[]
WHERE gallery_drive_folder_ids = ARRAY['1G726cwwPCK2OtbpG_m0R9id5XvV_XL-G']::TEXT[]
   OR gallery_drive_folder_ids = ARRAY['1zS9w5oYwZU8zRa5mFcYLcXh8PKrdACHL']::TEXT[];
