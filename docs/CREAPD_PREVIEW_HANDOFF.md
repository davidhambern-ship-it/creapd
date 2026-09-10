# CREAPD Preview Migration Handoff

> **READ THIS FIRST IN A NEW CHAT / NEW WORK SESSION.**
>
> Before changing code, inspect this file, the current `backend/vercel-foundation` branch head, and Vercel status. Update this file after every meaningful migration/test checkpoint.

## 1. Mission

CREAPD is being rebuilt and fully tested **before anything is promoted to the live site**.

Goal: a **fully operational, launch-ready CREAPD in Preview**, with runtime ownership migrated off Base44. Only after the entire product is upgraded, regression-tested, demo-tested, and audited do we promote the completed rebuild to `main`.

Launch-ready means:

- Every Production Studio works end-to-end in Preview.
- Shared flow works: **Studio -> research/content -> Production Package -> Dispatch -> Presentation Studio -> Editor -> review/present/export**.
- Data survives refresh, navigation, logout/login, reopen, edit, reject/restore, and regeneration.
- Critical runtime behavior no longer depends on Base44 entities, backend functions, auth, AI integrations, or hidden fallbacks.
- Failure states are explicit; no endless Initializing states, blank pages, silent failures, or dead buttons.
- CREAPD guides users through each workflow instead of assuming they already know what to do.
- Multiple realistic demos can be run without special handling.
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
- Active Preview branch: `br-round-cake-awfbwk2h`

### Live branch

`main`

**Treat `main` as frozen. Do not implement migration work there.**

`main` was intentionally restored to:

`ca03bf2af028cc2cf62e915c2e47c41ee6a0f214` — `Add explicit presentation editor exit`

Do not resurrect the accidental client-side Base44 Talk experiment from `main` as migration architecture.

## 3. Architecture Direction

Preview is becoming the **new CREAPD**, not a patched copy of the old site.

Preferred owned runtime:

`React UI -> /api/creapd/production/core -> Studio server module -> Neon / owned services`

Current principles:

- React/Vite frontend on Vercel.
- Shared owned Production Core gateway.
- Neon/Postgres as primary persistent data.
- `src/api/creapdClient.js` as owned frontend client.
- Neon-aware auth via `shouldUseNeonAuth()`.
- Base44 only as temporary compatibility for unmigrated areas.
- A Studio is **not migrated** merely because a Base44 backend function was replaced by browser-side Base44 SDK calls.
- The user-provided **CREAPD Zero-Cost Upgrade & Architecture Blueprint** is a north star: multi-agent editorial intelligence, edge/local hybridization, provider fallbacks, OBS WebSocket, browser overlays, Host/Teleprompter mode, live session/timestamp logging, post-show transcription + local FFmpeg clipping, and future organization/show/member/RLS design.

### Vercel function-count lesson

Preview already had 12 Vercel serverless API functions. Early Talk work added function #13 and deployments failed. Talk was consolidated behind the existing Production Core endpoint. Old red deployments are superseded history, not an active runtime issue.

`api/creapd/production/core.js` currently exports `maxDuration: 300`, but expensive AI work should still be split/checkpointed rather than relying on one long request.

## 4. Research Studio — Reference Implementation

Research remains the strongest previously tested migration reference.

Controlled regression passed:

- points persisted
- approve worked
- package count changed
- navigate away/back preserved state
- reject/restore worked
- package/editor opened
- explicit Exit Editor works

Known non-blocking issue: Escape does not reliably exit Present mode. User explicitly does not care about this right now.

Research is a reference implementation, not something to ship independently.

## 5. Presentation Studio

Preview contains an owned Presentation Studio more advanced than `main`.

It reads owned production data through `/production/core`, opens `/editor/:id`, and uses owned update/delete/editor actions. Do not overwrite it with older `main` presentation code without inspection.

## 6. Talk Studio 2.0 — Current Checkpoint (2026-09-10)

### Latest branch head

`b38be037f99e038dd86b8907d2def48226b73eee` — `Make Talk Dashboard a guided producer control room`

At the time this handoff update was written, Vercel status for this newest guided-UX head was **PENDING**. Verify it before asking the user to test the guide. The previous functional Talk build repairs are already deployed and proven by the user.

