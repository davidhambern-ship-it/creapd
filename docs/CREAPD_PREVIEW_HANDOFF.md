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
- Show execution works: **Production Package -> CREAPD Live -> session/timing/events -> OBS/overlays -> post-show clipping**.
- Data survives refresh, navigation, logout/login, reopen, edit, reject/restore, regeneration, live-session re-entry, and repeat show runs.
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

Principles:

- React/Vite frontend on Vercel.
- Shared owned Production Core gateway.
- Neon/Postgres as primary persistent data.
- `src/api/creapdClient.js` as owned frontend client.
- Neon-aware auth via `shouldUseNeonAuth()`.
- Base44 only as temporary compatibility for unmigrated areas.
- A Studio is **not migrated** merely because a Base44 backend function was replaced by browser-side Base44 SDK calls.
- The user-provided **CREAPD Zero-Cost Upgrade & Architecture Blueprint** is the north star: multi-agent editorial intelligence, provider fallbacks, OBS WebSocket, browser overlays, Host/Teleprompter mode, live session/timestamp logging, local FFmpeg clipping, and future organization/show/member/RLS design.

### Vercel function-count lesson

Preview already had 12 Vercel serverless API functions. Early Talk work added function #13 and deployments failed. Talk and OBS control are consolidated behind the existing Production Core endpoint. Do not add a separate OBS serverless function.

`api/creapd/production/core.js` currently exports `maxDuration: 300`, but expensive AI work should still be split/checkpointed rather than relying on one long request.

## 4. Research Studio — Reference Implementation

Controlled Preview regression passed:

- points persisted
- approve worked
- package count changed
- navigate away/back preserved state
- reject/restore worked
- package/editor opened
- explicit Exit Editor works

Known non-blocking issue: Escape does not reliably exit Present mode. User explicitly does not care about this right now.

Research remains the strongest reference implementation, not something to ship independently.

## 5. Presentation Studio

Preview contains an owned Presentation Studio more advanced than `main`.

It reads owned production data through `/production/core`, opens `/editor/:id`, and uses owned update/delete/editor actions. Do not overwrite it with older `main` presentation code without inspection.

## 6. Talk Studio 2.0 — Core Build Status

### Stress-test production

Config id: `af9ccc24-ba27-46f2-9b63-4025da1b4dbc`

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

### Neon migration 004 — APPLIED

Owned Talk tables:

- `creapd.talk_production_configurations`
- `creapd.talk_topics`
- `creapd.talk_research_items`
- `creapd.talk_guests`
- `creapd.talk_segments`
- `creapd.talk_assets`
- `creapd.talk_sessions`
- `creapd.talk_events`

Schema includes verification/confidence, counter-perspectives, debate questions, actual segment timing, clip markers, OBS scene/overlay fields, Host View state, and Talk session/event logging.

### Failure history / architectural fixes

1. **50-second AI timeout** — monolithic Talk build was split into checkpointed Research and Production stages.
2. **AI max_output_tokens** — Research Stage was split into topic batches, max 3 topics per batch; the 8-topic test becomes 3 + 3 + 2.
3. **Overly strict research-item coverage** — verified topic dossier became authoritative coverage; secondary research-item rows can be derived from the verified dossier when omitted.

### Successful Talk build — USER TESTED + NEON VERIFIED

The heavy production above completed successfully.

Neon verification:

- config status: `ready`
- `build_metadata.stage`: `complete`
- 8 / 8 selected topics
- 16 research items
- 4 AI guest suggestions
- 13 rundown segments
- 19 AI assets
- 1 owned Talk Production Package
- 1 Talk session from the generated production
- all 3 Research batches completed
- production model: `openai/gpt-5.4-mini`

Core owned Talk generation is **PASSED**.

### Owned Talk paths

Preview-owned behavior includes configuration save/read, checkpointed build/refresh, topic approve/unapprove, guest create/update/delete/confirm, asset approve/unapprove, Dashboard polling, owned Production Package creation, and live-session start/event persistence.

Legacy `server/talkEngine.js` and monolithic `talk_build` / `talk_refresh` compatibility handlers still exist. Retire/hard-block them after the modern path is fully accepted so they cannot become an accidental fallback.

## 7. UX Rule — CREAPD Must Guide the User

Product rule:

> **Never assume a CREAPD user already understands the production workflow. Every major page should explain what the user is doing, what decision they need to make, what “ready” means, and the next step.**

Talk guided sequence:

**Setup -> Research -> Topics -> Guests -> Rundown -> AI Assets -> Finish & Launch -> CREAPD Live**

The user manually walked the guided downstream path all the way through and successfully exported the show. Guidance was reported as good overall.

