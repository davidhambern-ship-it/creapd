# CREAPD Preview Migration Handoff

> **READ THIS FIRST IN A NEW CHAT / NEW WORK SESSION.**
>
> This is the persistent handoff for the CREAPD rebuild. Before changing code, inspect this file, the current `backend/vercel-foundation` branch head, and Vercel status. Update this file after every meaningful migration/test checkpoint.

## 1. Mission

CREAPD is being rebuilt and fully tested **before anything is promoted to the live site**.

The goal is a **fully operational, launch-ready CREAPD in Preview**, with runtime ownership migrated off Base44. Only after the entire product is upgraded, regression-tested, demo-tested, and audited do we promote the completed rebuild to `main`.

The user specifically wants CREAPD dependable enough that demonstrations do not randomly fail.

Launch-ready means:

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

### Neon

- Project: `bold-term-42963962`
- Database: `neondb`
- Active Preview parent branch: `br-round-cake-awfbwk2h`

### Live branch

`main`

**Treat `main` as frozen. Do not implement migration work there.**

`main` was intentionally restored to:

`ca03bf2af028cc2cf62e915c2e47c41ee6a0f214` — `Add explicit presentation editor exit`

The experimental client-side Base44 Talk work accidentally made on `main` was removed. Do not resurrect it as the migration architecture.

## 3. Current Preview Checkpoint — 2026-09-10

### Latest functional code head

`25a6e441e9f526fa039969cb81e3223d8a1dedab` — `Keep Talk dashboard refresh on owned backend`

Vercel status: **SUCCESS / DEPLOYED**.

This head includes the Talk timeout architecture repair described below.

### Vercel function-count discovery

Preview already had 12 Vercel serverless API functions. The first attempt to add separate Talk API routes created function #13 and caused Vercel deployment failures.

Those failed deployments are **superseded history**, not active runtime problems.

The fix was to consolidate Talk behind the existing owned Production Core endpoint instead of adding many Studio-specific Vercel functions.

Preferred pattern:

`React Studio UI -> /api/creapd/production/core -> Studio server module -> Neon / owned services`

Do not re-add separate `/api/creapd/talk/configuration.js` or `/api/creapd/talk/production.js` functions unless hosting architecture changes.

### Production Core execution ceiling

`api/creapd/production/core.js` now exports `maxDuration: 300` for long owned Studio work. The Talk pipeline itself is checkpointed into separate requests so it does not rely on one monolithic 300-second request.

## 4. Architecture Direction

Preview is becoming the **new CREAPD**, not merely a patched copy of the old one.

Owned runtime direction:

- React/Vite on Vercel
- shared owned API gateway at `/api/creapd/production/core`
- Neon/Postgres as primary persistent data
- `src/api/creapdClient.js` as owned frontend client
- Neon-aware auth via `shouldUseNeonAuth()`
- Base44 only as temporary compatibility/fallback for unmigrated areas

A Studio is not migrated merely because a Base44 backend function was replaced with browser-side Base44 SDK calls.

Target:

**React UI -> CREAPD API -> Neon / owned services**

The user-provided **CREAPD Zero-Cost Technical & Strategic Upgrade Blueprint** is a north-star architecture reference. Preserve its goals while adapting them to CREAPD's owned stack: multi-agent editorial intelligence, edge/local hybridization, provider fallback, OBS WebSocket, browser overlays, Host/Teleprompter mode, session/timestamp logging, post-show transcription + local FFmpeg clipping, and future organization/show/member/RLS design.

## 5. Research Studio — REFERENCE IMPLEMENTATION

Research remains the strongest tested migration reference.

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

### High-level status

- Neon migration 004: **APPLIED + VERIFIED**
- Owned read/write foundation: **DEPLOYED**
- First real user build test: **FAILED AS EXPECTED REGRESSION TEST** due to a 50-second AI timeout
- Timeout root cause: **DIAGNOSED**
- Checkpointed repair: **DEPLOYED**
- Retest after repair: **NOT YET RUN**
- Talk overall: **PARTIAL** until the real acceptance path passes

### Neon migration 004

Migration file:

`server/migrations/004_talk_studio.sql`

Verified active tables:

- `creapd.talk_production_configurations`
- `creapd.talk_topics`
- `creapd.talk_research_items`
- `creapd.talk_guests`
- `creapd.talk_segments`
- `creapd.talk_assets`
- `creapd.talk_sessions`
- `creapd.talk_events`

`creapd.schema_migrations` records version `004`: `Owned Talk Studio persistence, agent intelligence fields, and live session event foundation`.

Schema includes verification status/notes/confidence, counter-perspectives, debate questions, runtime segment state, actual segment timestamps/duration, clip marker count, OBS scene/overlay fields, Host View state, and session/event logging.

### First real Talk test and exact failure

User configured a fresh stress-test production:

- Name: `We Are America`
- Host: `TexasNomad`
- Format: `Panel Discussion`
- Date: `2026-09-10`
- Total runtime: `120 min`
- Talk runtime: `110 min`
- Sponsor runtime: `4 min`
- Tone: `Conversational`
- Topics: `8 selected`
- Sources: `18 enabled`
- Automation: `18 selected`

The Configure screen returned:

`The operation was aborted due to timeout`

Neon inspection proved the new run created the configuration but **did not partially write generated content**:

- 0 new Talk topics
- 0 research items
- 0 guests
- 0 segments
- 0 assets
- 0 Talk Production Package
- 0 Talk session

The bottom CREAPD bar counts visible in the screenshot were older/global state, not this failed new run.

