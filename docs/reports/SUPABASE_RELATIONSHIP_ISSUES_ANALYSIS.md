# Supabase Relationship Issues - Root Cause Analysis

## Problem Summary

Experiencing two types of PostgREST errors when querying `story_aliases` relationships:
1. **PGRST201**: "Could not embed because more than one relationship was found"
2. **PGRST200**: "Could not find a relationship between 'ocs' and 'story_aliases' in the schema cache"

## Root Causes Identified

### 1. **Inconsistent Foreign Key Creation Methods**

Foreign keys to `story_aliases` are created in two different ways:

**Method A: Inline FK (Created at table creation)**
- `fanfics.story_alias_id` - Created inline: `REFERENCES story_aliases(id) ON DELETE SET NULL`
- `world_story_data.story_alias_id` - Created inline: `REFERENCES story_aliases(id) ON DELETE CASCADE`
- `world_races.story_alias_id` - Created inline: `REFERENCES story_aliases(id) ON DELETE CASCADE`
- `timelines.story_alias_id` - Created inline via ALTER TABLE: `REFERENCES story_aliases(id) ON DELETE SET NULL`

**Method B: Separate Migration (Added later)**
- `ocs.story_alias_id` - Added in migration `20250101000017_add_story_alias_fk_to_ocs.sql`
- `timeline_events.story_alias_id` - Added in migration `20250101000017_add_story_alias_fk_to_ocs.sql`
- `world_lore.story_alias_id` - Added in migration `20250101000017_add_story_alias_fk_to_ocs.sql`

**Impact**: PostgREST's schema cache may not properly index relationships created in separate migrations, especially if the cache was built before those migrations ran.

### 2. **PostgREST Schema Cache Issues**

PostgREST maintains an internal schema cache that maps relationships between tables. This cache:
- Is built when PostgREST starts
- May not automatically refresh when migrations add new foreign keys
- Can become stale if migrations are applied while PostgREST is running
- May have different states in different environments (dev vs production)

**Why This Causes PGRST200**: If the schema cache doesn't include the relationship, PostgREST can't find it even though the FK constraint exists in the database.

**Why This Causes PGRST201**: If the cache has stale or duplicate entries, PostgREST may see multiple relationship paths and can't determine which one to use.

### 3. **Migration Order Dependencies**

The `story_aliases` table is created in migration `20250101000005_create_story_aliases.sql`, but:
- Some tables (`ocs`, `timeline_events`, `world_lore`) reference it before it exists (column added without FK)
- The FK constraint is added later in `20250101000017_add_story_alias_fk_to_ocs.sql`
- This creates a window where the column exists but the relationship doesn't

**Impact**: If PostgREST's schema cache was built during this window, it may not properly recognize the relationship.

### 4. **Environment Differences**

The user mentions having "2 websites" that behave differently:
- **Environment A**: Works with explicit FK syntax (`!fk_ocs_story_alias_id`)
- **Environment B**: Works with implicit relationship syntax (no `!fk_...`)

This suggests:
- Different migration execution orders
- Different PostgREST schema cache states
- Possibly different Supabase versions or configurations
- Different timing of when migrations were applied vs when PostgREST started

## Solutions Implemented

### Short-term Fix (Current Implementation)
- **Three-tier fallback system**: Try explicit FK → implicit relationship → fetch separately
- Works around the issue but doesn't fix the root cause

### Long-term Fixes Needed

#### 1. **Standardize Foreign Key Creation**
All foreign keys should be created consistently:
- **Option A**: Always create FKs inline when creating tables
- **Option B**: Always create FKs in separate migrations with explicit constraint names
- **Recommendation**: Use Option B for better migration control and explicit naming

#### 2. **Ensure PostgREST Schema Cache Refresh**
- Restart PostgREST after applying migrations that add foreign keys
- Or use Supabase's schema reload endpoint (if available)
- Or ensure migrations run before PostgREST starts

#### 3. **Use Explicit Foreign Key Names**
Always name foreign key constraints explicitly:
```sql
ALTER TABLE ocs
  ADD CONSTRAINT fk_ocs_story_alias_id
  FOREIGN KEY (story_alias_id)
  REFERENCES story_aliases(id)
  ON DELETE SET NULL;
```

This makes the relationship explicit and helps PostgREST identify it correctly.

#### 4. **Migration Best Practices**
- Create referenced tables before tables that reference them
- Or create columns without FKs first, then add FKs in a follow-up migration
- Always use explicit constraint names
- Document migration dependencies

## Recommended Actions

1. **Create a migration to standardize all story_alias_id foreign keys**
   - Ensure all have explicit constraint names
   - Use consistent naming pattern: `fk_{table}_{column}`

2. **Add PostgREST schema cache refresh**
   - After migrations that modify relationships
   - Or restart PostgREST service

3. **Update migration order/documentation**
   - Ensure `story_aliases` table is created before any references
   - Document which migrations depend on which

4. **Consider using Supabase's relationship introspection**
   - Use `pg_rest` or similar tools to verify relationships are properly indexed
   - Check PostgREST logs for schema cache warnings

## Prevention Strategy

1. **Always use explicit FK constraint names** in migrations
2. **Create a migration template** that ensures consistency
3. **Test migrations in both environments** before deploying
4. **Document migration dependencies** clearly
5. **Consider using Supabase CLI** to manage migrations consistently

