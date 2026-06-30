# Producer — Modular Production Profile Architecture

## ✅ Phase 1: Foundation Complete

### What's Been Implemented

#### 1. **ProductionProfile Entity** (`base44/entities/ProductionProfile.jsonc`)
- Stores production type configurations
- Fields: profile_name, profile_type, description, icon, color, research_modules, production_modules, output_modules, ai_preferences, export_settings, item_type_label, etc.
- Supports 13 production types: news, podcast, radio_show, music_show, cooking_show, sports_show, talk_show, livestream, church_service, educational_content, business_briefing, gaming_stream, custom

#### 2. **Seed Function** (`base44/functions/seedProductionProfiles/entry.ts`)
- Automatically seeds 12 default production profiles
- Each profile configured with:
  - Research modules (what sources to use)
  - Production modules (what assets to generate)
  - Output modules (what export formats)
  - AI preferences (tone, style, model)
  - Item type labels (Story/Segment/Song/Recipe/etc.)

#### 3. **Production Profiles Page** (`src/pages/ProductionProfiles.jsx`)
- View all production profiles in a card grid
- Edit profile configurations
- Duplicate profiles
- Create custom profiles
- Reset to defaults

#### 4. **Production Profile Selector** (`src/components/production/ProductionProfileSelector.jsx`)
- Modal that asks "What are we producing today?"
- Shows all available production types as colorful cards
- User selects a profile when starting a new production

#### 5. **StoryManager Integration** (`src/pages/StoryManager.jsx`)
- Shows profile selector when no active production exists
- Stores production_profile_id on new productions
- Ready to adapt UI terminology based on selected profile

#### 6. **Production Entity Update** (`base44/entities/Production.jsonc`)
- Added `production_profile_id` field
- Links productions to their production profile configuration

#### 7. **Navigation**
- Added "Production Profiles" to sidebar (Clapperboard icon)
- Route: `/production-profiles`

---

## 🎯 Default Production Profiles

| Profile | Type | Item Label | Color |
|---------|------|------------|-------|
| News Production | news | Stories | Purple |
| Podcast | podcast | Segments | Orange |
| Radio Show | radio_show | Segments | Emerald |
| Music Show | music_show | Songs | Purple |
| Cooking Show | cooking_show | Recipes | Orange |
| Sports Show | sports_show | Topics | Emerald |
| Talk Show | talk_show | Topics | Purple |
| Livestream | livestream | Segments | Orange |
| Church Service | church_service | Segments | Emerald |
| Educational Content | educational_content | Lessons | Purple |
| Business Briefing | business_briefing | Topics | Orange |
| Gaming Stream | gaming_stream | Segments | Purple |
| Custom Production | custom | Items | Purple |

---

## 🔄 Next Steps (Phase 2)

### 1. Adaptive UI Terminology
- Update StoryManager, StoryQueue, StoryLibrary to use profile-specific labels
- "Stories" → "Segments" (Podcast), "Songs" (Music), "Recipes" (Cooking), etc.

### 2. Profile-Specific Research Sources
- Update Sources page to filter by production profile
- News: major news, government, press releases
- Music: charts, new releases, artist news
- Cooking: recipes, ingredients, food history
- etc.

### 3. Profile-Specific Production Modules
- Update generateProductionPackage function to use profile modules
- News: teleprompter script, lower thirds, fact-check notes
- Podcast: episode outline, show notes, guest questions
- Cooking: recipe cards, shopping list, step instructions
- etc.

### 4. Article → ProductionItem (Optional)
- Consider renaming Article entity to ProductionItem for clarity
- Or add item_type field to distinguish between stories, songs, recipes, etc.

### 5. Export Profiles
- Update ExportCenter to suggest formats based on production profile
- News: PDF, teleprompter
- Podcast: Markdown, show notes
- Cooking: PDF, recipe cards

### 6. Onboarding Flow
- First-time users see production profile selector
- Tutorial/guide for choosing production type

---

## 📋 Core Principles

✅ **One flexible system** — not separate apps per category
✅ **Reusable modules** — research, production, and output modules are shared
✅ **Profile-driven** — behavior adapts based on selected profile
✅ **News stays intact** — existing news workflow becomes the first profile
✅ **Custom profiles** — users can create their own production types

---

## 🚀 How It Works

1. User clicks "Story Manager" (or "Item Manager")
2. If no active production → "What are we producing today?" modal appears
3. User selects a production type (e.g., Cooking Show)
4. Production is created with that profile
5. UI adapts terminology (Recipes instead of Stories)
6. Research sources filtered to cooking-related sources
7. Production packages generate cooking-specific assets
8. Export suggests recipe card formats

---

**Status:** Foundation complete. Ready for Phase 2: Adaptive UI and profile-specific workflows.