Timing matched the old `server/talkEngine.js` hard-coded `timeoutMs: 50000` almost exactly. Root cause was the monolithic owned AI request, not Neon.

### Timeout architecture repair

Instead of simply increasing the old 50-second timeout, Talk was split into checkpointed stages consistent with the blueprint.

New server files:

- `server/talkResearchEngine.js`
  - live web research
  - intake/de-duplication
  - fact-check / verification
  - counter-perspective / debate analysis
  - one dossier per selected topic
  - about 2 concise research items per topic
  - real suggested guests only
  - writes Neon checkpoint only after structured AI output succeeds
  - stage metadata: `researching` -> `research_ready`
  - timeout ceiling: 210s

- `server/talkProductionEngine.js`
  - consumes saved verified Research checkpoint
  - does **not** redo web research
  - builds rundown, host/co-host material, engagement assets, promo/presentation assets
  - creates owned Talk Production Package
  - creates/resets Talk session
  - marks config `ready`
  - preserves Research checkpoint on production-stage failure
  - timeout ceiling: 180s

- `server/talkPackageEngine.js`
  - upserts `creapd.production_packages` for production profile `talk`
  - stores verified Talk summaries/talking points/scripts/production metadata
  - package status becomes approved for downstream shared production flow

Updated:

- `api/creapd/production/core.js`
  - `maxDuration: 300`
  - actions `talk_build_research` and `talk_build_production`
  - both use the existing shared endpoint; no extra Vercel functions

- `src/api/creapdClient.js`
  - normal owned Talk `build` / `refresh` is orchestrated as two sequential API requests:
    1. research checkpoint
    2. production assembly
  - no browser-side request timeout

- `src/pages/TalkDashboard.jsx`
  - owned Preview polling reads Neon/Production Core
  - owned Refresh uses the checkpointed CREAPD API path
  - no Base44 poll/refresh on Preview
  - build errors are surfaced visibly

The universal `creapd.production_packages` schema was checked and already has every column required by the new Talk package engine. No additional database migration was required for this repair.

### Important legacy code note

`server/talkEngine.js` and legacy `talk_build` / `talk_refresh` handlers in `server/talkStudio.js` still exist as compatibility code. The normal owned Preview Configure/Refresh paths now bypass them through the checkpointed client orchestration.

Before Talk is considered fully migrated, retire or hard-block the monolithic legacy build path so it cannot become an accidental fallback. This is a cleanup gate after the repaired path is proven.

### Talk UI already on owned path

Owned Preview behavior includes:

- configuration save through Production Core
- production reads through Production Core
- checkpointed build/refresh through Production Core
- topic approval/unapproval through owned path
- guest create/update/delete/confirm through owned path
- asset approval/unapproval through owned path

Future Talk features still include full Host Mode execution UI, OBS bridge execution, and post-show clipping/transcription implementation. The Neon foundation already supports them.

## 8. Talk Acceptance Test — CURRENT GATE

Talk is **not PASSED** just because Vercel is green.

### Immediate retest

Repeat the same realistic stress test rather than reducing scope. The saved `We Are America` configuration is in Neon, so it may be reopened from Talk Dashboard -> Edit Config instead of retyping everything.

Expected build-state progression in `build_metadata.stage`:

`researching` -> `research_ready` -> `assembling_production` -> `complete`

Expected final state:

- config `ready`
- research > 0
- all selected topics represented
- rundown > 0
- assets > 0
- owned Talk Production Package exists
- Talk session exists and is `ready`

Then continue acceptance testing:

1. Inspect Research.
2. Approve/unapprove a Topic and verify persistence.
3. Add/confirm/edit/delete a Guest and verify persistence across navigation.
4. Inspect Rundown/timing.
5. Approve/unapprove an Asset and verify persistence.
6. Navigate away, refresh, return, and verify everything persists.
7. Send the Production Package through shared Presentation Studio/editor when the Talk UI exposes the handoff.
8. Reopen project/editor state without loss.
9. Confirm no tested Talk action silently falls back to Base44.
10. Later intentionally test a recoverable failure and confirm a clear error + retained checkpoint.

If the Research stage still times out at 210s, do **not** simply raise it again. Split live research by topic batches through the same Production Core gateway and checkpoint batch progress.

## 9. Remaining Studios / Major Areas

Not yet fully migrated/tested for launch-ready Preview:

- Talk — current focus
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

## 11. Status Vocabulary / Work-Session Protocol

Use:

- **BUILT** — code exists
- **DEPLOYED** — Vercel status successful
- **TESTED** — user exercised actual Preview flow
- **PASSED** — acceptance behavior worked and persisted
- **PARTIAL** — important behavior remains unverified/broken
- **BLOCKED** — cannot progress without resolving issue

Never use **PASSED** merely because code compiled or Vercel deployed.

After every meaningful work block record: date, branch, latest functional commit, what changed, files/routes, Vercel status, DB migration status, actual user test, result, known issues, and exact next action.

## 12. Current Exact Next Action

**Retest Talk Studio on the green Preview head after the checkpointed timeout repair.**

Use the same 8-topic / 120-minute `We Are America` configuration if possible. Do not reduce the workload merely to make the test pass.

If it fails, inspect Neon `build_metadata.stage` and counts before changing code. The checkpointed architecture should tell us exactly which stage failed and whether completed Research was preserved.

Do not touch `main`.

---

### Quick resume prompt for a future session

> Open `docs/CREAPD_PREVIEW_HANDOFF.md` from `backend/vercel-foundation` in `davidhambern-ship-it/creapd`, inspect the current branch head and Vercel status, and resume from **Current Exact Next Action**. Do not modify `main`.
