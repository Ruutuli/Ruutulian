# Seeding the Supabase Database

This guide explains how to seed your Supabase database with initial data.

## Prerequisites

1. **Supabase CLI** (for local development) or access to your remote Supabase project
2. **Environment variables** set up:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

## Step 1: Run Database Migrations

The migrations will create the tables and add all the new fields.

### Option A: Using Supabase CLI (Local Development)

If you're using local Supabase:

```bash
# Start Supabase locally (if not already running)
supabase start

# Apply all migrations
supabase db reset
```

This will:
- Drop and recreate the database
- Run all migrations in order (001, 002, 003)
- Seed the worlds data

### Option B: Remote Supabase (Production)

If you're working with a remote Supabase project:

1. **Via Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run each migration file in order:
     - `001_initial_schema.sql`
     - `002_seed_worlds.sql`
     - `003_add_default_fields.sql`

2. **Via Supabase CLI (if linked):**
   ```bash
   # Link to your remote project (if not already linked)
   supabase link --project-ref your-project-ref
   
   # Push migrations
   supabase db push
   ```

## Step 2: Verify Worlds Are Seeded

After running migrations, you should have these worlds:

**Canon Worlds:**
- Naruto
- Final Fantasy VII
- Inuyasha
- Shaman King
- Zelda
- Dragon Ball Z
- Pokémon
- Nier

**Original Worlds:**
- Kismet
- Moirai
- Pluviophile
- Tiderift
- Vieulx
- None
- Not Accessible

You can verify this in:
- **Local:** Supabase Studio at `http://localhost:54323`
- **Remote:** Your Supabase Dashboard → Table Editor → `worlds` table

## Step 3: Import OCs from CSV

If you have a CSV file with your OCs, use the import script:

### Setup

1. Make sure your CSV file is in the project root or `scripts/` directory
2. Update the CSV file path in `scripts/import-csv.ts` if needed (line ~230)
3. Ensure your CSV has the correct column headers matching the script

### Run the Import

```bash
# Install dependencies if needed
npm install

# Run the import script
npx tsx scripts/import-csv.ts
```

The script will:
- Read your CSV file
- Map CSV columns to database fields
- Create or update OCs in the database
- Handle world matching by name
- Show progress and any errors

### CSV Column Mapping

The import script maps these CSV columns to database fields:
- `LAST NAME` → `last_name`
- `FIRST NAME` → `first_name`
- `ALIAS` → `alias`
- `AGE` → `age`
- `D.O.B.` → `date_of_birth`
- `OCCUPATION` → `occupation`
- `GENDER` → `gender`
- `SEX` → `sex`
- `PRONOUNS` → `pronouns`
- `ROMANTIC` → `romantic`
- `SEXUAL` → `sexual`
- `RELATIONSHIP TYPE` → `relationship_type`
- `NATIONALITY` → `nationality`
- `ETHNICITY / RACE` → `ethnicity_race`
- `SPECIES` → `species`
- `HEIGHT` → `height`
- `WEIGHT` → `weight`
- `EYE COLOR` → `eye_color`
- `HAIR COLOR` → `hair_color`
- `SKIN TONE` → `skin_tone`
- `BUILD` → `build`
- `NOTES` → `notes`
- `HOMETOWN` → `hometown`
- `CURRENT HOME` → `current_home`
- `LANGUAGES` → `languages` (split by comma)
- `MATERNAL PARENT` → `maternal_parent`
- `PATERNAL PARENT` → `paternal_parent`
- `SHIP` → `ship`
- `RELATIONSHIPS` → `relationships`
- `STAR SIGN` → `star_sign`
- `LIKES` → `likes`
- `DISLIKES` → `dislikes`
- `VOICE ACTOR` → `voice_actor`
- `SEIYUU` → `seiyuu`
- `THEME SONG` → `theme_song`
- `VERSE` → `world_id` (matches world by name)
- `PERSONALITY` → `personality`
- `POSITIVE TRAITS` → `positive_traits`
- `NEUTRAL TRAITS` → `neutral_traits`
- `NEGATIVE TRAITS` → `negative_traits`
- `MBTI` → `mbti`
- `HISTORY` → `history`
- `TRIVIA` → `trivia`

## Step 4: Manual Data Entry (Alternative)

If you prefer to add data manually:

1. **Via Supabase Dashboard:**
   - Go to Table Editor
   - Select `worlds` or `ocs` table
   - Click "Insert row" and fill in the fields

2. **Via Admin Dashboard:**
   - Start your Next.js app: `npm run dev`
   - Navigate to `/admin`
   - Log in with your Supabase credentials
   - Use the forms to create/edit worlds and OCs

## Troubleshooting

### Migration Errors

If you get errors about columns already existing:
- The migration uses `IF NOT EXISTS`, so it's safe to run multiple times
- If you need to start fresh, you can drop and recreate tables

### Import Script Errors

- **Missing environment variables:** Make sure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- **World not found:** Make sure the world name in your CSV matches exactly (case-sensitive) with a world in the database
- **CSV parsing errors:** Check that your CSV file is properly formatted and has the correct headers

### Service Role Key

The service role key bypasses Row Level Security (RLS), which is needed for the import script. **Never commit this key to version control!**

Get it from:
- **Local:** `supabase status` command output
- **Remote:** Supabase Dashboard → Settings → API → `service_role` key

## Next Steps

After seeding:
1. Verify data in Supabase Studio/Dashboard
2. Test your admin dashboard at `/admin`
3. Check public pages to ensure data displays correctly
4. Add more worlds/OCs as needed through the admin interface
