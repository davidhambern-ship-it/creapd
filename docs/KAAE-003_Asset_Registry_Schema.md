# KAAE-003 — Asset Registry Schema

**Document Type:** Data Model Specification
**Parent Document:** KAAE-001 (Knowledge & Asset Acquisition Engine)
**Status:** Canonical Implementation Specification
**Applies To:** All Production Profiles

---

# 1. Purpose

This specification defines the **Asset Registry Schema** — the canonical data model for every resource discovered, evaluated, or acquired by the KAAE. Per KAAE-001 §10, every discovered resource shall receive a registry record.

---

# 2. Core Principle

**If it isn't in the registry, it doesn't exist.**

The Asset Registry is the single source of truth for all knowledge and production assets in CREAPD. No AI Worker, Production Profile, or subsystem shall use a resource that does not have a registry record.

---

# 3. Registry Record Schema

### 3.1 Identity Fields

| Field | Type | Description |
|---|---|---|
| `asset_id` | string (auto) | Unique registry identifier |
| `title` | string | Resource title |
| `description` | string | Resource description |
| `category` | string | Primary category (see §4) |
| `subcategory` | string | Secondary category |
| `keywords` | string[] | Searchable keywords |
| `tags` | string[] | Free-form tags |

### 3.2 Source Fields

| Field | Type | Description |
|---|---|---|
| `provider` | string | Provider name |
| `provider_resource_id` | string | Provider-native identifier |
| `source_url` | string | Original URL of the resource |
| `connector_id` | string | Which connector discovered this asset |

### 3.3 License Fields

| Field | Type | Description |
|---|---|---|
| `license` | enum | License classification (see KAAE-004) |
| `license_url` | string | URL to license text |
| `commercial_use` | boolean | Can be used commercially |
| `modification_allowed` | boolean | Can be modified |
| `redistribution_allowed` | boolean | Can be redistributed |
| `attribution_required` | boolean | Attribution required |
| `attribution_text` | string | Required attribution text |

### 3.4 Acquisition Fields

| Field | Type | Description |
|---|---|---|
| `download_status` | enum | `not_downloaded`, `downloading`, `downloaded`, `failed` |
| `cached` | boolean | Whether the resource is cached locally |
| `cached_file_url` | string | Local cached file URL |
| `cached_at` | datetime | When the resource was cached |

### 3.5 Quality & Verification Fields

| Field | Type | Description |
|---|---|---|
| `verified` | boolean | Source has been verified |
| `last_verified` | datetime | Last verification timestamp |
| `confidence` | number (0-100) | Confidence score |
| `qa_status` | enum | `not_reviewed`, `needs_revision`, `passed`, `approved` |

### 3.6 Preview Fields

| Field | Type | Description |
|---|---|---|
| `preview_url` | string | Preview URL (page, image thumbnail, audio sample) |
| `thumbnail_url` | string | Thumbnail image URL |
| `preview_generated` | boolean | Whether preview was auto-generated |

### 3.7 Lifecycle Fields

| Field | Type | Description |
|---|---|---|
| `date_added` | datetime | When the record was created |
| `health_status` | enum | `healthy`, `degraded`, `down`, `unknown` |
| `last_checked` | datetime | Last health check |
| `is_active` | boolean | Whether the resource is currently usable |
| `usage_count` | number | How many times this asset has been used in production |
| `last_used_at` | datetime | Last production usage |

---

# 4. Category Taxonomy

### Knowledge
- `academic_paper`
- `book`
- `article`
- `government_publication`
- `technical_documentation`
- `research_paper`
- `whitepaper`
- `rss_feed`
- `statistics`
- `report`

### Visual
- `svg`
- `image_png`
- `image_jpeg`
- `image_webp`
- `illustration`
- `icon`
- `infographic`
- `map`
- `chart`
- `diagram`

### Video
- `video_mp4`
- `video_mov`
- `video_webm`
- `gif`
- `motion_graphics`
- `animation`

### Audio
- `audio_mp3`
- `audio_wav`
- `audio_ogg`
- `voice_clip`
- `music_track`
- `sound_effect`
- `podcast_episode`

### Interactive
- `template`
- `slide_theme`
- `presentation_layout`
- `component_library`
- `ui_asset`
- `font`

---

# 5. Duplicate Detection

The registry shall detect duplicates using the following strategy:

1. **Exact URL match** — if `source_url` already exists, do not create a new record
2. **Provider + provider_resource_id match** — if both match, do not create a new record
3. **Content hash match** — if file content hash matches an existing record, flag as duplicate but allow both records (different providers may host the same file)

---

# 6. Indexing Requirements

The registry shall support search and filtering by:
- Full-text search on title, description, keywords
- Category and subcategory filtering
- License type filtering
- Resource type filtering
- Provider filtering
- Confidence score threshold
- QA status filtering
- Date range (date_added, last_verified)
- Tag-based search

---

# 7. Versioning

When a resource is updated by its provider:
- The existing record is preserved as a version snapshot
- A new version is created with updated fields
- Previous versions remain accessible for audit trail
- Productions that used a previous version are not automatically updated

---

# 8. Relationship to Existing App Infrastructure

This schema maps to the following existing app entities:
- `CAEDiscovery` — discovery and initial registry records
- `CAECollectionGoal` — collection targeting
- `CAEPurchaseQueueItem` — acquisition queue items
- `ImageAsset` — cached visual assets
- `LibraryText` / `LibraryHighlight` / `LibraryBookmark` — knowledge assets

---

# 9. Canonical Rules

1. Every discovered resource shall receive a registry record before entering the production pipeline.
2. No resource without a registry record shall be used by any AI Worker or Production Profile.
3. Every registry record shall include license metadata.
4. Duplicate detection shall prevent redundant records.
5. The registry shall support full-text search and multi-dimensional filtering.
6. Version history shall be preserved for all resource updates.
7. Usage tracking shall record every production use of a registry asset.