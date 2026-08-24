# Multi-Fandom OCs Guide

## Overview

The multi-fandom OC system allows you to create a single character identity that can exist across multiple fandoms/worlds, with each fandom having its own completely separate profile. This means you can have "Character Name (Naruto version)" and "Character Name (Zelda version)" as separate profiles that are linked together as the same character identity.

## Key Concepts

### OC Identity vs OC Version

- **OC Identity**: The shared identity that groups all versions together (e.g., "Akira" as a character concept)
- **OC Version**: A specific profile for that character in a particular fandom/world (e.g., "Akira (Naruto)" and "Akira (Zelda)")

Each version has:
- Its own complete profile (all fields are separate)
- Its own world/fandom
- Its own slug (unique per world)
- Its own images, relationships, stats, etc.
- No cross-contamination between versions

## Creating Your First Character

### Step 1: Create a New Character

1. Go to **Admin → Characters → Create Character**
2. Fill in the character details:
   - First Name and Last Name (required)
   - Select a World/Fandom (required)
   - The system will automatically:
     - Create a new OC Identity
     - Generate a slug that includes the world name (e.g., `akira-naruto`)
     - Link this version to the new identity

3. Fill in all the character details for this version
4. Click **Save**

**Result**: You now have one character identity with one version.

## Adding Additional Versions (Same Character, Different Fandom)

### Adding a New Version to an Existing Identity

1. Go to **Admin → Characters** (the main character list)
2. Find any character in the list
3. Look at the **"Versions"** column - you'll see a clickable link like "1 version" or "2 versions"
4. **Click on that version count link**
   - This takes you to the **Identity Manager** page (`/admin/oc-identities/[id]`)
5. On the Identity Manager page, you'll see:
   - A large **"➕ Add New Version"** button in the top-right corner
   - A pink/purple banner with another **"Add New Version"** button
6. Click either **"Add New Version"** button
   - This opens the create form with the identity pre-linked
7. Fill in the form:
   - **Important**: Select a **different World/Fandom** than existing versions
   - The form will show a blue banner indicating you're adding to an existing identity
   - Fill in all the character details for this new version
   - The slug will automatically include the world name
8. Click **Save**

**Result**: The new version is automatically linked to the existing identity!

**Note**: If you don't see the version count link, make sure you're looking at the "Versions" column in the character list table. The link should be blue and clickable.

## Editing Character Versions

### How Editing Works

**Important**: You can only edit **one version at a time**. Each version has its own completely separate profile, so you edit them individually.

### Editing a Single Version

1. Go to **Admin → Characters**
2. Click **Edit** on the version you want to edit
3. You'll see:
   - A **Version Switcher** banner at the top (if this character has multiple versions)
   - The full edit form for this specific version
4. Make your changes to this version's profile
5. Click **Save**

**Key Points**: 
- ✅ Editing one version does NOT affect other versions
- ✅ Each version's data is completely separate
- ✅ The version switcher shows which version you're currently editing
- ❌ You cannot edit multiple versions simultaneously in one form

### Switching Between Versions While Editing

When editing a character that has multiple versions:

1. Look for the **blue banner** at the top of the edit form
2. It shows:
   - Current version name and world (e.g., "Akira (Naruto)")
   - Links to other versions (e.g., "Akira (Zelda)")
   - A link to "Manage all versions"
3. **Before switching**: Make sure to **Save** your current changes!
4. Click on any version link to switch to editing that version
5. The form will reload with that version's data

**Example Workflow**:
```
1. Edit "Akira (Naruto)" → Make changes → Save
2. Click "Akira (Zelda)" link in banner
3. Form reloads with "Akira (Zelda)" data
4. Make changes → Save
```

### Editing Both Versions

To edit both versions of a character:

**Option 1: Edit one at a time (Recommended)**
1. Edit Version 1 → Make changes → Save
2. Use version switcher to go to Version 2
3. Edit Version 2 → Make changes → Save

**Option 2: Use separate browser tabs**
1. Open Version 1 in one tab
2. Open Version 2 in another tab
3. Edit each independently
4. Save each when done

**Note**: There is no "edit all versions at once" feature because each version is meant to be completely independent with its own world-specific data.

### Viewing All Versions Together

1. Go to **Admin → Characters**
2. Find a character with multiple versions
3. Click on the version count (e.g., "2 versions")
4. This opens the **Identity Manager** page showing:
   - All versions in a table
   - Each version's world, template type, and public status
   - Links to edit each version
   - Option to add new versions

## Understanding the Version Switcher

When editing a character with multiple versions, you'll see a banner like this:

