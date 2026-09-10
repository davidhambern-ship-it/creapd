# CREAPD Preview Migration Handoff

> **READ THIS FIRST IN A NEW CHAT / NEW WORK SESSION.**
>
> Before changing code, inspect this file, the current `backend/vercel-foundation` branch head, and Vercel status. Update this file after every meaningful migration/test checkpoint.

## 1. Mission

CREAPD is being rebuilt and fully tested **before anything is promoted to the live site**.

Goal: a **fully operational, launch-ready CREAPD in Preview**, with runtime ownership migrated off Base44. Only after the entire product is upgraded, regression-tested, demo-tested, and audited do we promote the completed rebuild to `main`.

Launch-ready means every Production Studio works end-to-end, shared Production Package/Dispatch/Presentation flows work, CREAPD Live can execute a show with OBS/overlays/post-show tooling, data survives realistic reuse, critical runtime behavior no longer depends on Base44, failure states are explicit, and users are guided through major workflows.

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

Preferred owned runtime:

`React UI -> /api/creapd/production/core -> Studio server module -> Neon / owned services`

Principles:
- React/Vite frontend on Vercel.
- Shared owned Production Core gateway.
- Neon/Postgres as primary persistent data.
- `src/api/creapdClient.js` as owned frontend client.
- Neon-aware auth via `shouldUseNeonAuth()`.
- Base44 only as temporary compatibility for unmigrated areas.
- Do not count browser-side Base44 SDK workarounds as migration completion.
- CREAPD Zero-Cost Upgrade & Architecture Blueprint remains the north star: multi-agent editorial intelligence, provider fallbacks, OBS WebSocket, browser overlays, Host/Teleprompter mode, live session/timestamp logging, local FFmpeg clipping, and future org/team/RLS design.

### Vercel function-count lesson
Preview already had 12 serverless API functions. Early Talk work added function #13 and deployment failed. Talk and OBS control must remain consolidated behind the existing Production Core endpoint. Do not add separate OBS serverless functions.

## 4. Research Studio — Reference Implementation

Controlled Preview regression passed:
- points persisted
- approve worked
- package count changed
- navigate away/back preserved state
- reject/restore worked
- package/editor opened
- explicit Exit Editor works

Known non-blocking issue: Escape does not reliably exit Present mode. User explicitly does not care right now.

## 5. Presentation Studio

Preview contains an owned Presentation Studio more advanced than `main`. It reads owned production data through `/production/core`, opens `/editor/:id`, and uses owned update/delete/editor actions. Do not overwrite it with older `main` presentation code without inspection.

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

### Successful heavy build — USER TESTED + NEON VERIFIED
- config status `ready`
- `build_metadata.stage = complete`
- 8/8 topics
- 16 research items
- 4 AI guest suggestions
- 13 segments
- 19 AI assets
- 1 owned Talk Production Package
- all three research batches complete
- production model `openai/gpt-5.4-mini`

Core owned Talk generation is **PASSED**.

Legacy `server/talkEngine.js` and monolithic `talk_build` / `talk_refresh` compatibility handlers still exist and must later be retired/hard-blocked.

## 7. UX Rule — CREAPD Must Guide the User

Product rule:

> **Never assume a CREAPD user already understands the production workflow. Every major page should explain what the user is doing, what decision they need to make, what “ready” means, and the next step.**

Talk guided sequence:
**Setup -> Research -> Topics -> Guests -> Rundown -> AI Assets -> Finish & Launch -> CREAPD Live**

The user manually walked the guided downstream path all the way through and successfully exported the show.

Guest semantics remain future cleanup: **Suggested/Shortlist -> Invited -> Confirmed/Declined** rather than implying CREAPD actually booked someone.

## 8. Export Decision

- JSON = **Advanced Data Export**.
- Primary action = **Enter CREAPD Live**.
- Future human export = **Show Book / ZIP package** with PDF/rundown/scripts/source sheet/assets and JSON in an advanced/data folder.

## 9. CREAPD Live — Current Status

Route:
`/talk/live?config_id=<talk configuration id>`

Product direction: CREAPD is the **brain + live control room**; OBS is the broadcast engine. Do not build a Riverside clone/media transport stack first.

### First execution cockpit — USER TESTED + PASSED
Passed in Preview:
- READY / ON AIR / PAUSED / SHOW ENDED
- elapsed/current/planned timing
- current segment / next segment / Run of Show
- host notes
- Start / Pause / Resume / Clip / Next / End
- leaving/re-entering Live during a run

### Teleprompter layout — USER VISUALLY ACCEPTED
Commit:
`79703004fc2697523d973de56de51666174caafe` — `Put teleprompter beside CREAPD Live program monitor`

Desktop layout:
- Program Monitor top left
- Teleprompter top right
- Current Segment + Up Next below
- Run of Show below
- sticky Show Control bottom

Teleprompter includes topic-specific script/talking-point/notes/global fallbacks, scroll reset on segment change, A−/A+ sizing, and debate prompts.

### Repeat-run behavior — USER TESTED + PASSED
Backend repair:
`805c4f06514d3556151b93fdf988f29f949a83bd` — `Allow completed Talk shows to start a new run`

