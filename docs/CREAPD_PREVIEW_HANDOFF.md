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

User reported the first cockpit worked seamlessly.

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

Relevant OBS commits:
- `b01bf2c428d226b5b01902cd27896b7d162c08f8` — first owned OBS bridge stack
- `f097c600743a1b3e11c3b5127c818cdae8e264e3` — improved OBS handshake diagnostics
- `5709f06cf2b4a711d5f5061a0f5503cf6b1149e1` — Preview protection bypass support
- `70b54a4da21f851732c413bf0e525ace6f528d18` — sync Program Monitor OBS state

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

Initial real Preview test found a black-frame rendering bug even though CREAPD had correctly acquired `OBS Virtual Camera`. Root cause: the MediaStream was acquired before the `<video>` element mounted, so `videoRef.current` was null when `srcObject` was first assigned.

Repair:
`09ce2bd4e712bdaf7041cb2c6468fc95d731aca4` — `Attach OBS program stream after video mount`

Vercel for `09ce2bd4...`: **SUCCESS / DEPLOYED**.

Retest on 2026-09-10 — **TESTED + PASSED**:
- OBS bridge remained connected.
- OBS Virtual Camera remained active.
- CREAPD Live showed **LOCAL PROGRAM FEED**.
- Program Monitor rendered the actual live OBS Program picture instead of black.
- UI identified `OBS Virtual Camera · Scene`.
- OBS connected badge remained green.
- Teleprompter/show layout remained intact in the same Live cockpit.
- User supplied screenshot visibly confirming the real OBS Program picture inside CREAPD Live and reported: **“IT WORKED!!! OMG!! Literally brought tears to me eyes....”**

Treat the local real Program Monitor video path as **TESTED + PASSED**.

Important architecture behavior:
- Program video remains entirely local to the creator’s machine.
- CREAPD does not relay Program frames through Vercel or store them in Neon.
- Monitor audio remains intentionally muted/disabled to prevent echo.
- selected video device is remembered locally.

## 10. Talk Acceptance Status

### PASSED
- heavy owned Talk generation
- Neon persistence for generated production
- research batching/checkpointing under realistic load
- Topics display/approval
- guided Research -> Topics -> Guests -> Rundown -> AI Assets -> Export
- Advanced JSON export execution
- CREAPD Live state machine and show controls
- Live re-entry
- Program Monitor + Teleprompter layout
- completed-show **Start New Run**
- fresh Segment 1/clock/runtime state on new run
- prior completed session retained historically
- OBS local pairing/authentication
- OBS heartbeat/state round-trip
- OBS scene discovery
- CREAPD **Take** -> actual OBS scene change
- OBS scene result round-trip into CREAPD/Neon
- real OBS Program picture rendered locally inside CREAPD Program Monitor

### STILL PARTIAL / FUTURE
- guest shortlist/invite/confirm semantics
- focused asset approve/unapprove persistence regression
- shared Production Package -> Presentation Studio/editor handoff for Talk
- legacy monolithic Talk build retirement
- Show Book / ZIP export
- browser-source overlays/lower thirds
- automatic segment-to-scene mappings
- teleprompter auto-scroll / mirror / detached display
- post-show clipping/transcription
- final installed desktop/OBS helper packaging
- future per-session segment-run history model if detailed rehearsal-vs-broadcast analytics are needed

Talk Studio overall remains **PARTIAL** until remaining shared-flow and Base44 cleanup gates are complete.

## 11. Current Exact Next Action

**Begin browser-source overlays / lower-thirds integration on Preview now that real OBS Program Monitor is PASSED.**

Immediate goals:
1. Inspect current Talk assets, rundown, guest data, and OBS bridge command capabilities for overlay-ready content.
2. Define a CREAPD-owned overlay state model that can drive lower thirds, topic/title cards, guest IDs, and simple live text without routing video through Vercel.
3. Build a browser-source overlay surface that OBS can load as a Browser Source.
4. Add owned Production Core actions / bridge commands for showing, updating, and clearing overlays while preserving the already-passed OBS scene control path.
5. Add simple CREAPD Live controls for at least one real lower-third test.
6. User-test the lower third appearing in actual OBS Program and verify the Program Monitor reflects it.
7. Keep all work on `backend/vercel-foundation`; do not touch `main`.

After overlays are stable, continue toward automatic segment-to-scene/overlay mappings, teleprompter refinements, and post-show tooling.

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