### Neon migration 004

Applied and verified in active Preview DB.

Tables:

- `creapd.talk_production_configurations`
- `creapd.talk_topics`
- `creapd.talk_research_items`
- `creapd.talk_guests`
- `creapd.talk_segments`
- `creapd.talk_assets`
- `creapd.talk_sessions`
- `creapd.talk_events`

Schema includes verification/confidence, counter-perspectives, debate questions, actual segment timing, clip markers, OBS scene/overlay fields, Host View state, and Talk session/event logging.

### Stress-test production

Saved config id:

`af9ccc24-ba27-46f2-9b63-4025da1b4dbc`

Production:

- Name: `We Are America`
- Host: `TexasNomad`
- Format: `Panel Discussion`
- Date: `2026-09-10`
- Total runtime: `120 min`
- Talk runtime: `110 min`
- Sponsor runtime: `4 min`
- Tone: `Conversational`
- Topics: 8
- Research sources: 18
- Automation selections: 18

### Talk failure history and fixes

#### Failure 1 — 50-second timeout

Initial owned Talk engine used one monolithic AI request and failed at almost exactly its hard-coded 50-second limit.

Fix:

- split into Research stage and Production stage
- checkpoint Research in Neon before Production assembly
- owned package creation
- Production Core `maxDuration: 300`
- no Base44 Dashboard polling/refresh on Preview

#### Failure 2 — AI `max_output_tokens`

The first split still asked one strict Research response to contain all 8 topics. AI Gateway exhausted output budget before valid structured JSON completed.

Fix:

- batch selected topics, maximum 3 per Research batch
- 8-topic stress test becomes 3 + 3 + 2
- checkpoint each successful batch immediately
- record research signature/completed topics/response ids
- resume completed work when unchanged configuration is retried

#### Failure 3 — overly strict secondary-item coverage

Batch 1 returned verified dossiers for Local News, Politics, and Cryptocurrency, but separate research-item rows only for Local News. Validator incorrectly failed the entire batch because Politics/Cryptocurrency lacked secondary rows.

Fix:

- verified topic dossier is authoritative coverage
- if a valid dossier has no separate research item, CREAPD derives a compact research record from that dossier
- batch schema constrains `topic_name` to actual requested topic names

### Successful Talk build — VERIFIED

User reran the exact same heavy production and reported **it worked**.

Neon verification after the successful run:

- config status: `ready`
- `build_metadata.stage`: `complete`
- 8 / 8 selected topics present
- 16 research items
- 4 AI guest suggestions
- 13 rundown segments
- 19 AI assets
- 1 owned Talk Production Package
- 1 Talk session
- all 3 Research batches completed
- production model: `openai/gpt-5.4-mini`

At the time of DB inspection, all 8 topics were approved.

This proves the core owned Talk build pipeline can handle the 8-topic / 120-minute stress test.

### Talk owned frontend/backend paths

Owned Preview behavior includes:

- configuration save through Production Core
- production reads through Production Core
- checkpointed build/refresh through Production Core
- topic approve/unapprove through owned path
- guest create/update/delete/confirm through owned path
- asset approve/unapprove through owned path
- Dashboard polling/refresh through owned path
- owned Talk Production Package creation

Legacy `server/talkEngine.js` and `talk_build` / `talk_refresh` compatibility handlers still exist. After the repaired path is fully accepted, retire/hard-block the monolithic legacy path so it cannot become an accidental fallback.

## 7. New UX Principle — CREAPD Must Guide the User

User identified an important launch requirement after the successful Talk build: approving Discussion Topics left no obvious instruction about what to do next.

New product rule:

> **Never assume a CREAPD user already understands the production workflow. Every major page should explain what the user is doing, what decision they need to make, what “ready” means, and the next step.**

A reusable component was added:

`src/components/talk/TalkProducerGuide.jsx`

Talk guided sequence:

**Setup -> Research -> Topics -> Guests -> Rundown -> AI Assets -> Export**

Guide wiring added to:

