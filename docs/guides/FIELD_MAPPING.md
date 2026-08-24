# Field Mapping Documentation

## Overview

This document provides a complete mapping of database fields → form fields → API fields for all entity types.

## OCs (Original Characters)

### Database → Form → API Mapping

| DB Field | Form Field | API Field | Type | Required | Notes |
|----------|------------|-----------|------|----------|-------|
| id | - | - | UUID | Auto | System field, not editable |
| name | name | name | TEXT | Yes | Auto-generated from first_name + last_name |
| slug | slug | slug | TEXT | Yes | Auto-generated, unique per world |
| world_id | world_id | world_id | UUID | Yes | Foreign key to worlds |
| series_type | series_type | series_type | TEXT | No | Optional, can be auto-set from world |
| template_type | template_type | template_type | TEXT | Yes | Enum: naruto, ff7, inuyasha, etc. |
| identity_id | - | identity_id | UUID | No | Set automatically, preserved on edit |
| age | age | age | INTEGER | No | |
| pronouns | pronouns | pronouns | TEXT | No | |
| gender_identity | gender_identity | gender_identity | TEXT | No | |
| status | status | status | TEXT | Yes | Enum: alive, deceased, missing, unknown, au-only |
| image_url | image_url | image_url | TEXT | No | URL |
| icon_url | icon_url | icon_url | TEXT | No | URL |
| tags | tags | tags | TEXT[] | No | Array of strings |
| short_bio | short_bio | short_bio | TEXT | No | |
| full_bio_markdown | full_bio_markdown | full_bio_markdown | TEXT | No | Markdown |
| extra_fields | extra_fields | extra_fields | JSONB | No | Template-specific fields |
| modular_fields | modular_fields | modular_fields | JSONB | No | World-specific custom fields |
| is_public | is_public | is_public | BOOLEAN | Yes | Default: true |
| first_name | first_name | first_name | TEXT | Yes | |
| last_name | last_name | last_name | TEXT | Yes | |
| alias | alias | alias | TEXT | No | |
| date_of_birth | date_of_birth | date_of_birth | TEXT | No | |
| occupation | occupation | occupation | TEXT | No | |
| gender | gender | gender | TEXT | No | |
| sex | sex | sex | TEXT | No | |
| romantic | romantic | romantic | TEXT | No | |
| sexual | sexual | sexual | TEXT | No | |
| relationship_type | relationship_type | relationship_type | TEXT | No | |
| nationality | nationality | nationality | TEXT | No | |
| ethnicity_race | ethnicity_race | ethnicity_race | TEXT | No | |
| species | species | species | TEXT | No | |
| height | height | height | TEXT | No | |
| weight | weight | weight | TEXT | No | |
| eye_color | eye_color | eye_color | TEXT | No | |
| hair_color | hair_color | hair_color | TEXT | No | |
| skin_tone | skin_tone | skin_tone | TEXT | No | |
| build | build | build | TEXT | No | |
| notes | notes | notes | TEXT | No | |
| hometown | hometown | hometown | TEXT | No | |
| current_home | current_home | current_home | TEXT | No | |
| languages | languages | languages | TEXT[] | No | Array of strings |
| maternal_parent | maternal_parent | maternal_parent | TEXT | No | |
| paternal_parent | paternal_parent | paternal_parent | TEXT | No | |
| ship | ship | ship | TEXT | No | |
| relationships | relationships | relationships | TEXT | No | |
| star_sign | star_sign | star_sign | TEXT | No | |
| likes | likes | likes | TEXT | No | |
| dislikes | dislikes | dislikes | TEXT | No | |
| voice_actor | voice_actor | voice_actor | TEXT | No | |
| seiyuu | seiyuu | seiyuu | TEXT | No | |
| theme_song | theme_song | theme_song | TEXT | No | |
| personality | personality | personality | TEXT | No | |
| positive_traits | positive_traits | positive_traits | TEXT | No | |
| neutral_traits | neutral_traits | neutral_traits | TEXT | No | |
| negative_traits | negative_traits | negative_traits | TEXT | No | |
| mbti | mbti | mbti | TEXT | No | |
| history | history | history | TEXT | No | |
| trivia | trivia | trivia | TEXT | No | |
| created_at | - | - | TIMESTAMP | Auto | System field |
| updated_at | - | - | TIMESTAMP | Auto | System field |

