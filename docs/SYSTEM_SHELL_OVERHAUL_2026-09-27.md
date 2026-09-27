# CREAPD System Shell Overhaul — 2026-09-27

## Why this exists

The current frontend grew profile-by-profile and inherited a large amount of Base44-generated navigation/layout debt. The result is that CREAPD does not behave like one system with multiple Production Studios. It behaves like several related apps sharing routes.

This overhaul standardizes the user experience before more backend migration work is layered on top of the current shell.

## Confirmed architecture problems

### 1. News is acting as the system shell instead of a Production Studio

The News route group currently owns many pages that are not News-specific:

- Brand Profiles
- Show Profiles
- Media Library
- Sources
- Manual Import
- Archive
- Automation
- User Profile
- Organizations
- Activity Center
- Templates
- Graphics Templates
- Prompt Templates
- Security
- Settings
- Presentations

Because those pages live under `/news/*`, the News Production Studio looks like the parent of the rest of CREAPD.

Target rule: **News is one Production Studio, equal to Talk, Music, Cooking, Sports, Cosmo, Spiritual, and Research.**

### 2. Production Studios do not share one layout shell

Current layouts:

- News -> `ProducerLayout`
- Talk -> `TalkLayout`
- Cooking -> `CookingLayout`
- Sports -> `SportsLayout`
- Cosmo -> `CosmoLayout`
- Spiritual -> `SpiritualLayout`
- Music -> `MusicLayout`
- Research -> RPP-specific `components/rpp/ResearchLayout`

These files independently recreate header/sidebar/footer/mobile behavior and have drifted.

Specific examples:

- Music does not render the same ProducerHeader/sidebar shell.
- Research uses a separate RPP shell even though another `components/layout/ResearchLayout.jsx` also exists.
- News uses a completely different sidebar component.
- Talk Live intentionally runs standalone, but the transition into/out of it is not governed by a shared shell contract.

Target rule: **All Production Studios use one canonical `ProductionStudioLayout`.**

### 3. Global navigation changes depending on where the user is

The ProducerHeader, PPNavBar, mobile PP navigation, ProductionFooter, and studio layouts all participate in navigation.

This creates multiple competing navigation systems.

Target rule:

- One global header.
- One Production Studio switcher.
- One studio sidebar.
- One global utility menu.
- One mobile equivalent of the same architecture.

### 4. Settings are structurally misplaced

Every specialty Production Studio links to:

`/settings/default-production`

But the route is currently declared inside the Music layout route group.

That means a global Settings destination is structurally owned by Music.

Target rule: **All global/system routes live outside Production Studio layout groups.**

### 5. Header profile link is News-coupled

The shared ProducerHeader currently sends the profile button to:

`/news/profile`

Target rule: **Global profile/settings destinations must never be Production Studio-prefixed.**

### 6. Sidebar labels are implementation language, not user language

Examples:

- `Discovery — Story Queue`
- `Knowledge — Research Desk`
- `Blueprint — Story Manager`
- `Production — Packages`
- `Assembly — Export`

The department model is useful internally, but repeating department names in every label makes navigation harder to scan.

Target rule:

Use department names as optional group headings/progress context, while link labels describe the thing the user wants:

- Dashboard
- Setup
- Research
- Topics / Stories / Recipes / Games
- Guests / Ingredients / Athletes
- Assets
- Rundown / Package
- Live
- Export

## Target CREAPD navigation architecture

### Global Header

Persistent across all normal authenticated pages:

- CREAPD logo -> CREAPD Home
- Global Search
- Production Studio switcher
- Current Studio name
- Notifications
- User/Profile menu

No News-only state is displayed when the active studio is not News.

### Production Studio Sidebar

Only contains work that belongs to the active Production Studio.

Recommended maximum: 8 primary destinations before contextual/detail pages.

The shared workflow vocabulary is:

1. Dashboard
2. Setup
3. Research
4. Develop
5. Assets
6. Assemble
7. Live (when supported)
8. Export

Studios can rename the middle destinations to match their domain, but the structure should remain predictable.

Examples:

#### News
- Dashboard
- Today's Brief
- Story Queue
- Research
- Story Workspace
- Packages
- Live / Present
- Export

