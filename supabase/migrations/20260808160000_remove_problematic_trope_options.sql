-- Remove racist / harmful stereotype tropes from dropdown options
DELETE FROM dropdown_options
WHERE field = 'trope'
  AND option IN (
    'Crazy Cat Lady',
    'Dragon Lady',
    'Dumb Blonde',
    'Eccentric Foreigner',
    'Farmer''s Daughter',
    'French Maid',
    'Gay Best Friend',
    'Halfbreed Harlot',
    'Hooker with a Heart of Gold',
    'Immigrant',
    'Lovable Pervert',
    'Noble Savage',
    'Psycho-Biddy',
    'Redneck',
    'Sexy Grandma',
    'Shrew',
    'Sissy',
    'Tiger Mom',
    'Tricky Slave'
  );