Latest restart cleanup:
`acfb320d8d56984f5460876cedf9d4ed1344fddb` — `Scope CREAPD Live restart data load to live route`

Product rule: ending a show ends one run/session; it does not permanently lock the prepared production. `Start New Run` creates a fresh active run while retaining prior session/event history.

### OBS local bridge + scene control — USER TESTED + PASSED
Core implementation:
- `server/obsBridge.js`
- `src/components/talk/TalkObsBridgeControl.jsx`
- `public/creapd-obs-bridge.ps1`
- routed through existing `/api/creapd/production/core`

Neon migration `005` — **APPLIED** to active Preview branch.
Owned tables:
- `creapd.obs_bridges`
- `creapd.obs_commands`

Architecture:
- OBS remains local.
- Local bridge connects to OBS WebSocket v5 at `ws://127.0.0.1:4455` by default.
- Bridge makes outbound HTTPS calls to CREAPD.
- CREAPD stores bridge heartbeat/state and command queue in Neon.
- Preview uses Vercel Automation Protection Bypass only because Preview is protected.
- Final users must not receive the PowerShell/manual-token workflow; final direction is a one-click installed bridge/desktop helper or OBS plugin.

User-tested and PASSED:
- local OBS pairing/authentication
- heartbeat/state round-trip
- real OBS version/current-scene metadata in CREAPD
- scene discovery
- **Take** command from CREAPD changes actual OBS Program scene
- resulting scene state round-trips back into CREAPD/Neon

### Local real Program Monitor — USER TESTED + PASSED
Implementation direction:

`OBS Program -> OBS Virtual Camera -> browser getUserMedia() -> CREAPD Program Monitor`

Initial implementation:
`735c5fc6d0c2a053bea7c312bea7e9197988a50f` — `Mount local OBS program monitor in CREAPD Live`

Black-frame repair:
`09ce2bd4e712bdaf7041cb2c6468fc95d731aca4` — `Attach OBS program stream after video mount`

Segment-refresh regression repair:
`0e94d087d8f22c6cf7b96cc119e7e5f788338573` — background Talk refreshes no longer tear down the Live cockpit during `Next Segment`.

User acceptance on 2026-09-10 — **TESTED + PASSED**:
- OBS bridge remained connected.
- OBS Virtual Camera remained active.
- CREAPD Live rendered the actual OBS Program picture.
- Teleprompter/show layout remained intact.
- after the `0e94d087...` repair, advancing segments updates rundown/session/teleprompter state while the Program Monitor video continues playing without reopening the feed.

Program video remains entirely local; CREAPD does not relay frames through Vercel or store them in Neon. Monitor audio is intentionally muted/disabled to prevent echo.

### OBS recording controls — USER TESTED + PASSED

Recording uses the same owned OBS bridge/command queue. No additional Neon migration was required.

Key functional commits:
- `905ce416f70d3f29b71f3dbf226bee533ed49b49` — add OBS recording status/control to PowerShell bridge
- `29bf549d16975a25fef0a7832c79f1c60fe72bca` — move recording controls into the always-visible CREAPD Live header

User acceptance on 2026-09-10 — **TESTED + PASSED**:
- Start Recording from CREAPD started actual OBS recording.
- CREAPD displayed real REC state/timecode.
- Pause / Resume / Stop all controlled OBS correctly.
- OBS produced the recording file successfully.
- top-header placement was accepted.

### Local lower-third / browser-source graphics — USER TESTED + PASSED

Architecture:

`CREAPD Live graphics desk -> owned OBS command queue -> local CREAPD OBS Bridge -> local HTML file -> OBS Browser Source (CREAPD Overlay) -> OBS Program -> local CREAPD Program Monitor`

Important design decisions:
- OBS does **not** load a Vercel-hosted overlay page for this layer.
- The bridge writes lower-third HTML locally under `%LOCALAPPDATA%\CREAPD\obs-overlays`.
- The bridge creates/updates an OBS Browser Source named **CREAPD Overlay**.
- The source is attached to all currently reported OBS scenes.
- Graphic rendering remains local to the creator’s computer; CREAPD only sends text/state commands.
- Segment changes **cue** the next graphic; they do not force a graphic on-air. The producer remains in control unless a future explicit automation mode is enabled.
- Manual Show / Update / Clear remains available as override.

First implementation commits:
- `33d402eccc5de1f4a7424e2704403dab6056701e` — allow `show_lower_third` / `clear_overlay` commands in owned OBS queue
- `68bf7af43b827734bfbf0ee729efc38cbeb944d7` — local OBS Browser Source lower-third bridge with PowerShell HTML quoting repair
- `c95547f8a6642815b7a0cb9fe16a174f43231a18` — add top-header `TalkObsGraphicsControl.jsx`
- `f4a2f1a4927458d2224a2f7fb87427afc4a1d3c5` — mount CREAPD Live graphics control

