# Supabase Settings Checklist

This guide walks you through all the Supabase settings you need to verify to ensure your database is properly configured for saving and fetching data.

## 🔑 1. API Settings & Keys

### Location: Settings → API

1. **Project URL**
   - ✅ Should match your `NEXT_PUBLIC_SUPABASE_URL` in `.env`
   - Your current URL: `https://iczuzanuqlllcphfaqgq.supabase.co`
   - Verify it's accessible and not paused

2. **anon/public key**
   - ✅ Should match your `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`
   - This key is safe to expose in client-side code
   - Used for all public-facing operations

3. **service_role key** (⚠️ KEEP SECRET!)
   - ✅ Should match your `SUPABASE_SERVICE_ROLE_KEY` in `.env`
   - **NEVER expose this in client-side code**
   - Only use in server-side code or scripts
   - Has full database access, bypasses RLS

### What to Check:
- [ ] Project URL is correct and active
- [ ] anon key matches your `.env` file
- [ ] service_role key is set (if you need admin operations)
- [ ] Keys haven't been rotated/changed recently

---

## 🗄️ 2. Database Tables

### Location: Table Editor

Verify all required tables exist:

1. **worlds**
   - [ ] Table exists
   - [ ] Has columns: `id`, `name`, `slug`, `series_type`, `summary`, `is_public`, etc.
   - [ ] Has data (at least seed data)

2. **ocs**
   - [ ] Table exists
   - [ ] Has foreign key to `worlds(id)`
   - [ ] Has columns: `id`, `name`, `slug`, `world_id`, `template_type`, `status`, `is_public`, etc.

3. **timelines**
   - [ ] Table exists
   - [ ] Has foreign key to `worlds(id)`

4. **timeline_events**
   - [ ] Table exists
   - [ ] Has foreign key to `timelines(id)`

5. **oc_identities** (if using identity system)
   - [ ] Table exists
   - [ ] Has relationship to `ocs` table

### What to Check:
- [ ] All tables from migrations are present
- [ ] Foreign key relationships are set up correctly
- [ ] Indexes exist on frequently queried columns (`slug`, `world_id`, `is_public`, etc.)

---

## 🔒 3. Row Level Security (RLS)

### Location: Authentication → Policies

**This is CRITICAL for security!**

### For `worlds` table:
- [ ] RLS is **ENABLED**
- [ ] Policy: "Public can read public worlds" (SELECT, `is_public = true`)
- [ ] Policy: "Authenticated users can read all worlds" (SELECT, authenticated users)
- [ ] Policy: "Authenticated users can manage worlds" (ALL operations, authenticated users)

### For `ocs` table:
- [ ] RLS is **ENABLED**
- [ ] Policy: "Public can read public ocs" (SELECT, `is_public = true`)
- [ ] Policy: "Authenticated users can read all ocs" (SELECT, authenticated users)
- [ ] Policy: "Authenticated users can manage ocs" (ALL operations, authenticated users)

### For `timelines` table:
- [ ] RLS is **ENABLED**
- [ ] Policy: "Public can read timelines for public worlds" (SELECT, via world check)
- [ ] Policy: "Authenticated users can read all timelines" (SELECT, authenticated users)
- [ ] Policy: "Authenticated users can manage timelines" (ALL operations, authenticated users)

### For `timeline_events` table:
- [ ] RLS is **ENABLED**
- [ ] Policy: "Public can read events for public timelines" (SELECT, via timeline/world check)
- [ ] Policy: "Authenticated users can read all timeline_events" (SELECT, authenticated users)
- [ ] Policy: "Authenticated users can manage timeline_events" (ALL operations, authenticated users)

### What to Check:
- [ ] RLS is enabled on ALL tables
- [ ] Public read policies allow reading `is_public = true` records
- [ ] Authenticated users can read all records
- [ ] Authenticated users can write/update/delete
- [ ] Anonymous users CANNOT write (this is important for security)

---

## 🔗 4. Foreign Key Relationships

### Location: Database → Relationships

Verify these relationships exist:

1. **ocs.world_id → worlds.id**
   - [ ] Foreign key constraint exists
   - [ ] ON DELETE CASCADE is set (if you want OCs deleted when world is deleted)

2. **timelines.world_id → worlds.id**
   - [ ] Foreign key constraint exists
   - [ ] ON DELETE CASCADE is set

3. **timeline_events.timeline_id → timelines.id**
   - [ ] Foreign key constraint exists
   - [ ] ON DELETE CASCADE is set