## Worlds

### Database → Form → API Mapping

| DB Field | Form Field | API Field | Type | Required | Notes |
|----------|------------|-----------|------|----------|-------|
| id | - | - | UUID | Auto | System field |
| name | name | name | TEXT | Yes | |
| slug | slug | slug | TEXT | Yes | Unique |
| series_type | series_type | series_type | TEXT | Yes | Enum: canon, original |
| summary | summary | summary | TEXT | Yes | |
| description_markdown | description_markdown | description_markdown | TEXT | No | Markdown |
| primary_color | primary_color | primary_color | TEXT | Yes | Hex color |
| accent_color | accent_color | accent_color | TEXT | Yes | Hex color |
| header_image_url | header_image_url | header_image_url | TEXT | No | URL |
| icon_url | icon_url | icon_url | TEXT | No | URL |
| setting_img | setting_img | setting_img | TEXT | No | URL |
| banner_image | banner_image | banner_image | TEXT | No | URL |
| is_public | is_public | is_public | BOOLEAN | Yes | Default: true |
| genre | genre | genre | TEXT | No | |
| synopsis | synopsis | synopsis | TEXT | No | |
| setting | setting | setting | TEXT | No | |
| lore | lore | lore | TEXT | No | |
| the_world_society | the_world_society | the_world_society | TEXT | No | |
| culture | culture | culture | TEXT | No | |
| politics | politics | politics | TEXT | No | |
| technology | technology | technology | TEXT | No | |
| environment | environment | environment | TEXT | No | |
| races_species | races_species | races_species | TEXT | No | |
| power_systems | power_systems | power_systems | TEXT | No | |
| religion | religion | religion | TEXT | No | |
| government | government | government | TEXT | No | |
| important_factions | important_factions | important_factions | TEXT | No | |
| notable_figures | notable_figures | notable_figures | TEXT | No | |
| languages | languages | languages | TEXT | No | |
| trade_economy | trade_economy | trade_economy | TEXT | No | |
| travel_transport | travel_transport | travel_transport | TEXT | No | |
| themes | themes | themes | TEXT | No | |
| inspirations | inspirations | inspirations | TEXT | No | |
| current_era_status | current_era_status | current_era_status | TEXT | No | |
| notes | notes | notes | TEXT | No | |
| template_customizations | - | - | JSONB | No | Managed separately |
| field_definitions | field_definitions | field_definitions | JSONB | No | Modular field definitions |
| modular_fields | modular_fields | modular_fields | JSONB | No | Modular field values |
| created_at | - | - | TIMESTAMP | Auto | System field |
| updated_at | - | - | TIMESTAMP | Auto | System field |

## WorldLore

### Database → Form → API Mapping

| DB Field | Form Field | API Field | Type | Required | Notes |
|----------|------------|-----------|------|----------|-------|
| id | - | - | UUID | Auto | System field |
| name | name | name | TEXT | Yes | |
| slug | slug | slug | TEXT | Yes | Unique per world |
| world_id | world_id | world_id | UUID | Yes | Foreign key |
| lore_type | lore_type | lore_type | TEXT | Yes | Enum: clan, organization, location, etc. |
| description | description | description | TEXT | No | |
| description_markdown | description_markdown | description_markdown | TEXT | No | Markdown |
| image_url | image_url | image_url | TEXT | No | URL |
| icon_url | icon_url | icon_url | TEXT | No | URL |
| field_definitions | field_definitions | field_definitions | JSONB | No | Modular field definitions |
| modular_fields | modular_fields | modular_fields | JSONB | No | Modular field values |
| related_ocs | related_ocs | related_ocs | Array | No | Via world_lore_ocs junction |
| related_events | related_events | related_events | Array | No | Via world_lore_timeline_events junction |
| created_at | - | - | TIMESTAMP | Auto | System field |
| updated_at | - | - | TIMESTAMP | Auto | System field |

