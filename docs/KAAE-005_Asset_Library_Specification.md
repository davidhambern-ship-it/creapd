# KAAE-005 — Asset Library Specification

**Document Type:** Functional Specification
**Parent Document:** KAAE-001 (Knowledge & Asset Acquisition Engine)
**Status:** Canonical Implementation Specification
**Applies To:** All Production Profiles

---

# 1. Purpose

This specification defines the **Asset Library** — the centralized repository where all approved, licensed, and indexed resources are stored for discovery and reuse across all CREAPD Production Profiles. Per KAAE-001 §12, approved resources shall become part of the CREAPD Asset Library.

---

# 2. Core Principle

**Acquire once, reuse forever.**

The Asset Library exists to maximize the reuse of legally acquired resources across all productions and profiles, reducing costs and ensuring consistency.

---

# 3. Library Capabilities

Per KAAE-001 §12, the Asset Library shall support:

| Capability | Description |
|---|---|
| Search | Full-text and metadata search across all assets |
| Filtering | Filter by type, license, provider, category, tags |
| Categories | Browse by category taxonomy (per KAAE-003 §4) |
| Tags | Free-form tag-based discovery |
| Favorites | Producers can bookmark frequently used assets |
| Collections | Group assets into named collections |
| Recent | Track recently added and recently used assets |
| Recommended | AI-powered recommendations based on production context |
| AI Ranking | Quality and relevance scoring by AI |
| Producer Ranking | Quality scoring by producers |
| Asset History | Full usage history for each asset |
| Versioning | Track multiple versions of the same asset |

---

# 4. Library Structure

```
Asset Library
├── Knowledge Assets
│   ├── Academic Papers
│   ├── Articles
│   ├── Books
│   ├── Government Publications
│   ├── Reports
│   └── Statistics
├── Visual Assets
│   ├── SVG / Icons
│   ├── Photos
│   ├── Illustrations
│   ├── Infographics
│   ├── Maps
│   ├── Charts
│   └── Diagrams
├── Video Assets
│   ├── Footage
│   ├── Motion Graphics
│   ├── Animations
│   └── GIFs
├── Audio Assets
│   ├── Voice Clips
│   ├── Music Tracks
│   ├── Sound Effects
│   └── Podcasts
├── Interactive Assets
│   ├── Templates
│   ├── Slide Themes
│   ├── Presentation Layouts
│   ├── Component Libraries
│   ├── UI Assets
│   └── Fonts
└── Producer Collections
    ├── (user-defined)
    └── (project-defined)
```

---

# 5. Search System

### 5.1 Full-Text Search
Searches across title, description, and keywords of all registry records.

### 5.2 Faceted Filtering
After an initial search, producers can refine results by:
- Resource type
- License type
- Provider
- Category / subcategory
- Tags
- Confidence score threshold
- QA status
- Date added range

### 5.3 Smart Search
The library shall support contextual search that understands:
- "I need a chart showing GDP growth" → returns chart assets with GDP-related keywords
- "I need a calm background image" → returns images tagged with "calm" and "background"
- "I need an icon for settings" → returns SVG icons matching "settings"

---

# 6. Recommendation Engine

### 6.1 Contextual Recommendations
Based on the current production context (profile, topic, tone), the library recommends:
- Relevant images for the current story
- Applicable charts for current data
- Matching icons for the current slide
- Suitable templates for the current profile

### 6.2 AI Ranking
Each asset receives an AI-generated relevance score (0-100) based on:
- Relevance to the query
- Quality score from QA
- Usage frequency by other producers
- License compatibility
- Recency

### 6.3 Producer Ranking
Producers can rate assets (1-5 stars). High-rated assets are surfaced more frequently in recommendations.

---

# 7. Collections

### 7.1 Producer Collections
- Each producer can create named collections
- Collections are private by default
- Collections can be shared with team members
- Collections can be project-specific

### 7.2 System Collections
- "Recently Added" — assets added in the last 7 days
- "Trending" — most used assets in the last 30 days
- "High Confidence" — assets with confidence > 80
- "Broadcast Ready" — assets with QA status "approved"
- "Free License" — assets with public_domain or CC-BY licenses

---

# 8. Versioning

When an asset is updated:
- The previous version is archived (not deleted)
- The new version becomes the default
- Productions that used the old version are not auto-updated
- Producers can manually upgrade to the new version
- Version history is accessible from the asset detail view

---

# 9. Asset Lifecycle

```
Discovered → Verified → Licensed → Indexed → Available
                                              ↓
                                     Used in Production
                                              ↓
                                     Reused (usage_count++)
                                              ↓
                                     Deprecated / Archived
```

### 9.1 Deprecation
An asset can be deprecated if:
- The source is permanently down
- The license becomes incompatible
- The asset is superseded by a better version
- The producer manually deprecates it

### 9.2 Archival
Deprecated assets are moved to an archived state:
- Not shown in default search results
- Still accessible via "Show Archived" filter
- Existing productions that use them are not affected
- Cannot be added to new productions

---

# 10. Cross-Profile Sharing

The Asset Library is shared across all Production Profiles:

| Profile | Typical Assets Used |
|---|---|
| News | News feeds, press releases, government updates, RSS |
| Music | Artist metadata, album art, music tracks |
| Sports | Statistics, schedules, player data |
| Cooking | Recipe images, ingredient photos |
| Spiritual | Scripture texts, devotional content |
| Talk | Guest photos, topic research |
| Cosmo | Guest media, topic research |
| Research | Academic papers, charts, scientific images |
| Presentation Editor | Icons, SVGs, fonts, templates, backgrounds, charts |

---

# 11. Relationship to Existing App Infrastructure

This library maps to the following existing app components:
- `ImageAsset` entity — visual asset storage
- `LibraryText` / `LibraryHighlight` / `LibraryBookmark` entities — knowledge assets
- `CustomFont` entity — font assets
- `ProductionTemplate` / `BriefingTemplate` / `PromptTemplate` entities — template assets
- `LibraryBookmark` — favorites/bookmarks
- `librarySearch` backend function — search implementation
- `src/components/library/*` components — library UI

---

# 12. Canonical Rules

1. The Asset Library is the single source of truth for all approved resources.
2. Every asset in the library shall have a registry record (per KAAE-003).
3. Every asset in the library shall have a verified license (per KAAE-004).
4. The library shall be shared across all Production Profiles.
5. Asset reuse shall be tracked and reported.
6. Versioning shall preserve historical versions without auto-updating existing productions.
7. Deprecated assets shall remain accessible but not addable to new productions.
8. The library shall support full-text search, faceted filtering, and contextual recommendations.