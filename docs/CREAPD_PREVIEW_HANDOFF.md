# CREAPD Preview Migration Handoff

> **READ THIS FIRST IN A NEW CHAT / NEW WORK SESSION.**
>
> This file is the persistent handoff for the CREAPD rebuild. Before changing code, inspect this file, the current `backend/vercel-foundation` branch head, and Vercel status. Update this file after every meaningful migration/test checkpoint.

## 1. Mission

CREAPD is being rebuilt and fully tested **before anything is promoted to the live site**.

The goal is a **fully operational, launch-ready CREAPD in Preview**, with runtime ownership migrated off Base44. Only after the entire product is upgraded, regression-tested, demo-tested, and audited do we promote the completed rebuild to `main`.

The user specifically wants CREAPD dependable enough that demonstrations do not randomly fail.

### Definition of launch-ready

CREAPD is not launch-ready until:

- Every Production Studio works end-to-end in Preview.
- Shared production flows work across Studios.
- Data survives refresh, navigation, logout/login, reopen, edit, reject/restore, and regeneration.
- Critical runtime behavior no longer depends on Base44 entities, backend functions, auth, AI integrations, or hidden fallbacks.
- Failure states are explicit; no endless Initializing states, blank pages, silent failures, or dead buttons.
- Shared flow works: **Studio -> research/content -> Production Package -> Dispatch -> Presentation Studio -> Editor -> review/present/export**.
- Multiple realistic demos can be run from the CREAPD home screen.
- Final repository-wide Base44 audit is complete.
- Only then is Preview promoted to `main` and production smoke-tested.

## 2. Branch / Environment Rules

### Development/testing branch

`backend/vercel-foundation`

### Preview URL

`https://project-1nufq-git-backend-vercel-foundation-texasnomadgames.vercel.app/`

### Vercel

- Project: `project-1nufq`
- Team slug: `texasnomadgames`
- Team ID: `team_E9xyI6RoOjilno6YazF4Bksb`

### Live branch

`main`

**Treat `main` as frozen. Do not implement migration work there.**

`main` was intentionally restored to:

`ca03bf2af028cc2cf62e915c2e47c41ee6a0f214` — `Add explicit presentation editor exit`

The experimental Talk/client-side Base44 work accidentally made on `main` was removed. Do not resurrect it as the migration architecture.

## 3. Current Preview Checkpoint — 2026-09-10

### Functional code head

`6c398d3bc76884152f6a12f8cb35adf4ebcfd100` — `Route Talk asset approvals through owned backend`

Vercel status for this commit: **SUCCESS / DEPLOYED**.

### Important Vercel architecture discovery

Preview already had 12 Vercel serverless API functions. The first attempt to add separate Talk API routes created function #13 and caused Vercel deployment failures.

Those failed deployments are **superseded history**, not active runtime problems.

The fix was to consolidate Talk behind the existing owned Production Core endpoint instead of adding many Studio-specific Vercel functions.

**Current pattern:**

`React Studio UI -> /api/creapd/production/core -> Studio server module -> Neon / owned services`

This is now the preferred pattern for later Studios where practical because it avoids Vercel function-count pressure and gives CREAPD one shared production gateway.

Do not re-add `/api/creapd/talk/configuration.js` or `/api/creapd/talk/production.js` as separate functions unless the hosting architecture changes.

## 4. Architecture Direction

Preview is becoming the **new CREAPD**, not merely a patched copy of the old one.

### Owned runtime direction

- Frontend: React/Vite on Vercel
- Backend/API: owned `/api/creapd/*` Vercel routes
- Shared Studio gateway: `/api/creapd/production/core`
- Primary persistent data: Neon/Postgres
- Owned client: `src/api/creapdClient.js`
- Neon-aware auth: `shouldUseNeonAuth()` / owned auth path
- Base44 may temporarily remain as compatibility/fallback for unmigrated areas, but is not the final source of truth.

### Migration rule