Guest-status semantics remain a later cleanup: AI suggestions should eventually progress through **Suggested/Shortlist -> Invited -> Confirmed/Declined** and should never imply CREAPD itself booked a real person.

## 8. Export Decision

JSON is no longer treated as the normal human-facing export.

Current direction:

- JSON = **Advanced Data Export** for backup/integrations/developers.
- Primary action = **Enter CREAPD Live**.
- Future human export = **Show Book / ZIP package** containing PDF/rundown/scripts/source sheet/assets, with JSON tucked into an advanced/data folder.

## 9. CREAPD Live — Current Status

Product decision: do **not** build a Riverside clone/media transport stack first. CREAPD is the **brain + live control room**; OBS is the broadcast engine.

Route:

`/talk/live?config_id=<talk configuration id>`

This route is standalone/full-screen.

### First execution cockpit — USER TESTED + PASSED

User manually tested:

- READY / ON AIR / PAUSED / SHOW ENDED state
- elapsed clock
- current segment
- planned/elapsed segment timing
- host notes
- next segment
- Run of Show
- Start Show
- Pause / Resume
- Clip This Moment
- Next Segment
- leaving/re-entering the studio
- End Show

User reported it **worked seamlessly**.

### Teleprompter layout — USER VISUALLY ACCEPTED

Commit: `79703004fc2697523d973de56de51666174caafe` — `Put teleprompter beside CREAPD Live program monitor`

Vercel: **SUCCESS / DEPLOYED**.

Desktop layout:

- top left: **Program Monitor**
- top right: **Teleprompter**
- below: **Current Segment + Up Next**
- below that: **Run of Show**
- sticky Show Control at bottom

Teleprompter behavior:

- topic-specific host script when available
- otherwise matched topic talking points
- otherwise segment notes
- otherwise global host script
- resets scroll to top when the active segment changes
- `A−` / `A+` text sizing
- conversation/debate prompts below main copy when available

User reviewed the new side-by-side layout and said **“it looks good.”**

### Repeat-run behavior — USER TESTED + PASSED

Product rule:

> **End Show ends one run/session; it must not permanently lock the prepared production.**

Backend repair: `805c4f06514d3556151b93fdf988f29f949a83bd` — `Allow completed Talk shows to start a new run`

Frontend restart control is `src/components/talk/TalkLiveRestartControl.jsx`, mounted only for `/talk/live` and labeled **Start New Run** when the latest session is complete.

Latest functional restart commit before OBS work:

`acfb320d8d56984f5460876cedf9d4ed1344fddb` — `Scope CREAPD Live restart data load to live route`

Vercel: **SUCCESS / DEPLOYED**.

User manually tested the completed-show restart flow and reported that it worked exactly as intended. Repeat-run behavior is **PASSED**.

Important data-model note: previous session/event history is retained. Current Talk segment rows are shared production rows, so per-run runtime fields are reset for the new run; historical run reconstruction should use the session/event log until a future per-session segment-run table is added.

### OBS local bridge + scene control — USER TESTED + PASSED

Owned OBS bridge work is active in Preview.

Core implementation:

- `server/obsBridge.js`
- `src/components/talk/TalkObsBridgeControl.jsx`
- `public/creapd-obs-bridge.ps1`
- routed through existing `/api/creapd/production/core`; no new Vercel function added

Neon migration `005` was prepared/tested on a temporary branch, explicitly approved by the user, and **APPLIED** to the active Preview branch. Owned tables:

- `creapd.obs_bridges`
- `creapd.obs_commands`

Migration record:

- version `005`
- description: `Owned local OBS bridge pairing, heartbeat, scene state, and command queue`

Architecture:

- OBS stays local on the creator's computer.
- Local bridge connects to OBS WebSocket v5 at `ws://127.0.0.1:4455` by default.
- Bridge makes outbound HTTPS requests to CREAPD.
- CREAPD stores bridge heartbeat/state and command queue in Neon.
- Preview uses Vercel Automation Protection Bypass because the Preview deployment is protected; this is a testing-only concern, not intended as a normal end-user step.
- Final-user direction is a one-click installed bridge/desktop helper or OBS plugin. **Do not ship the PowerShell/manual-token workflow to normal users.**

Relevant commits:

- `b01bf2c428d226b5b01902cd27896b7d162c08f8` — first owned OBS bridge stack
- `f097c600743a1b3e11c3b5127c818cdae8e264e3` — improved OBS handshake diagnostics
- `5709f06cf2b4a711d5f5061a0f5503cf6b1149e1` — Preview protection bypass support; Vercel **SUCCESS / DEPLOYED**
- `70b54a4da21f851732c413bf0e525ace6f528d18` — sync Program Monitor OBS badge/copy with live bridge state
- `2445285b8612d1339e4ca63a42289877a9750ebe` — previous handoff checkpoint; Vercel **SUCCESS / DEPLOYED**