```
┌─────────────────────────────────────────────────────────┐
│ Multi-Fandom Character                                  │
│ This character has 2 versions across different fandoms  │
│                                                          │
│ Current version: Akira (Naruto)                         │
│                                                          │
│ Other versions:                                         │
│ [Akira (Zelda)]                                         │
│                                                          │
│ [Manage all versions →]                                │
└─────────────────────────────────────────────────────────┘
```

This banner:
- Only appears when a character has 2+ versions
- Shows which version you're currently editing
- Provides quick links to switch to other versions
- Helps prevent accidentally editing the wrong version

## Slug System

### How Slugs Work

- Each version has a unique slug that includes the world name
- Format: `{character-name}-{world-slug}`
- Examples:
  - `akira-naruto` (Akira in Naruto world)
  - `akira-zelda` (Akira in Zelda world)
  - `akira-ff7` (Akira in Final Fantasy 7 world)

### Why This Matters

- Slugs must be unique per world (not globally unique)
- The same character name can exist in different worlds
- Public URLs use these slugs: `/ocs/akira-naruto`, `/ocs/akira-zelda`

## Public View

### Viewing a Character Version

1. Go to the public character page (e.g., `/ocs/akira-naruto`)
2. You'll see the full profile for that specific version
3. If the character has multiple versions, you'll see an **"Other Versions"** section at the bottom
4. Click on other versions to see them in their respective fandoms

### Other Versions Section

On public pages, if a character has multiple versions, you'll see:

```
┌─────────────────────────────────────────┐
│ 🌍 Other Versions                        │
│                                          │
│ This character appears in multiple      │
│ fandoms. View other versions:           │
│                                          │
│ ┌─────────────┐  ┌─────────────┐       │
│ │ Akira       │  │ Akira       │       │
│ │ (Zelda)     │  │ (FF7)       │       │
│ └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────┘
```

## Best Practices

### 1. Naming Consistency
- Keep the character's core name consistent across versions
- Use the same first/last name structure
- The system will handle world-specific differences automatically

### 2. Version-Specific Data
- Remember: Each version is completely separate
- Relationships, images, stats, etc. are per-version
- Don't worry about "contaminating" other versions - it's impossible!

### 3. When to Create Multiple Versions
- Same character concept in different fandoms
- AU (Alternate Universe) versions
- Different time periods or settings for the same character
- Crossovers where the character appears in multiple worlds

### 4. When NOT to Create Multiple Versions
- Different characters with similar names (create separate identities)
- Temporary name changes (just edit the existing version)
- Minor variations that don't warrant separate profiles

## Troubleshooting

### "I can't find how to add a new version"
- Go to Admin → Characters
- Click on the version count link for the character
- Click "Add New Version" button

### "I edited one version but the other version didn't change"
- This is correct behavior! Each version is completely separate
- You need to edit each version individually

### "The slug already exists error"
- This means another character in the same world already uses that slug
- Try adding a number or different identifier (e.g., `akira-naruto-2`)

### "I want to link an existing character to an identity"
- Currently, you need to manually update the database
- Or create a new version and delete the old one (if it's not important)
- Future enhancement: We'll add UI to merge identities

## Admin List View

In the Admin → Characters list, you'll see:

| Name | World | Template | Versions | Public | Actions |
|------|-------|----------|----------|--------|---------|
| Akira | Naruto | naruto | [2 versions] | Yes | Edit |
| Akira | Zelda | zelda | [2 versions] | Yes | Edit |

- Click the version count to manage all versions
- Each row shows one version
- Versions of the same identity are listed separately

## Data Isolation

**Important**: All data is completely isolated between versions:

- ✅ Each version has its own:
  - Name, age, appearance, stats
  - Biography and history
  - Images and icons
  - Relationships
  - Modular fields
  - Template-specific fields (e.g., Naruto's village, Zelda's race)

- ❌ Versions do NOT share:
  - Any profile data
  - Images
  - Relationships
  - World-specific information

The only thing shared is the identity link (which groups them together for management purposes).

## Future Enhancements

Planned improvements:
- [ ] "Link to existing identity" option in create form
- [ ] Bulk operations on versions
- [ ] Version comparison view
- [ ] Copy data from one version to another (as starting point)
- [ ] Identity-level notes/metadata

## Quick Reference

| Action | How To |
|--------|--------|
| Create first version | Admin → Characters → Create Character |
| Add another version | Admin → Characters → Click version count → Add New Version |
| Edit a version | Admin → Characters → Edit (on any version) |
| Switch versions while editing | Click version link in blue banner |
| View all versions | Admin → Characters → Click version count |
| View public version | Click character on public site |
| See other versions (public) | Scroll to "Other Versions" section |

---

**Need Help?** Check the admin interface - most actions are accessible from the Characters list page or the Identity Manager page.