Lower-third data repair commits:
- `7ac364ac01bf8667c4a612c7442cf26c6bfcf86b` — seed Live lower-third fields from an existing `lower_third` asset when available; otherwise derive a safe host/show fallback from the current Talk production.
- `0f0a3e6b7e8f12071ca2d71cf54f4c593892fcdc` — add `lower_third` display label to Talk asset labels.
- `804fd8989560f5b4982119bdf796225bd9fdd627` — make the Talk production stage create deterministic host/guest identity lower-third assets from production data on future builds.

Data-driven graphics/placement layer:
- `a10ab1cb8a8347fdb5acd1d5e8f665d571dee7d0` — extend owned OBS command payload validation for graphic position.
- `0baeda8a73e39c1f744fb82816a351dba512be57` — local bridge renders/report six CREAPD-controlled overlay positions.
- `f4dddb6508286bf39aea412a72c4c82770ae5999` — add data-driven Live graphics presets, placement controls, and segment-aware Rundown Cue.

User acceptance on 2026-09-10 — **TESTED + PASSED**:
- core lower-third Show / Update / Clear path works through real OBS.
- Host preset loads production host identity.
- Guest preset/selection loads stored guest identity data.
- Topic mode loads the current topic/segment graphic data.
- Custom/manual editing remains functional.
- CREAPD placement controls move the graphic without requiring manual OBS transform edits.
- Rundown Cue changes when the active segment changes.
- changing segments does not automatically replace the currently aired graphic; producer can Load Cue and then Show/Update explicitly.
- leaving a graphic on-air and using CREAPD **Take** to switch OBS scenes preserves the overlay across scenes.
- Program Monitor remains live during segment changes after the background-refresh repair.

Future-build persisted host/guest `lower_third` assets are BUILT/DEPLOYED in generation code; the existing stress-test production was not rebuilt solely to verify those newly persisted rows because Live fallback/data-driven behavior is already passing.

## 10. Talk Acceptance Status

### PASSED
- heavy owned Talk generation and Neon persistence
- research batching/checkpointing under realistic load
- Topics display/approval
- guided Research -> Topics -> Guests -> Rundown -> AI Assets -> Export
- Advanced JSON export execution
- CREAPD Live state machine and show controls
- Live re-entry and completed-show Start New Run
- Program Monitor + Teleprompter layout
- OBS local pairing/authentication and heartbeat/state round-trip
- OBS scene discovery and CREAPD Take -> actual OBS scene change
- real OBS Program picture rendered locally inside CREAPD Program Monitor
- Program Monitor remains active through `Next Segment` / Talk background refresh
- top-header OBS recording controls
- Start / Pause / Resume / Stop actual OBS recording from CREAPD
- real OBS recording state/timecode and recording-file creation
- local CREAPD lower-third Show / Update / Clear path
- automatic `CREAPD Overlay` OBS Browser Source creation/update
- production/show-setup lower-third prefill behavior
- data-driven Host / Guest / Topic / Custom graphics desk
- CREAPD-controlled lower-third placement presets
- segment-aware Rundown Cue with producer-controlled take/update behavior
- lower-third persistence across CREAPD-driven OBS scene changes

### BUILT / PARTIAL TEST REQUIRED
- future-build persisted host/guest `lower_third` asset generation (code deployed; existing stress-test production was not rebuilt solely for this)

### STILL PARTIAL / FUTURE
- guest shortlist/invite/confirm semantics
- focused asset approve/unapprove persistence regression
- shared Production Package -> Presentation Studio/editor handoff for Talk
- legacy monolithic Talk build retirement
- Show Book / ZIP export
- richer graphics beyond current lower-thirds/topic cards: live text/tickers, image/stinger packages
- optional segment-to-scene/graphic automation mappings
- teleprompter auto-scroll / mirror / detached display
- post-show clipping/transcription
- final installed desktop/OBS helper packaging
- future per-session segment-run history model if detailed rehearsal-vs-broadcast analytics are needed

Talk Studio overall remains **PARTIAL** until remaining shared-flow and Base44 cleanup gates are complete.

## 11. Current Exact Next Action

**Build the next CREAPD Live control layer: segment-to-OBS scene mappings with safe, explicit automation controls in Preview.**

Immediate goals:
1. Let the producer map rundown segments (or segment types/topics) to existing OBS scenes from inside CREAPD.
2. Persist those mappings in owned Talk/Live data rather than local-only UI state.
3. Default to a safe **Cue Scene** behavior: when the segment changes, CREAPD prepares the mapped scene but does not switch Program automatically.
4. Provide an explicit producer action such as **Take Cued Scene** and preserve the existing manual OBS scene dropdown/Take control.
5. Consider an opt-in **Auto Take on Segment Change** mode only if it is unmistakably enabled/disabled and can be overridden immediately; default OFF.
6. Keep graphics cue behavior conservative and compatible with the now-passed cross-scene overlay behavior.
7. Preserve the now-passed Program Monitor stream through segment changes; do not reintroduce full-screen loading refreshes.
8. Keep all work on `backend/vercel-foundation`; do not modify `main`.

After this layer is BUILT + DEPLOYED, user-test mapping creation, persistence, cue changes, manual Take, opt-in automation if implemented, scene/graphic coexistence, and Program Monitor continuity before marking it PASSED.

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