# CREAPD Preview Migration Handoff

> **READ THIS FIRST IN A NEW CHAT / NEW WORK SESSION.**
>
> Before changing CREAPD, inspect this file, the current `backend/vercel-foundation` branch head, and Vercel status. Update this file after every meaningful migration/test checkpoint.

## Mission

CREAPD is being rebuilt and fully tested **before anything is promoted to the live site**.

Goal: a fully operational, launch-ready CREAPD in Preview with runtime ownership migrated off Base44. Only after the whole product is upgraded, regression-tested, demo-tested, and audited do we promote the completed rebuild to `main`.

Launch-ready means:

- Every Production Studio works end-to-end in Preview.
- Shared flow works: **Studio -> research/content -> Production Package -> Dispatch -> Presentation Studio -> Editor -> review/present/export**.
- State survives refresh, navigation, logout/login, reopen, edit, reject/restore, and regeneration.
- Critical runtime behavior no longer depends on Base44 entities, functions, auth, AI integrations, or hidden fallbacks.
- Failure states are explicit; no endless initializing, blank pages, silent failures, or dead buttons.
- Multiple realistic demos can be run without special handling.
- Final repository-wide Base44 audit is complete.

## Environment Rules

Development/testing branch:

`backend/vercel-foundation`

Preview URL:

`https://project-1nufq-git-backend-vercel-foundation-texasnomadgames.vercel.app/`

Vercel:

- Project: `project-1nufq`
- Team slug: `texasnomadgames`
- Team ID: `team_E9xyI6RoOjilno6YazF4Bksb`

Neon:

- Project: `bold-term-42963962`
- Database: `neondb`
- Active Preview branch: `br-round-cake-awfbwk2h`

Live branch:

`main`

**Treat `main` as frozen. Do not implement migration work there.**

`main` was intentionally restored to:

`ca03bf2af028cc2cf62e915c2e47c41ee6a0f214` — `Add explicit presentation editor exit`

## Architecture Direction

Preview is becoming the new CREAPD, not a patched copy of the old one.

Preferred owned Studio path:

`React Studio UI -> /api/creapd/production/core -> Studio server module -> Neon / owned services`

Important Vercel discovery: Preview already had 12 serverless API functions. Adding separate Talk API endpoints created function #13 and caused deployment failures. Talk was consolidated behind the existing Production Core endpoint. Do not re-add separate Talk Vercel functions unless hosting architecture changes.

`api/creapd/production/core.js` exports `maxDuration: 300`, but expensive Studio work should still be broken into checkpointed stages rather than one giant request.

The user-provided **CREAPD Zero-Cost Technical & Strategic Upgrade Blueprint** is a north-star reference: multi-agent editorial intelligence, edge/local hybridization, provider fallback, OBS WebSocket, browser overlays, Host/Teleprompter mode, session/timestamp logging, post-show transcription + local FFmpeg clipping, and future organization/show/member/RLS design.

## Research Studio

Research is the strongest tested migration reference.

Controlled regression passed:

- points persisted
- approve worked
- package count changed
- navigate away/back preserved state
- reject/restore worked
- package/editor opened
- explicit Exit Editor works

Known non-blocking issue: Escape does not reliably exit Present mode. User explicitly does not care right now.

## Presentation Studio

Preview contains an owned Presentation Studio more advanced than `main`. It reads owned production data through `/production/core`, opens `/editor/:id`, and uses owned delete/update/editor actions. Do not overwrite it with the older `main` implementation without inspection.

## Talk Studio 2.0 — Current Checkpoint

### Status

