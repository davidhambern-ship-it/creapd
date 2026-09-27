# CREAPD Base44 Dependency Audit — 2026-09-27

Branch: `backend/vercel-foundation`

## Goal

Make the Vercel Preview fully CREAPD-owned before production cutover. Base44 remains a compatibility layer only; new business logic must not be added there.

## Current owned systems

### Green — owned Preview path is implemented

- Neon Auth on Vercel Preview.
- CREAPD Vercel API client (`/api/creapd/*`).
- Neon-backed Research production read/write path.
- Research engine start and point extraction path.
- Research production package generation and package updates.
- Presentation Studio load/edit/save/QA/direct/share path for Neon-owned presentations.
- Talk production configuration/build/refresh/read path.
- Talk topics, guests, assets, rundown/live state on Neon path.
- OBS bridge, scene/source control, Program Monitor, recording, media upload, and direct layout editing.
- Vercel Blob upload path is proven by local voice generation and OBS media uploads.

## Compatibility layer audit

`src/api/base44Client.js` explicitly redirects only these legacy surfaces on owned Preview:

### Entities with owned adapters

- `ResearchTopic.create`
- `ResearchPoint.update` for point status/package compatibility
- `ProductionPackage.create/update` for ResearchPoint packages
- `StoriesPresentation.update` for Neon-owned presentations
- `StorySlide.create/update/delete` for Neon-owned presentations
- `SlideElement.filter/create/update/deleteMany` for Neon-owned presentations

Any other entity or method still falls through to Base44.

### Functions with owned adapters

- `loadEditorData`
- `directPresentation`
- `cpeController`
- `dispatchWorker` for Presentation Studio QA
- `sharePresentation`
- `shareToCreapd`
- `generateNewsPresentation` only for regeneration of an already Neon-owned presentation
- `deepResearchV2`
- `extractResearchPoints`
- `buildResearchProduction`

Any other Base44 function invocation still falls through.

### Core integration interception

- Research package approval prompt avoids duplicate Base44 LLM work on owned Preview.
- Presentation text rewrite routes through the CREAPD backend for Neon-owned presentations.
- Other `Core.InvokeLLM` calls still fall through to Base44.

## Verified remaining Base44 hotspots

### News / Producer — RED

`src/pages/Dashboard.jsx` still reads these directly from Base44:

- Briefing
- Article
- AutomationLog
- BrandProfile
- ShowProfile
- ExportLog
- News ProductionPackage records

`src/pages/ResearchDesk.jsx` still uses Base44 for:

- Article reads
- ProducerNote reads/writes
- Echo/LLM note generation

`src/pages/ImageLibrary.jsx` still uses Base44 `ImageAsset` CRUD.

These are not conditional Preview fallbacks; they are active dependencies.

### Shared Asset Library / KAAE — RED

`src/pages/admin/AssetLibrary.jsx` still reads `AssetRegistry` from Base44.

`src/components/library/ImageUploadModal.jsx` still uploads through `base44.integrations.Core.UploadFile` and writes `ImageAsset`.

The repository already contains canonical KAAE Asset Registry / Asset Library specifications, but there is no owned Postgres asset-registry migration yet.

### Music — RED

`src/pages/MusicDashboard.jsx` still updates `MusicProductionConfiguration` and invokes:

- `buildMusicProduction`
- `regenerateMusicSection`

through Base44.

### Cooking — RED

`src/pages/CookingDashboard.jsx` still reads/writes `CookingProductionConfiguration` and invokes `buildCookingProduction` through Base44.

### Sports — RED

`src/pages/SportsDashboard.jsx` still reads/writes `SportsProductionConfiguration` and invokes `buildSportsProduction` through Base44.

### Cosmo — RED

`src/pages/CosmoDashboard.jsx` still reads/writes `CosmoProductionConfiguration` and invokes `buildCosmoProduction` through Base44.

### Spiritual — RED

`src/pages/SpiritualDashboard.jsx` still writes `SpiritualProductionConfiguration` and invokes `buildSpiritualProduction` through Base44.

### Talk — GREEN on Preview / LEGACY fallback remains for production

Talk pages use `creapdApi` when the source is Neon or when running on the owned Preview. Base44 code remains in the same files only as a production compatibility path until final cutover.

Verified examples:

- TalkConfigure
- TalkDashboard
- TalkTopics
- TalkGuests
- TalkAssets

### Research — GREEN/YELLOW

Research production, dossiers, packages, topic creation/research, and point status/package work are owned on Preview.

Remaining adjacent legacy surface:

- `ResearchDesk` is still tied to News-style Base44 Article / ProducerNote data.
- The compatibility layer still exposes un-migrated methods on Research entities if a page calls them.

## Migration order from this audit

1. **Shared Asset Library + ImageAsset upload/CRUD**
   - Highest reuse across News, Presentation, and every Production Studio.
   - Reuse the Vercel Blob upload pattern already proven by OBS uploads.
   - Add owned Postgres asset registry/library tables and API.
   - Move Image Library and upload modal off Base44.

2. **News / Producer data core**
   - Briefings, Articles, Producer Notes, Brand/Show profiles, Export logs.
   - Replace Dashboard and ResearchDesk reads/writes.

3. **Universal Production Studio CRUD/build contract**
   - Use one owned configuration/build API shape for Music, Cooking, Sports, Cosmo, and Spiritual.
   - Port specialty builders one by one behind that common contract.

4. **Admin / KAAE / CAE / SMC**
   - Migrate Asset Registry workers and admin utilities after the shared owned registry exists.

5. **Final cutover**
   - Turn Preview fallback telemetry into a hard failure.
   - Exercise every route.
   - Confirm zero Base44 fallbacks.
   - Remove `@base44/sdk`, `@base44/vite-plugin`, Base44 auth fallback, and unmatched Base44 API proxy.

## Runtime audit instrumentation

As of this audit, `src/api/base44Client.js` emits a deduplicated console warning whenever the Neon-owned Preview touches an un-migrated Base44 entity, backend function, or integration. This gives us a live dependency detector while testing the Preview without changing behavior.

Warning prefix:

`[CREAPD MIGRATION] Base44 fallback used on owned Preview:`

The final migration gate is: **no warnings during full-route acceptance testing.**
