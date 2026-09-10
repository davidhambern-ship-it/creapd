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

`a64963eee7bd961a00a1834d841a0f5740d463b6` — `Batch and checkpoint Talk research by topic`

Vercel status for this functional commit: **SUCCESS / DEPLOYED**.

This head includes both the Talk timeout architecture repair and the follow-up batched research repair described below.

### Vercel function-count discovery

Preview already had 12 Vercel serverless API functions. The first attempt to add separate Talk API routes created function #13 and caused Vercel deployment failures.

Those failed deployments are **superseded history**, not active runtime problems.

The fix was to consolidate Talk behind the existing owned Production Core endpoint instead of adding many Studio-specific Vercel functions.

Preferred pattern:

`React Studio UI -> /api/creapd/production/core -> Studio server module -> Neon / owned services`

Do not re-add separate `/api/creapd/talk/configuration.js` or `/api/creapd/talk/production.js` functions unless hosting architecture changes.

### Production Core execution ceiling

`api/creapd/production/core.js` exports `maxDuration: 300` for long owned Studio work. Talk does not rely on one monolithic 300-second request; expensive work is checkpointed into separate requests/stages.

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
- First real user build test: **FAILED / DIAGNOSED** at old 50-second monolithic AI timeout
- First architecture repair: **DEPLOYED** — split Research and Production into separate checkpointed requests
- Second real user retest: **FAILED / DIAGNOSED** in Research with `AI_GATEWAY_OUTPUT_INCOMPLETE (max_output_tokens)`
- Second architecture repair: **DEPLOYED** — Research now batches selected topics and checkpoints every successful batch
- Retest after batched research repair: **NOT YET RUN**
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

### Stress-test configuration being used

User created and is intentionally reusing a realistic heavy Talk production rather than reducing workload:

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

The saved configuration id is:

`af9ccc24-ba27-46f2-9b63-4025da1b4dbc`

### First failure — timeout

Initial Configure build returned:

`The operation was aborted due to timeout`

Neon inspection proved the run created the configuration but **did not partially write generated content**. Timing matched the old `server/talkEngine.js` `timeoutMs: 50000` almost exactly. Root cause was the monolithic owned AI request, not Neon.

Repair:

- `server/talkResearchEngine.js` — live research / verification checkpoint
- `server/talkProductionEngine.js` — consumes verified checkpoint and builds rundown/scripts/assets/package
- `server/talkPackageEngine.js` — owned Talk Production Package upsert
- `api/creapd/production/core.js` — `talk_build_research`, `talk_build_production`, maxDuration 300
- `src/api/creapdClient.js` — normal owned `build` / `refresh` orchestrated as two sequential API requests
- `src/pages/TalkDashboard.jsx` — owned polling/refresh; no Base44 poll on Preview

### Second failure — structured AI output ceiling

After the timeout repair was deployed, user reran the exact same 8-topic / 120-minute show.

Configure returned:

`AI Gateway output was incomplete (max_output_tokens)`

Neon `build_metadata` proved the exact stage:

- `stage: research_failed`
- `code: AI_GATEWAY_OUTPUT_INCOMPLETE`
- `recoverable: true`

This was not a Vercel timeout and not a Neon error. The Research stage was still asking one strict structured response to contain all 8 topics' research items, verification, source links, counter-perspectives, debate questions, and guest suggestions. The model exhausted its allowed output/reasoning budget before finishing valid JSON.

### Batched Research repair — current deployed behavior

`server/talkResearchEngine.js` now:

- researches at most **3 selected topics per AI batch**
- the 8-topic stress test becomes **3 + 3 + 2**
- uses live web search for each batch
- requires exact topic coverage before accepting a batch
- keeps individual summaries/talking points/counter-perspectives compact
- gives each smaller batch adequate structured-output headroom
- writes successful batch records to Neon immediately
- records a research signature so a retry can tell whether the configuration changed
- records completed topics and response ids in `build_metadata`
- resumes completed batches when the same configuration is retried
- deletes/restarts the Research checkpoint if the research-relevant configuration signature changed
- preserves successful earlier batches if a later batch fails
- remains behind the same `/api/creapd/production/core` Vercel function, so function count does not increase

Important architecture lesson for later Studios:

> **Large multi-topic research jobs must be batched and checkpointed. Do not force an entire production's research intelligence into one strict AI response.**

The universal `creapd.production_packages` schema already has every column required by Talk. No database migration was required for either Talk runtime repair.

### Important legacy code note

`server/talkEngine.js` and legacy `talk_build` / `talk_refresh` handlers in `server/talkStudio.js` still exist as compatibility code. The normal owned Preview Configure/Refresh path bypasses them through `src/api/creapdClient.js` checkpoint orchestration.

Before Talk is considered fully migrated, retire or hard-block the monolithic legacy build path so it cannot become an accidental fallback. This is a cleanup gate after the repaired path is proven.

### Talk UI already on owned path

Owned Preview behavior includes:

- configuration save through Production Core
- production reads through Production Core
- checkpointed build/refresh through Production Core
- topic approval/unapproval through owned path
- guest create/update/delete/confirm through owned path
- asset approval/unapproval through owned path
- Dashboard polling/refresh through owned path

Future Talk features still include full Host Mode execution UI, OBS bridge execution, and post-show clipping/transcription implementation. The Neon foundation already supports them.

## 8. Talk Acceptance Test — CURRENT GATE

Talk is **not PASSED** just because Vercel is green.

### Immediate retest

Hard-refresh the `backend/vercel-foundation` Preview and rerun the saved `We Are America` configuration without reducing the 8 topics / 120-minute workload.

Expected Research progression now includes batch checkpoints in `build_metadata`, followed by:

`researching` -> `research_ready` -> `assembling_production` -> `complete`

Expected final state:

- config `ready`
- research > 0
- all 8 selected topics represented
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

If the next failure occurs, inspect Neon `build_metadata.stage`, `failure_details`, completed-topic checkpoints, and generated row counts before changing code. Do not reduce the workload merely to make the test pass.

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

**Retest Talk Studio on the green Preview head after the batched Research repair.**

Use the same saved 8-topic / 120-minute `We Are America` configuration. Do not reduce the workload.

If it fails, inspect Neon `build_metadata.stage`, batch checkpoint metadata, and generated counts before changing code. The pipeline should now tell us exactly which research batch or later Production stage failed and what work was preserved.

Do not touch `main`.

---

### Quick resume prompt for a future session

> Open `docs/CREAPD_PREVIEW_HANDOFF.md` from `backend/vercel-foundation` in `davidhambern-ship-it/creapd`, inspect the current branch head and Vercel status, and resume from **Current Exact Next Action**. Do not modify `main`.