#### Talk
- Dashboard
- Setup
- Research
- Topics
- Guests
- Assets
- Rundown
- Live
- Export

#### Cooking
- Dashboard
- Setup
- Research
- Recipes
- Ingredients
- Assets
- Rundown
- Export

#### Sports
- Dashboard
- Setup
- Research
- Games
- Athletes
- Assets
- Rundown
- Export

#### Cosmo
- Dashboard
- Setup
- Research
- Topics
- Guests
- Assets
- Rundown
- Export

#### Spiritual
- Dashboard
- Setup
- Research
- Library / Study
- Message
- Assets
- Package
- Export

#### Music
- Dashboard
- Setup
- Research
- Playlist
- Assets
- Rundown
- Live / Playback
- Export

#### Research
- Dashboard / Lobby
- Setup
- Topics
- Dossiers
- Point Manager
- Packages
- Presentations
- Export

### Global Utility Navigation

These are CREAPD system tools, not News tools:

- Media Library
- Asset Library
- Presentations
- Templates
- Sources / Imports
- Archive
- Automation
- Activity
- Organizations
- Security & Privacy
- Settings
- Profile

Recommended route family:

- `/library/media`
- `/library/assets`
- `/presentations`
- `/templates`
- `/sources`
- `/imports`
- `/archive`
- `/automation`
- `/activity`
- `/organizations`
- `/security`
- `/settings`
- `/profile`

Old `/news/*` URLs should redirect during migration so bookmarks are not broken.

## Canonical shell implementation

Create:

- `src/components/layout/ProductionStudioLayout.jsx`
- `src/components/layout/GlobalHeader.jsx`
- `src/components/layout/StudioSidebar.jsx`
- `src/components/layout/GlobalUtilityMenu.jsx`
- `src/lib/studioNavigation.js`
- `src/lib/systemNavigation.js`

The layout receives a studio key and resolves:

- theme
- studio navigation
- footer/live behavior
- mobile navigation
- studio-specific environment

Do not duplicate shell JSX per Production Studio.

## Refactor sequence

### Phase A — Shell foundation

1. Build canonical navigation registries.
2. Build one GlobalHeader.
3. Build one StudioSidebar.
4. Build one ProductionStudioLayout.
5. Do not change page business logic yet.

### Phase B — Move one studio at a time

Order:

1. Talk — recently tested and easiest baseline.
2. Cooking
3. Sports
4. Cosmo
5. Spiritual
6. Music
7. Research
8. News last, because News currently contains global/system routes that need extraction.

### Phase C — Extract system tools from News

Move global pages to global routes while keeping compatibility redirects.

News sidebar must contain News work only.

### Phase D — Archive unification

System Archive becomes a true cross-CREAPD archive with categories for:

- Productions
- Articles / Stories
- Media
- Presentations
- Research
- Other archived system records

Each archive category supports restore and permanent delete where appropriate.

### Phase E — Cleanup

After every studio uses the canonical shell:

- delete duplicate studio layout files
- delete unused Research layout implementation
- remove stale route aliases after compatibility period
- remove duplicate PP switchers
- remove News-prefixed global routes from UI
- run full desktop + mobile acceptance test

## Non-negotiable UX rules

1. The top navigation must not change structure between Production Studios.
2. The same global tool must always be found in the same place.
3. Production Studio sidebars contain Production Studio work only.
4. Global/system tools are never owned by News or any other Production Studio.
5. Every sidebar label must make sense to a first-time user without knowing CREAPD internal architecture.
6. A user should be able to identify where they are, what studio is active, and what the next logical action is within seconds.
7. Desktop and mobile use the same information architecture, adapted only for screen size.
8. Live execution pages may use a specialized cockpit, but entering and exiting Live must remain obvious and predictable.

## Relationship to backend migration

This shell overhaul should happen before migrating the remaining specialty Production Studio backends.

Reason: migrating old Base44 behavior into an inconsistent frontend would preserve the same architectural debt we are trying to remove.

Backend work already completed for Auth, Research, Talk, Presentation Studio, Asset Library, and OBS remains valid and should be retained.