A Studio is not migrated merely because a Base44 backend function was replaced with browser-side Base44 SDK calls.

Target:

**React UI -> CREAPD API -> Neon / owned services**

not:

**React UI -> Base44 entities/functions/integrations**

### Blueprint north star

The user-provided **CREAPD Zero-Cost Technical & Strategic Upgrade Blueprint** is an architecture reference. Preserve its goals while adapting them to CREAPD's existing owned stack:

- Edge/local hybridization
- zero/near-zero validation cost
- multi-agent editorial intelligence
- model/provider fallback architecture
- OBS WebSocket integration
- browser-source overlays
- Host/Teleprompter mode
- live segment/timestamp logging
- post-show transcription + local FFmpeg clipping
- future multi-tenant organizations/shows/memberships/RLS

Do not add Supabase/NextAuth/Lucia merely because the blueprint names them if Neon/current owned infrastructure already satisfies the requirement.

## 5. Research Studio — REFERENCE IMPLEMENTATION

Research remains the strongest tested migration reference.

Owned Research routes include:

- `/api/creapd/research/production.js`
- `/api/creapd/research/configuration.js`
- `/api/creapd/research/topic-action.js`
- `/api/creapd/research/dossier-action.js`
- `/api/creapd/research/dossier-status.js`
- `/api/creapd/research/archive.js`
- `/api/creapd/research/voice-upload.js`

Controlled Research regression passed the important path:

- points persisted
- approve worked
- package count changed
- navigate away/back preserved state
- reject/restore worked
- package/editor opened
- explicit Exit Editor works

Known non-blocking issue: Escape does not reliably exit Present mode. User explicitly does not care about this right now.

Research is a reference implementation, not something to ship independently.

## 6. Presentation Studio

Preview contains an owned Presentation Studio more advanced than `main`.

It reads owned production data through `/production/core`, opens `/editor/:id`, uses owned delete/update/editor actions, and should not be overwritten with the older `main` Presentation/Assembly implementation without inspection.

## 7. Talk Studio 2.0 — CURRENT STATUS

### Status vocabulary

- Code foundation: **BUILT**
- Vercel: **DEPLOYED**
- Neon migration 004: **APPLIED + VERIFIED**
- User end-to-end Talk test: **NOT TESTED YET**
- Talk Studio overall: **PARTIAL** until real Preview acceptance testing passes

### Neon migration

Migration file:

`server/migrations/004_talk_studio.sql`

Migration `004` was first prepared and tested on a temporary Neon migration branch, then explicitly approved by the user and applied to the active Preview database on 2026-09-10.

Verified active tables:

- `creapd.talk_production_configurations`
- `creapd.talk_topics`
- `creapd.talk_research_items`
- `creapd.talk_guests`
- `creapd.talk_segments`
- `creapd.talk_assets`
- `creapd.talk_sessions`
- `creapd.talk_events`

`creapd.schema_migrations` contains version `004`: `Owned Talk Studio persistence, agent intelligence fields, and live session event foundation`.

The schema includes Blueprint-forward fields such as:

- research verification status/notes/confidence
- counter-perspectives
- debate questions
- runtime segment state
- actual segment start/end/duration
- clip marker counts
- OBS scene/overlay payload fields
- Host View state
- Talk session/event logging

### Talk server modules

- `server/talkEngine.js` — owned Talk intelligence/build engine
- `server/talkStudio.js` — owned Talk persistence/actions
- `api/creapd/production/core.js` — shared gateway now exposes Talk operations

Talk intelligence direction is:

**research -> verification -> counter-perspective/debate -> synthesis -> rundown -> host/production assets -> owned Production Package**

### Talk frontend wiring already moved to owned path in Preview

Relevant pages/hooks include:

- `src/hooks/useTalkProduction.js`
- `src/pages/TalkConfigure.jsx`
- `src/pages/TalkDashboard.jsx`
- `src/pages/TalkTopics.jsx`
- `src/pages/TalkGuests.jsx`
- `src/pages/TalkAssets.jsx`
- `src/pages/TalkRundown.jsx`