## Timelines

### Database → Form → API Mapping

| DB Field | Form Field | API Field | Type | Required | Notes |
|----------|------------|-----------|------|----------|-------|
| id | - | - | UUID | Auto | System field |
| world_id | world_id | world_id | UUID | Yes | Foreign key |
| name | name | name | TEXT | Yes | |
| description_markdown | description_markdown | description_markdown | TEXT | No | Markdown |
| created_at | - | - | TIMESTAMP | Auto | System field |
| updated_at | - | - | TIMESTAMP | Auto | System field |

## TimelineEvents

### Database → Form → API Mapping

| DB Field | Form Field | API Field | Type | Required | Notes |
|----------|------------|-----------|------|----------|-------|
| id | - | - | UUID | Auto | System field |
| world_id | world_id | world_id | UUID | Yes | Foreign key |
| timeline_id | - | - | UUID | No | Optional, managed via junction table |
| title | title | title | TEXT | Yes | |
| description | description | description | TEXT | No | Summary |
| description_markdown | description_markdown | description_markdown | TEXT | No | Full markdown |
| date_data | date_data | date_data | JSONB | No | Flexible date structure |
| date_text | date_text | date_text | TEXT | No | Legacy/display fallback |
| year | year | year | INTEGER | No | For sorting |
| month | month | month | INTEGER | No | For sorting |
| day | day | day | INTEGER | No | For sorting |
| categories | categories | categories | TEXT[] | No | Array of category tags |
| is_key_event | is_key_event | is_key_event | BOOLEAN | No | Default: false |
| location | location | location | TEXT | No | |
| image_url | image_url | image_url | TEXT | No | URL |
| characters | characters | characters | Array | No | Via timeline_event_characters junction |
| created_at | - | - | TIMESTAMP | Auto | System field |
| updated_at | - | - | TIMESTAMP | Auto | System field |

## Field Type Conversions

### Form → Database

- Empty strings (`''`) → `null` for optional fields
- Empty arrays (`[]`) → `null` for optional array fields
- Numbers from strings: `Number(value)` or `null` if empty
- Booleans: Direct mapping
- JSONB fields: Direct JSON serialization

### Database → Form

- `null` → Empty string (`''`) for text fields
- `null` → Empty array (`[]`) for array fields
- Numbers: Direct mapping
- Booleans: Direct mapping
- JSONB fields: Direct JSON parsing

## Special Fields

### System Fields (Not Editable)
- `id`: Auto-generated UUID
- `created_at`: Auto-set timestamp
- `updated_at`: Auto-updated timestamp

### Auto-Generated Fields
- OC `name`: Auto-generated from `first_name + last_name`
- OC `slug`: Auto-generated from name + world slug
- WorldLore `slug`: Auto-generated from name

### Relationship Fields
- `identity_id`: Set automatically on create, preserved on edit
- `world_id`: Required, cannot be changed after creation (for some entities)
- Junction table relationships: Managed via separate API calls

## Validation Rules

### Required Fields
- OCs: name, slug, world_id, template_type, status, first_name, last_name, is_public
- Worlds: name, slug, series_type, summary, primary_color, accent_color, is_public
- WorldLore: name, slug, world_id, lore_type
- Timelines: world_id, name
- TimelineEvents: world_id, title

### Format Validation
- URLs: Must be valid URL format
- Colors: Must be valid hex color (#RRGGBB)
- UUIDs: Must be valid UUID format
- Enums: Must match predefined values

## Notes

1. All optional fields that are empty strings in forms are converted to `null` before saving
2. Array fields that are empty are converted to `null` (not empty arrays)
3. JSONB fields are stored as JSON objects
4. System fields are never sent from forms or accepted by APIs
5. Foreign key relationships are validated before saving
