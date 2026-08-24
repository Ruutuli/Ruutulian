# Timeline Tables Usage Analysis

## Summary

All five tables are **actively being used**, but there is one **potentially redundant column** that could be removed.

## Table Usage Status

### ✅ **timelines** - ACTIVELY USED
- **Purpose**: Main table storing timeline definitions
- **Usage**: 
  - Queried in admin and public pages
  - Used for timeline management, display, and metadata
  - Referenced by `timeline_event_timelines` junction table

### ✅ **timeline_events** - ACTIVELY USED
- **Purpose**: Main table storing individual timeline events
- **Usage**: 
  - Queried extensively across the application
  - Used for event creation, editing, display
  - Referenced by multiple junction tables

### ✅ **timeline_event_timelines** - ACTIVELY USED
- **Purpose**: Junction table for many-to-many relationship between timelines and events
- **Usage**: 
  - Used in `TimelineEventsManager.tsx` to load events for a timeline
  - Used in public timeline pages to display events
  - Allows events to belong to multiple timelines
  - Stores `position` for ordering events within a timeline

### ✅ **timeline_event_characters** - ACTIVELY USED
- **Purpose**: Junction table for many-to-many relationship between events and characters (OCs)
- **Usage**: 
  - Used to associate characters with events
  - Displayed in event listings showing which characters participated
  - Allows events to have multiple characters and characters to appear in multiple events

### ✅ **world_lore_timeline_events** - ACTIVELY USED
- **Purpose**: Junction table for many-to-many relationship between world_lore entries and timeline events
- **Usage**: 
  - Used in world lore pages to show related timeline events
  - API routes exist for managing these associations (`/api/admin/world-lore/[id]/timeline-events`)
  - Allows lore entries to reference multiple events and events to be referenced by multiple lore entries

## ⚠️ Potentially Redundant Column

### **timeline_events.timeline_id** - LEGACY/UNUSED IN APPLICATION CODE

**Status**: This column exists in the schema but is **NOT used by application code**.

**Evidence**:
- ❌ No application queries filter by `timeline_events.timeline_id`
- ❌ Event creation/update code does NOT set this column
- ✅ All queries use `timeline_event_timelines` junction table instead
- ⚠️ Only used in seed scripts (migration `20250101120006_seed_ff7_astra_timeline.sql`)

**Migration History**:
- The `timeline_events` table was created with a direct `timeline_id` foreign key (one-to-many)
- Later, `timeline_event_timelines` junction table was added to support many-to-many relationships
- The application migrated to use the junction table exclusively
- The old `timeline_id` column was never removed

**Recommendation**: 
- Consider removing this column in a future migration
- First, update seed scripts to use `timeline_event_timelines` junction table instead
- Then create a migration to drop the column and its index

## Table Relationships

```
timelines (1) ←→ (many) timeline_event_timelines (many) ←→ (1) timeline_events
                                                                    ↓
                                                          timeline_event_characters
                                                                    ↓
                                                                   ocs
                                                                    ↑
                                                          world_lore_timeline_events
                                                                    ↓
                                                                 world_lore
```

## Conclusion

**All tables are necessary and actively used.** The only cleanup opportunity is the legacy `timeline_id` column on `timeline_events`, which should be removed after updating seed scripts to use the junction table pattern.