- `src/pages/TalkDashboard.jsx`
- `src/pages/TalkResearch.jsx`
- `src/pages/TalkTopics.jsx`
- `src/pages/TalkGuests.jsx`
- `src/pages/TalkRundown.jsx`
- `src/pages/TalkAssets.jsx`
- `src/pages/TalkExport.jsx`

Behavior:

- shows current step / workflow progress
- explains the task in plain language
- explains what approval/confirmation means
- distinguishes AI guest suggestions from actual booked/confirmed guests
- compares rundown runtime with target
- explains asset approval is “ready for use,” not mandatory for every optional asset
- gives a clear Next Step button
- Dashboard now starts a guided review instead of presenting only status widgets
- Dashboard distinguishes **Generation Checklist** from human review decisions

This Talk Producer Guide should become a reusable design pattern for later Studios after it passes user testing.

## 8. Talk Acceptance Status

### PASSED

- Heavy owned Talk production build itself
- Neon persistence for generated production
- Research batching/checkpointing under realistic load
- Topics display and topic approval path (user exercised Topics; DB showed approved topics)

### STILL TO TEST / PARTIAL

- Guided Producer Guide UI on newest Preview deployment
- Guest add/confirm/edit/delete persistence across navigation
- Rundown review UX and timing sanity
- AI Asset approve/unapprove persistence
- Export behavior
- shared Production Package -> Presentation Studio/editor handoff for Talk
- refresh/reopen persistence across the whole Talk path
- explicit confirmation that no tested Talk action silently falls back to Base44
- legacy monolithic Talk build retirement
- Host Mode / OBS execution / post-show clipping/transcription (future Blueprint work)

Talk Studio overall remains **PARTIAL**, even though the core build pipeline has now PASSED.

## 9. Current Exact Next Action

1. Verify Vercel is green for `b38be037f99e038dd86b8907d2def48226b73eee`.
2. Hard-refresh Preview.
3. Open Talk Dashboard or Discussion Topics and inspect the new **Producer Guide**.
4. Follow the guide through:
   - Research
   - Topics
   - Guests
   - Rundown
   - AI Assets
   - Export
5. Test real actions along the way:
   - topic unapprove/reapprove
   - guest add + confirm/unconfirm + delete/edit if available
   - asset approve/unapprove
   - navigate away/back and refresh
6. Report the first unclear instruction, dead end, persistence problem, or runtime issue.

Do not touch `main`.

## 10. Remaining Studios / Major Areas

- Talk — current focus until guided downstream acceptance passes
- Cooking
- Sports
- Cosmo
- Music / Radio
- Spiritual
- News
- shared Production Package flow across all Studios
- shared Dispatch
- Presentation Studio/editor full regression
- Export
- OBS/live execution
- Host Mode
- post-show clipping/transcription
- organizations/team/RBAC/RLS
- final Base44 audit/removal

Do not promote individual Studio work to production along the way.

## 11. Final Base44 Removal Gate

Before launch search Preview for at least:

- `@base44/sdk`
- `base44.entities`
- `base44.functions`
- `base44.integrations`
- Base44 `createClient(`
- Base44 app URLs / IDs / tokens
- compatibility adapters/fallback branches
- service-role assumptions

Classify every remaining reference as removed/replaced, one-time migration utility, isolated compatibility scheduled for deletion, or blocker.

Do not call CREAPD fully migrated while critical runtime behavior still depends on Base44.

## 12. Status Vocabulary / Protocol

- **BUILT** — code exists
- **DEPLOYED** — Vercel successful
- **TESTED** — user exercised actual Preview flow
- **PASSED** — acceptance behavior worked and persisted
- **PARTIAL** — important behavior remains unverified/broken
- **BLOCKED** — cannot progress without resolving issue

Never use **PASSED** merely because code compiled or Vercel deployed.

After each meaningful work block record: date, branch, latest functional commit, what changed, files/routes, Vercel status, DB status, actual user test, result, known issues, and exact next action.

---

### Quick resume prompt for a future session

> Open `docs/CREAPD_PREVIEW_HANDOFF.md` from `backend/vercel-foundation` in `davidhambern-ship-it/creapd`, inspect the current branch head and Vercel status, and resume from **Current Exact Next Action**. Do not modify `main`.