- Neon migration 004: **APPLIED + VERIFIED**
- Owned Talk read/write foundation: **DEPLOYED**
- Talk test #1: **FAILED / DIAGNOSED** — old 50-second monolithic AI timeout
- Repair #1: **DEPLOYED** — split Research and Production into separate checkpointed requests
- Talk test #2: **FAILED / DIAGNOSED** — Research hit `AI_GATEWAY_OUTPUT_INCOMPLETE (max_output_tokens)`
- Repair #2: **DEPLOYED** — Research batched 3 topics at a time with Neon checkpoints
- Talk test #3: **FAILED / DIAGNOSED** — first batch returned all topic dossiers but omitted standalone research-item rows for Politics and Cryptocurrency
- Repair #3: **DEPLOYED** — dossier coverage is authoritative; missing standalone research items are synthesized from the verified dossier instead of failing the batch
- Talk overall: **PARTIAL** until the real acceptance path passes

### Latest functional code head

`6904f5196c98ae23f7607f61a479bf77b0d2769f` — `Make Talk research batch coverage resilient`

Vercel status: **SUCCESS / DEPLOYED**.

### Neon migration 004

Migration file:

`server/migrations/004_talk_studio.sql`

Verified tables:

- `creapd.talk_production_configurations`
- `creapd.talk_topics`
- `creapd.talk_research_items`
- `creapd.talk_guests`
- `creapd.talk_segments`
- `creapd.talk_assets`
- `creapd.talk_sessions`
- `creapd.talk_events`

Schema supports verification status/notes/confidence, counter-perspectives, debate questions, live segment state, actual timestamps/duration, clip markers, OBS fields, Host View state, and Talk session/event logging.

### Stress-test production

Saved configuration:

- Name: `We Are America`
- Configuration ID: `af9ccc24-ba27-46f2-9b63-4025da1b4dbc`
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

Selected topics in Neon:

1. Local News
2. Politics
3. Cryptocurrency
4. Social Issues
5. Lifestyle
6. Arts & Culture
7. Education
8. Technology

Do **not** reduce this workload to make the test pass.

### Failure chronology and lessons

#### Failure 1 — timeout

Error: `The operation was aborted due to timeout`

Root cause: one monolithic AI call with a hard-coded ~50-second cutoff. Neon did not half-write generated records.

Repair:

- `server/talkResearchEngine.js`
- `server/talkProductionEngine.js`
- `server/talkPackageEngine.js`
- `api/creapd/production/core.js`
- `src/api/creapdClient.js`
- `src/pages/TalkDashboard.jsx`

Talk build/refresh now runs Research checkpoint first, then Production assembly.

#### Failure 2 — max output tokens

Error: `AI Gateway output was incomplete (max_output_tokens)`

Neon recorded `stage: research_failed`, `code: AI_GATEWAY_OUTPUT_INCOMPLETE`, `recoverable: true`.

Root cause: even after splitting Research from Production, Research still tried to return all 8 topics in one strict structured response.

Repair: Research batches selected topics, max 3 per AI request. The stress test becomes **3 + 3 + 2**. Successful batches checkpoint immediately in Neon and can be resumed.

Architecture lesson for all later Studios:

> **Large multi-topic AI jobs must be batched and checkpointed.**

#### Failure 3 — incomplete topic coverage validator

Error shown to user: `Talk research batch returned incomplete topic coverage`

Neon proved the failure was batch 1 before any batch checkpoint was accepted:

- `missing_dossiers: []`
- `missing_research: ["Politics", "Cryptocurrency"]`
- `research_batches_completed: 0`

This means the AI returned verified dossiers for all three requested topics, but only returned standalone research-item rows for Local News. The validator incorrectly treated missing secondary rows as missing topic research.

Repair in `server/talkResearchEngine.js` at `6904f519...`:

- Topic dossier coverage is the hard requirement.
- The batch schema now constrains `topic_name` to the exact input topic names.
- If a verified dossier exists but no separate research-item row exists, CREAPD synthesizes one concise research record from that dossier.
- Synthetic rows inherit the dossier's summary, source/source-link, verification status/notes, and confidence.
- The batch is still rejected if an authoritative topic dossier is truly missing.

No database migration was required for any of these runtime repairs.

### Talk files / owned paths