Owned Preview behavior includes:

- configuration save/build through Production Core
- Talk production reads through Production Core
- refresh/rebuild through owned path
- topic approval/unapproval through owned path
- guest create/update/delete/confirm through owned path
- asset approval/unapproval through owned path

Unmigrated/future Talk features still include full Host Mode execution UI, OBS bridge execution, and post-show clipping/transcription implementation. The Neon event/session foundation exists so these can be added without redesigning persistence.

## 8. Talk Acceptance Test — NEXT GATE

Talk is **not PASSED** just because Vercel is green and the database migration exists.

The user must exercise the actual Preview flow.

Required test sequence:

1. Hard-refresh the `backend/vercel-foundation` Preview.
2. Open Talk Studio and create/configure a new Talk production from scratch.
3. Click **Build Production** and confirm the build completes instead of hanging/falling back.
4. Confirm Dashboard populates.
5. Open Research and inspect generated owned research.
6. Open Topics; approve/unapprove at least one topic and verify persistence.
7. Open Guests; add a guest, confirm/unconfirm, delete or edit as applicable, navigate away/back, verify persistence.
8. Open Rundown and confirm structured segments/timing exist.
9. Open AI Assets; approve/unapprove an asset and verify persistence.
10. Confirm an owned Production Package exists for the Talk build.
11. Navigate away, refresh, return, and verify the Talk production persists.
12. If package/dispatch UI is available, send it through the shared Presentation Studio/editor path and reopen it.
13. Intentionally trigger at least one recoverable error later in regression testing and verify a clear failure state.
14. Confirm the tested Talk path does not silently invoke `buildTalkProduction` on Base44.

Only after the real Preview test passes should Talk be marked **PASSED**.

## 9. Remaining Studios / Major Areas

Not yet fully migrated/tested for launch-ready Preview:

- Talk — current testing focus
- Cooking
- Sports
- Cosmo
- Music / Radio
- Spiritual
- News
- Shared Production Package flow across all Studios
- Shared Dispatch
- Presentation Studio/editor full regression
- Export
- OBS/live execution
- Host Mode
- Post-show clipping/transcription
- Organizations/team/RBAC/RLS
- Final Base44 audit/removal

Do not promote individual Studio work to production along the way.

## 10. Base44 Removal Audit — FINAL GATE

Before launch, search Preview for at least:

- `@base44/sdk`
- `base44.entities`
- `base44.functions`
- `base44.integrations`
- Base44 `createClient(` construction
- Base44 app URLs / app IDs / tokens
- compatibility adapters
- fallback branches
- old service-role assumptions

Classify every remaining reference as removed/replaced, one-time migration utility, isolated compatibility scheduled for deletion, or blocker.

Do not call CREAPD fully migrated while critical runtime behavior still depends on Base44.

## 11. Work-Session Protocol

After every meaningful work block, update this file with:

- date
- branch
- latest functional code commit
- what changed
- affected files/routes
- Vercel status
- database migration status
- what the user actually tested
- BUILT / DEPLOYED / TESTED / PASSED / PARTIAL / BLOCKED
- known issues
- exact next action

Never use **PASSED** merely because code compiled or Vercel deployed.

## 12. Current Exact Next Action

**Run the first real end-to-end Talk Studio Preview test against Neon migration 004.**

Start at `/talk/configure` on the `backend/vercel-foundation` Preview, create a fresh Talk production, click **Build Production**, and report/screenshot the first unexpected behavior if anything fails.

Do not touch `main`.

---

### Quick resume prompt for a future session

> Open `docs/CREAPD_PREVIEW_HANDOFF.md` from `backend/vercel-foundation` in `davidhambern-ship-it/creapd`, inspect the current branch head and Vercel status, and resume from **Current Exact Next Action**. Do not modify `main`.