User test on 2026-09-10:

- PowerShell bridge launched successfully.
- OBS WebSocket authentication succeeded.
- Bridge reported `OBS connected. Scene: Scene`.
- CREAPD Live OBS Control changed green and displayed **“OBS is under CREAPD control.”**
- UI showed current scene `Scene`, OBS Studio `32.1.2`, WebSocket `5.7.3`.
- Neon independently verified bridge status `connected`, `obs_connected = true`, endpoint `ws://127.0.0.1:4455`, current heartbeat, and `last_error = null`.
- Berna created/used a second scene and clicked **Take** in CREAPD Live.
- Actual OBS Program scene changed from `Scene` to `Scene 2`.
- CREAPD/bridge round-trip returned `current_scene = Scene 2`.
- Berna then changed back to `Scene`; that command also completed successfully.
- Neon independently verified both `set_scene` commands as `completed`, with no errors and the expected returned current-scene values.

Treat the following as **TESTED + PASSED**:

- local OBS pairing/authentication
- heartbeat/state round-trip
- OBS scene discovery
- CREAPD Live -> command queue -> local bridge -> OBS scene change
- OBS -> bridge -> CREAPD/Neon current-scene round-trip

The first real OBS control slice is complete.

Still not PASSED:

- real OBS program-picture/video rendering inside the CREAPD Program Monitor
- browser-source overlays/lower thirds
- automatic segment-to-scene mapping
- final one-click end-user bridge/desktop helper packaging

The Program Monitor OBS badge/state sync is **BUILT + DEPLOYED**; it should be visually rechecked during the next Program Monitor test rather than treated as separately PASSED yet.

## 10. Talk Acceptance Status

### PASSED

- Heavy owned Talk generation
- Neon persistence for generated production
- Research batching/checkpointing under realistic load
- Topics display and approval path
- guided review through Research -> Topics -> Guests -> Rundown -> AI Assets -> Export
- Advanced JSON export execution
- first CREAPD Live show-execution cockpit
- live start/pause/resume/next/clip/end path
- Live re-entry during a run
- side-by-side Program Monitor + Teleprompter layout visually accepted
- **Start New Run** after `SHOW ENDED`
- new run starts at Segment 1 with fresh clock/runtime state
- prior completed session remains historical rather than becoming active again
- repeat-run control path is user-tested
- local OBS WebSocket pairing/authentication through CREAPD bridge
- OBS heartbeat/state round-trip into owned Neon bridge state
- CREAPD Live displaying real OBS Studio/WebSocket version and current-scene metadata
- OBS scene discovery in CREAPD Live
- **Take** command changes the actual OBS Program scene
- scene change result round-trips back into CREAPD/Neon

### STILL PARTIAL / FUTURE

- guest shortlist/invite/confirm semantics
- focused asset approve/unapprove persistence regression
- shared Production Package -> Presentation Studio/editor handoff for Talk
- legacy monolithic Talk build retirement
- user-facing Show Book / ZIP export
- real Program Monitor/video preview
- browser overlays/lower thirds
- automatic segment-to-scene mappings
- teleprompter auto-scroll / mirror / detached display
- post-show clipping/transcription
- final installed desktop/OBS helper packaging
- future per-session segment-run history model if detailed rehearsal-vs-broadcast analytics are needed

Talk Studio overall remains **PARTIAL** until remaining shared-flow and Base44 cleanup gates are complete.

## 11. Current Exact Next Action

**Begin the real Program Monitor layer on Preview now that owned OBS scene control is PASSED.**

Immediate goals:

1. Inspect the current bridge/OBS capabilities and choose the safest zero-cost way to display the real OBS Program picture inside CREAPD Live without making Vercel transport local media.
2. Keep the existing Program Monitor + Teleprompter desktop layout unchanged.
3. Make the Program Monitor show real broadcast picture/state where feasible, with an explicit fallback when local preview transport is unavailable.
4. Recheck that the Program Monitor OBS connected badge matches the already-passed bridge state.
5. Add browser-source overlay/lower-third command architecture after the monitor path is stable.
6. Preserve the already-passed Talk session state machine and OBS scene command flow.
7. Preview only; do not touch `main`.

Separate Talk cleanup still remains for guest semantics, Show Book export, shared Presentation Studio handoff, and legacy Base44 fallback retirement.

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
- Show Book/export packaging
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