- `server/talkResearchEngine.js`
- `server/talkProductionEngine.js`
- `server/talkPackageEngine.js`
- `server/talkStudio.js`
- `api/creapd/production/core.js`
- `src/api/creapdClient.js`
- `src/hooks/useTalkProduction.js`
- `src/pages/TalkConfigure.jsx`
- `src/pages/TalkDashboard.jsx`
- `src/pages/TalkTopics.jsx`
- `src/pages/TalkGuests.jsx`
- `src/pages/TalkAssets.jsx`
- `src/pages/TalkRundown.jsx`

Owned Preview behavior already includes configuration save/read, checkpointed build/refresh, topic status, guest CRUD/confirm, asset status, and Dashboard polling through the owned backend.

### Legacy cleanup still required

`server/talkEngine.js` and legacy `talk_build` / `talk_refresh` handlers in `server/talkStudio.js` still exist as compatibility code. The normal Preview path bypasses them, but before Talk is marked fully migrated they must be retired or hard-blocked so they cannot become an accidental fallback.

Future Talk features still include full Host Mode execution UI, OBS bridge execution, and post-show clipping/transcription implementation. Neon persistence is already designed for them.

## Talk Acceptance Test — Current Gate

Hard-refresh Preview and rerun the same saved `We Are America` configuration with all 8 topics / 18 sources / 18 automations / 120-minute runtime.

Expected progression:

`researching` -> batch checkpoints -> `research_ready` -> `assembling_production` -> `complete`

Expected final state:

- config `ready`
- research > 0
- all 8 selected topics represented
- rundown > 0
- assets > 0
- owned Talk Production Package exists
- Talk session exists and is `ready`

Then continue:

1. Inspect Research.
2. Approve/unapprove a Topic; navigate away/back; verify persistence.
3. Add/confirm/edit/delete a Guest; verify persistence.
4. Inspect Rundown/timing.
5. Approve/unapprove an Asset; verify persistence.
6. Refresh/navigate away/return; verify all state persists.
7. Send the Talk Production Package through shared Presentation Studio/editor when exposed.
8. Reopen project/editor without loss.
9. Confirm no tested Talk action silently falls back to Base44.
10. Later intentionally trigger a recoverable error and confirm clear failure state + retained checkpoint.

If the next test fails, inspect Neon `build_metadata.stage`, `failure_details`, `research_completed_topics`, `research_batches_completed`, and generated row counts before changing code.

## Remaining Studios / Major Areas

- Talk — current focus
- Cooking
- Sports
- Cosmo
- Music / Radio
- Spiritual
- News
- Shared Production Package / Dispatch
- Presentation Studio/editor full regression
- Export
- OBS/live execution
- Host Mode
- Post-show clipping/transcription
- Organizations/team/RBAC/RLS
- Final Base44 audit/removal

Do not promote individual Studio work to production along the way.

## Final Base44 Audit Gate

Before launch, search Preview for at least:

- `@base44/sdk`
- `base44.entities`
- `base44.functions`
- `base44.integrations`
- Base44 `createClient(`
- Base44 app URLs / app IDs / tokens
- compatibility adapters
- fallback branches
- old service-role assumptions

Classify every remaining reference as removed/replaced, one-time migration utility, isolated compatibility scheduled for deletion, or blocker.

## Status Vocabulary

- **BUILT** — code exists
- **DEPLOYED** — Vercel successful
- **TESTED** — user exercised actual Preview flow
- **PASSED** — acceptance behavior worked and persisted
- **PARTIAL** — important behavior remains unverified/broken
- **BLOCKED** — cannot progress without resolving issue

Never mark PASSED merely because code compiled or Vercel deployed.

## Current Exact Next Action

**Retest the saved `We Are America` Talk production on Preview against functional commit `6904f519...`.**

Do not touch `main`.

---

### Quick resume prompt

> Open `docs/CREAPD_PREVIEW_HANDOFF.md` from `backend/vercel-foundation` in `davidhambern-ship-it/creapd`, inspect the current branch head and Vercel status, and resume from **Current Exact Next Action**. Do not modify `main`.
