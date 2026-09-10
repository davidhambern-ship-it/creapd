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
- CREAPD also supports **show execution**: Production Package -> CREAPD Live -> session/timing/events -> later OBS/overlays/clipping.
- Data survives refresh, navigation, logout/login, reopen, edit, reject/restore, regeneration, and live-session re-entry.
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

### Latest functional branch head before this documentation commit

`79703004fc2697523d973de56de51666174caafe` — `Put teleprompter beside CREAPD Live program monitor`

Vercel status: **SUCCESS / DEPLOYED**.

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
- live-session start/event persistence through owned path

Legacy `server/talkEngine.js` and `talk_build` / `talk_refresh` compatibility handlers still exist. After the repaired path is fully accepted, retire/hard-block the monolithic legacy path so it cannot become an accidental fallback.

## 7. UX Principle — CREAPD Must Guide the User

Product rule:

> **Never assume a CREAPD user already understands the production workflow. Every major page should explain what the user is doing, what decision they need to make, what “ready” means, and the next step.**

Reusable component:

`src/components/talk/TalkProducerGuide.jsx`

Talk guided sequence:

**Setup -> Research -> Topics -> Guests -> Rundown -> AI Assets -> Finish & Launch -> CREAPD Live**

User manually walked the guided downstream path all the way through and successfully exported the show. The guidance was reported as good overall.

Guest-status semantics remain a later UX cleanup: AI suggestions should progress through a shortlist/invited/confirmed model and should not imply CREAPD actually contacted or booked a real guest.

## 8. Export Decision

The old Talk Export downloaded a `.json` file as if it were the normal user-facing show package.

New product direction:

- JSON remains **Advanced Data Export** for backup/integrations/developers.
- Normal post-production action is **Enter CREAPD Live**.
- A human-readable **Show Book / downloadable ZIP package** (PDF/rundown/scripts/source sheet/assets, with JSON in an advanced folder) is a later export enhancement.

`src/pages/TalkExport.jsx` labels JSON correctly and guides users into CREAPD Live.

## 9. CREAPD Live — Show Execution Cockpit

Product decision: do **not** build a Riverside clone/media transport stack first. CREAPD should initially be the **brain + live control room**, with OBS becoming the broadcast engine later.

Route:

`/talk/live?config_id=<talk configuration id>`

This route is standalone/full-screen rather than inside the normal Talk sidebar layout.

Entry points:

- Talk Dashboard -> `Enter Studio` / `CREAPD Live`
- Finish & Launch -> `Enter CREAPD Live`
- Talk navigation -> `Live — Studio`

### First cockpit — USER TESTED + PASSED

The first CREAPD Live execution cockpit loaded the real owned Talk production/session from Neon and exposed:

- READY / ON AIR / PAUSED / SHOW ENDED state
- overall elapsed clock
- current segment
- segment elapsed / planned time left
- host notes / topic talking points / debate questions
- next segment preview
- run-of-show list with completed/active state
- clip-marker counts
- guest/package readiness
- OBS connection placeholder
- Start Show
- Pause / Resume
- Clip This Moment
- Next Segment
- End Show

User manually tested the cockpit and reported that it **worked seamlessly**. Treat the first owned live-session state machine as PASSED unless a later regression proves otherwise.

### Teleprompter refinement — BUILT + DEPLOYED, NOT YET USER TESTED

User requested the teleprompter be immediately to the **right of the future video/program monitor**, with the segment list moved down.

Implemented in:

`src/pages/TalkLive.jsx`

Commit:

`79703004fc2697523d973de56de51666174caafe`

Vercel: **SUCCESS / DEPLOYED**.

New layout:

- top left: **Program Monitor**
- top right: **Teleprompter**
- below: **Current Segment + Up Next**
- below that: **Run of Show** moved out of the former right sidebar and displayed as a multi-column segment grid
- sticky Show Control remains at the bottom

Teleprompter behavior:

- prefers a topic-specific `host_script` asset when available
- otherwise uses the matched topic's talking points
- otherwise uses current segment notes
- otherwise falls back to the global host script
- automatically scrolls back to the top when the current segment changes
- provides `A−` / `A+` text-size controls
- shows current topic/segment context in its header
- shows up to three current-topic debate/conversation prompts beneath the primary copy

This is still a browser-side teleprompter display only. Auto-scroll speed control, mirrored display, detached host monitor/window, OBS integration, and real Program Monitor video remain later refinements.

## 10. Talk Acceptance Status

### PASSED

- Heavy owned Talk production build
- Neon persistence for generated production
- Research batching/checkpointing under realistic load
- Topics display and approval path
- Guided downstream user walkthrough through Research -> Topics -> Guests -> Rundown -> AI Assets -> Export
- JSON export executes successfully as Advanced Data Export
- first CREAPD Live show-execution cockpit
- live session state/control path as exercised by user

### DEPLOYED / NEEDS USER TEST

- side-by-side Program Monitor + Teleprompter layout
- teleprompter content switching / reset-to-top / font sizing
- Run of Show moved below the top studio row

### STILL PARTIAL / FUTURE

- guest shortlist/invite/confirm semantics
- asset approve/unapprove focused regression
- shared Production Package -> Presentation Studio/editor handoff for Talk
- legacy monolithic Talk build retirement
- user-facing Show Book / ZIP export
- OBS WebSocket execution
- real Program Monitor/browser overlays
- teleprompter auto-scroll / mirror / detached display refinements
- post-show clipping/transcription

Talk Studio overall remains **PARTIAL** until remaining shared-flow and Base44 cleanup gates are complete, even though its core owned build and first live-execution cockpit have passed.

## 11. Current Exact Next Action

**User-test the new CREAPD Live teleprompter layout on Preview.**

Use the existing `We Are America` production; do not rebuild it.

Acceptance path:

1. Hard-refresh the `backend/vercel-foundation` Preview.
2. Enter **CREAPD Live**.
3. Confirm the **Program Monitor is on the left** and the **Teleprompter is immediately to its right** on a desktop-size viewport.
4. Confirm the Run of Show is now below rather than occupying the right column.
5. Start/resume a show session and confirm the teleprompter shows sensible material for the current segment.
6. Use `A−` / `A+` and confirm text sizing works without breaking layout.
7. Advance to the next segment and confirm the teleprompter changes with the segment and resets to the top.
8. Confirm the live controls still work after the layout change.
9. Report any poor script selection, duplicated text, bad overflow, eye-line/layout issue, or state regression.

After this passes, the next major CREAPD Live layer is **OBS integration / real Program Monitor + overlays**, while separate Talk cleanup continues for guest semantics, legacy Base44 fallback retirement, Show Book export, and shared Presentation Studio handoff.

Do not touch `main`.

## 12. Remaining Studios / Major Areas

- Talk — current focus until Live/shared downstream cleanup is done
- Cooking
- Sports
- Cosmo
- Music / Radio
- Spiritual
- News
- shared Production Package flow across all Studios
- shared Dispatch
- Presentation Studio/editor full regression
- user-facing Show Book/export packaging
- OBS/live execution
- post-show clipping/transcription
- organizations/team/RBAC/RLS
- final Base44 audit/removal

Do not promote individual Studio work to production along the way.

## 13. Final Base44 Removal Gate

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

## 14. Status Vocabulary / Protocol

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
