# Producer — Modular Production Profile Architecture

## Overview

Producer has been transformed from a news-only production app into a **universal AI-powered production workspace** that supports multiple production types including news, podcasts, radio shows, music shows, cooking shows, sports shows, talk shows, livestreams, church services, educational content, business briefings, and gaming streams.

## Core Architecture

### Production Profile System

The heart of the new architecture is the **Production Profile** — a reusable configuration that controls how Producer behaves for each production type.

**Each Production Profile defines:**
- What type of production the user is creating
- What research sources should be used
- What production assets should be generated
- What AI tools should be enabled
- What templates should be suggested
- What export formats are most relevant

### Modular Structure

```
Production Type (e.g., "News", "Podcast", "Cooking Show")
    ↓
Production Profile (configuration stored in database)
    ↓
Research Modules (what sources to gather from)
    ↓
Production Modules (what assets to create)
    ↓
Output Modules (what gets exported)
    ↓
Export Profiles (format-specific settings)
```

## New Entities

### 1. ProductionProfile
Stores configuration for each production type:
- `profile_name`: Display name (e.g., "News Production")
- `profile_type`: Type identifier (e.g., "news", "podcast", "cooking_show")
- `description`: User-facing description
- `icon`: Icon name for UI
- `color`: Gradient color scheme
- `research_modules`: JSON array of enabled research modules
- `production_modules`: JSON array of production assets to generate
- `output_modules`: JSON array of export options
- `is_default`: Whether this is the default profile
- `is_active`: Whether this profile is available

### 2. ProductionItem
Generalized item structure replacing news-only "Story" concept:
- `title`: Item title
- `item_type`: Type (article, story, song, recipe, topic, segment, guest, etc.)
- `category`: Category classification
- `production_profile_id`: Link to active profile
- `production_profile_type`: Profile type for filtering
- `source`: Source name
- `source_url`: Original URL
- `summary`: Brief description
- `content`: Full content
- `status`: new, reviewing, selected, in_production, completed, archived
- `is_selected`: Whether selected for current production
- `selected_for_production_id`: Link to production
- `metadata`: Additional JSON data
- `priority`: low, medium, high, breaking

### 3. ResearchModule
Defines available research sources per profile type:
- `module_name`: Display name
- `module_type`: Source type (news_sources, music_charts, recipes, scripture, etc.)
- `description`: What this module provides
- `is_active`: Whether enabled
- `configuration`: Module-specific settings

## Supported Production Types

| Type | Research Focus | Key Outputs |
|------|---------------|-------------|
| **News** | News sources, government, press releases | Story cards, scripts, lower thirds, AI images, fact-check notes |
| **Podcast** | Topic research, guest info, industry news | Episode outline, intro/outro scripts, show notes, thumbnails |
| **Radio Show** | Music charts, weather, local events | Show clock, playlist, host banter, station breaks |
| **Music Show** | Charts, new releases, artist news | Playlist, artist facts, music trivia, transitions |
| **Cooking Show** | Recipes, ingredients, seasonal foods | Recipe cards, shopping lists, cooking scripts, food images |
| **Sports Show** | Scores, stats, team news | Game recaps, player profiles, debate questions |
| **Talk Show** | Guest background, trending topics | Interview questions, segment transitions, monologue |
| **Livestream** | Platform trends, audience prompts | Stream outline, chat prompts, poll questions |
| **Church Service** | Scripture, sermon research | Sermon outline, prayer points, service rundown |
| **Educational** | Learning objectives, examples | Lesson plans, teaching scripts, quiz questions |
| **Business Briefing** | Industry news, market data | Executive summaries, presentation slides |
| **Gaming Stream** | Game updates, patch notes | Stream outline, game summaries, challenge ideas |

## Universal Workflow

All production types follow the same core workflow:

1. **Select Production Type** → Choose from production profile cards
2. **Research** → Gather items from relevant sources
3. **Select Items** → Choose items for production
4. **Build Rundown** → Organize selected items
5. **Generate Package** → Create AI-powered assets
6. **Review/Edit** → Refine generated content
7. **Export** → Output in desired format

## Key Components

### ProductionTypeSelector
- Grid of production type cards
- Create custom production types
- Stores active profile in session storage

### ProductionProfileBadge
- Displays current production type throughout app
- Color-coded by profile type
- Shows in sidebar, dashboard, headers

### ResearchCenter
- Modular research interface
- Import from URLs
- Filter by research modules
- Select items for production

## UI Updates

### Terminology Changes
- "Story Queue" → "Item Queue" (news shows "Stories", music shows "Songs", etc.)
- "Story Library" → "Item Library"
- "Story Manager" → "Item Manager"
- "Briefing Center" → "Research Center" (or "Briefing / Research Center")

### Navigation
- New "Select Production Type" highlighted in sidebar
- Active production type badge in sidebar header
- Context-aware labels based on profile type

## Backend Functions

### seedProductionProfiles
- Seeds 12 default production profiles
- One-time initialization
- Creates profiles with appropriate modules

### getProductionProfile
- Fetches profile configuration by type
- Returns profile + research modules + production modules
- Creates default profile if none exists

## Data Flow

1. User selects production type → stored in `sessionStorage`
2. App reads active profile → filters UI and features
3. Research modules load → user gathers items
4. Items stored as `ProductionItem` with profile context
5. Production package generation uses profile-specific prompts
6. Export adapts to profile's output modules

## Extensibility

### Adding New Production Types

1. Add profile type to `ProductionProfile.profile_type` enum
2. Create profile record with appropriate modules
3. Define research modules in `ResearchModule`
4. Configure production modules for asset generation
5. Update UI components to handle new type

### Adding Research Modules

1. Add module type to `ResearchModule.module_type` enum
2. Create module record linked to profile type(s)
3. Implement data fetching logic
4. Module appears automatically in Research Center

## Backward Compatibility

- Existing news workflow fully preserved
- News becomes first default production profile
- All existing features remain functional
- Gradual terminology updates (Story → Item)

## Future Expansion

The modular architecture enables:
- Unlimited production types
- Custom user-defined workflows
- Profile-specific AI prompts
- Template suggestions by profile
- Export format customization
- Third-party integrations per profile type

## Philosophy

**Producer is not just a news app.**

Producer is an **AI show production workspace** that guides users from idea/research to complete production package, regardless of show type.

**Core Principle:** The producer remains in control. AI assists rather than replaces. Every feature simplifies production.