4. **ocs.identity_id → oc_identities.id** (if using)
   - [ ] Foreign key constraint exists

### What to Check:
- [ ] All foreign keys are properly configured
- [ ] CASCADE behavior is set as expected
- [ ] No orphaned records (records pointing to non-existent parents)

---

## 📊 5. Database Functions & Triggers

### Location: Database → Functions / Database → Triggers

1. **update_updated_at_column() function**
   - [ ] Function exists
   - [ ] Updates `updated_at` timestamp automatically

2. **Triggers for updated_at**
   - [ ] Trigger on `worlds` table
   - [ ] Trigger on `ocs` table
   - [ ] Trigger on `timelines` table
   - [ ] Trigger on `timeline_events` table

### What to Check:
- [ ] All triggers are active
- [ ] `updated_at` columns are being updated automatically

---

## 🔍 6. Indexes

### Location: Database → Indexes

Verify indexes exist for performance:

- [ ] `idx_ocs_world_id` on `ocs(world_id)`
- [ ] `idx_ocs_slug` on `ocs(slug)`
- [ ] `idx_ocs_is_public` on `ocs(is_public)`
- [ ] `idx_worlds_slug` on `worlds(slug)`
- [ ] `idx_worlds_is_public` on `worlds(is_public)`
- [ ] `idx_timelines_world_id` on `timelines(world_id)`

### What to Check:
- [ ] Indexes exist on frequently queried columns
- [ ] Unique indexes exist on `slug` columns

---

## 🚀 7. API Settings

### Location: Settings → API

1. **API URL**
   - [ ] Matches your project URL
   - [ ] Format: `https://[project-ref].supabase.co`

2. **REST API**
   - [ ] Enabled
   - [ ] Accessible from your application

3. **Realtime** (if using)
   - [ ] Enabled if you need real-time updates
   - [ ] Not required for basic CRUD operations

### What to Check:
- [ ] API is accessible
- [ ] No rate limiting issues
- [ ] CORS settings allow your domain (if applicable)

---

## 🔐 8. Authentication Settings (if using auth)

### Location: Authentication → Settings

If you're using Supabase Auth:

- [ ] Email auth is enabled (if using email/password)
- [ ] Site URL is set correctly
- [ ] Redirect URLs are configured
- [ ] JWT expiry settings are appropriate

**Note:** Your current setup may not require authentication for public reads, but you'll need it for admin operations.

---

## 🧪 9. Testing Your Setup

After verifying all settings, run the test script:

```bash
npx tsx scripts/tests/test-database.ts
```

This will test:
- ✅ Connection to Supabase
- ✅ Reading from all tables
- ✅ Writing/updating/deleting (if service role key is set)
- ✅ RLS policies
- ✅ Relationships
- ✅ Constraints

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to fetch" or connection errors
**Solution:**
- Check your `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify project is not paused
- Check network/firewall settings

### Issue: "new row violates row-level security policy"
**Solution:**
- Verify RLS policies allow the operation you're trying to perform
- Check if you're authenticated (for write operations)
- Review policy conditions

### Issue: "foreign key constraint violation"
**Solution:**
- Ensure parent record exists (e.g., world exists before creating OC)
- Check foreign key relationships are set up correctly

### Issue: "duplicate key value violates unique constraint"
**Solution:**
- Ensure slugs are unique
- Check for existing records with the same slug

### Issue: Can read but cannot write
**Solution:**
- Check RLS policies allow INSERT/UPDATE/DELETE
- Verify you're using authenticated client (not anonymous)
- For admin operations, use service role key

---

## 📝 Quick Verification Checklist

Before running your application, verify:

- [ ] Environment variables are set correctly in `.env`
- [ ] All tables exist with correct schema
- [ ] RLS is enabled on all tables
- [ ] RLS policies allow public reads for `is_public = true` records
- [ ] RLS policies allow authenticated users to write
- [ ] Foreign keys are set up correctly
- [ ] Indexes exist for performance
- [ ] Test script passes all tests

---

## 🔄 Next Steps

1. Run the test script: `npx tsx scripts/tests/test-database.ts`
2. Review any failed tests
3. Fix issues in Supabase dashboard
4. Re-run tests until all pass
5. Test your application's save/fetch operations

If you encounter any issues not covered here, check the Supabase logs in the dashboard under **Logs → API Logs** or **Logs → Postgres Logs**.



