# CREAPD Preview Migration Handoff

> **READ THIS FIRST IN A NEW CHAT / NEW WORK SESSION.**
>
> Before changing code, inspect this file, the current `backend/vercel-foundation` branch head, and Vercel combined status. Resume from **Current Exact Next Action**. Update this file after every meaningful work/test checkpoint.

## 1. Mission — LOCKED

CREAPD is being rebuilt and fully tested **before anything is promoted to the live site**.

Goal: a fully operational, launch-ready CREAPD in Preview, with runtime ownership migrated off Base44. Only after the entire product is upgraded, regression-tested, demo-tested, and audited do we promote the completed rebuild to `main`.

Development/testing branch: `backend/vercel-foundation`

Preview URL: `https://project-1nufq-git-backend-vercel-foundation-texasnomadgames.vercel.app/`

Live branch: `main` — **frozen**.

`main` intentionally restored to:
`ca03bf2af028cc2cf62e915c2e47c41ee6a0f214` — `Add explicit presentation editor exit`

Do not resurrect the accidental client-side Base44 Talk experiment from `main`.

## 2. Environment / Architecture

Vercel:
- Project: `project-1nufq`
- Team slug: `texasnomadgames`
- Team ID: `team_E9xyI6RoOjilno6YazF4Bksb`

Neon:
- Project: `bold-term-42963962`
- Database: `neondb`
- Active Preview branch: `br-round-cake-awfbwk2h`

Owned runtime direction:

`React UI -> /api/creapd/production/core -> Studio server module -> Neon / owned services`

Rules:
- React/Vite frontend on Vercel.
- Neon/Postgres is primary persistent data.
- `src/api/creapdClient.js` is the owned frontend client.
- Neon-aware auth via `shouldUseNeonAuth()`.
- Base44 is temporary compatibility only for unmigrated areas.
- Do not count browser-side Base44 SDK workarounds as migration completion.
- Talk/OBS work stays consolidated behind Production Core because Preview already hit the Vercel function-count ceiling once.

## 3. Product / UX Rules — LOCKED

CREAPD is the **brain + live control room**; OBS is the broadcast engine. Do not build a Riverside clone/media transport stack first.

> **Never assume a CREAPD user already understands the production workflow. Every major page should explain what the user is doing, what decision they need to make, what “ready” means, and the next step.**

Talk guided flow:
**Setup -> Research -> Topics -> Guests -> Rundown -> AI Assets -> Finish & Launch -> CREAPD Live**

JSON is **Advanced Data Export**. Primary post-production action is **Enter CREAPD Live**. Future human-facing export is Show Book / ZIP.

## 4. Research / Presentation Reference Status

Research Studio controlled Preview regression — **TESTED + PASSED**:
- point persistence
- approve/reject/restore
- package count changes
- navigate away/back persistence
- package/editor opens
- explicit Exit Editor

Known non-blocker: Escape does not reliably exit Present mode; user does not care right now.

Presentation Studio in Preview is more advanced than `main`; do not overwrite it with older `main` code without inspection.

## 5. Talk Studio 2.0 — Core Build

Stress-test config: `af9ccc24-ba27-46f2-9b63-4025da1b4dbc`

Production: `We Are America`
- Host: TexasNomad
- Panel Discussion
- Date: 2026-09-10
- Total runtime: 120 min
- Talk runtime: 110 min
- Sponsor runtime: 4 min
- Topics: 8
- Research sources: 18

Neon migration 004 is APPLIED.

Heavy build — **TESTED + PASSED**:
- 8 topics
- 16 research items
- 4 AI guest suggestions
- 13 segments
- 19 original AI assets
- 1 owned Talk Production Package
- all research batches complete
- production model `openai/gpt-5.4-mini`

Legacy `server/talkEngine.js` plus monolithic `talk_build` / `talk_refresh` compatibility remain cleanup work.

## 6. CREAPD Live — PASSED Foundation

Route: `/talk/live?config_id=<talk configuration id>`

### Live state machine — TESTED + PASSED
- READY / ON AIR / PAUSED / SHOW ENDED
- Start / Pause / Resume / Clip / Next / End
- timing/current/next/rundown
- leave/re-enter during a run
- completed show can Start New Run while retaining prior session/event history

Repeat-run repair: `805c4f06514d3556151b93fdf988f29f949a83bd`
Latest restart cleanup: `acfb320d8d56984f5460876cedf9d4ed1344fddb`

### Teleprompter / cockpit — ACCEPTED
Commit `79703004fc2697523d973de56de51666174caafe`

Desktop core:
- Program Monitor
- Teleprompter
- Current Segment + Up Next
- Run of Show

Teleprompter uses topic-specific script/talking-point/notes/global fallbacks and resets on segment change.

### OBS local bridge / scene control — TESTED + PASSED
Files:
- `server/obsBridge.js`
- `src/components/talk/TalkObsBridgeControl.jsx`
- `public/creapd-obs-bridge.ps1`

Neon migration 005 APPLIED:
- `creapd.obs_bridges`
- `creapd.obs_commands`

PASSED:
- local OBS auth/pairing
- heartbeat/state round-trip
- OBS version/current scene metadata
- scene discovery
- manual CREAPD Take changes actual OBS Program scene
- scene state returns to CREAPD/Neon

Preview-only Vercel bypass secret remains bridge plumbing. Final users must get a one-click installed helper/app or OBS plugin, not PowerShell/manual-token setup.

### Local Program Monitor — TESTED + PASSED

`OBS Program -> OBS Virtual Camera -> browser getUserMedia() -> CREAPD Program Monitor`

Initial: `735c5fc6d0c2a053bea7c312bea7e9197988a50f`
Black-frame fix: `09ce2bd4e712bdaf7041cb2c6468fc95d731aca4`

Video stays local; no media frames go through Vercel/Neon.

Segment-refresh continuity regression — **TESTED + PASSED**:
- bug: Next Segment destroyed Program Monitor mount
- fix: background refresh rather than full Live loading teardown
- commit `0e94d087d8f22c6cf7b96cc119e7e5f788338573`
- user confirmed Program Monitor remains continuous through segment change

### OBS recording — TESTED + PASSED
Key commits:
- `905ce416f70d3f29b71f3dbf226bee533ed49b49`
- `29bf549d16975a25fef0a7832c79f1c60fe72bca`

PASSED:
- Start Recording
- REC state/timecode
- Pause / Resume / Stop
- actual OBS recording file created

### Lower thirds / data-driven graphics — TESTED + PASSED before current UI refactor

Architecture:
`CREAPD Live -> OBS command queue -> local bridge -> local HTML -> OBS Browser Source “CREAPD Overlay” -> OBS Program -> Program Monitor`

Core Show / Update / Clear passed.

Data-driven graphics passed:
- Host
- Guest
- Topic
- Custom/manual
- six CREAPD-controlled positions
- segment Rundown Cue
- Load Cue / Update
- graphic survives OBS scene Take
- Program Monitor stays alive

Key commits:
- `a10ab1cb8a8347fdb5acd1d5e8f665d571dee7d0`
- `0baeda8a73e39c1f744fb82816a351dba512be57`
- `f4dddb6508286bf39aea412a72c4c82770ae5999`

## 7. Segment-to-OBS Mapping + Timed Auto-Run — BUILT + DEPLOYED, TEST REQUIRED

Database already contains:
- `creapd.talk_segments.obs_scene`
- `creapd.talk_segments.overlay_payload`

No new Neon migration required.

Scene mapping commits:
- `b553b5c468b5576ceace3f6c250d0dcf49207df3` — persist/clear segment OBS scene
- `d9299a917be24f0245327256fa9453f509b81078` — scene cue UI
- `840ab8036bef2cbcb5c9acb3389dee501200501b` — mount scene cues

Timed auto-run repair:
- `c555feb6b73b583c44bcdacc9c504e575dbb37a4` — add `TalkAutoRundownAdvance.jsx`
- `dc529991ec0fd82aac8138e609901d3dceabff80` — mount timed advancement
- Vercel SUCCESS

Design:
- mappings persist on Talk segment rows
- Auto mode is opt-in and stored per browser/config
- when armed, segment duration expiry advances to the next segment
- next segment’s mapped OBS scene can Auto Take
- final segment does NOT auto-End Show
- recovery path starts the first incomplete segment if a request interruption leaves the live session between segments

User found the original Auto Take only reacted after an operator-created segment change. Timed auto-run was added, but the user paused acceptance testing to request the Live control-room consolidation below.

Status: **BUILT + DEPLOYED, NOT YET PASSED**.

## 8. CREAPD Live Control Center Consolidation — BUILT + DEPLOYED, USER TEST REQUIRED

User feedback on 2026-09-10:
- Live Graphics and Rundown Scene Cues felt unsynchronized because they were separate polling/control windows.
- Next Segment, Pause, Clip Moment, and End Show were at the bottom of the page and should be available in the top live bar.
- the floating OBS Control should be moved out of the page overlay area, preferably near Program Monitor.

Implemented on `backend/vercel-foundation`:

Functional commits:
- `c152e16b004e73d94b02ecbe9468c1db6b0b1a17` — add `src/components/talk/TalkLiveDirectorControl.jsx`
- `7c0dadb67554eabdff3c59386f72480b0fe56ee0` — replace separately mounted Graphics + Scene Cue controls with unified Director control
- `a7c9cd8f86ee9be916ef32a97257074903ee72f5` — move show transport controls to the top Live header; remove bottom sticky Show Control; add Program Monitor OBS control dock target
- `9db09c80b6855854a4cda199170645caf78148c0` — dock OBS bridge control inside Program Monitor area and keep bridge setup/diagnostics/manual fallback there

Vercel combined status for `9db09c80...`: **SUCCESS / DEPLOYED**.

New UI/behavior:
- top header is now the primary control strip:
  - ON AIR / PAUSED / READY status
  - show clock
  - Start / Pause / Resume
  - Clip
  - Next
  - End
  - existing recording controls
  - unified **Director** control
- old bottom sticky Show Control removed
- old standalone Graphics and Scene Cue components are no longer mounted
- unified **Director Controls** shares one Talk production snapshot and one OBS bridge snapshot for both Graphics and Scenes
- Director header shows the same current segment with:
  - mapped OBS scene
  - actual Program scene
  - prepared segment graphic cue
- Director tabs:
  - **Graphics** — Host / Guests / Topic / Custom, editable copy, position, Show/Update/Clear
  - **Scenes & Automation** — current cue, Take Cue, manual scene fallback, scene map persistence, Timed Run + Auto Take toggle
- the same localStorage automation key remains in use, so `TalkAutoRundownAdvance` and the Director control stay on the same automation state
- OBS bridge/setup control no longer floats at page bottom-right; it is docked inside the Program Monitor area
- no Neon migration
- no bridge redownload required

Important acceptance rule:
The underlying graphics, recording, Program Monitor, scene Take, and show transport functionality had passed before this UI consolidation, but the **new consolidated UI itself is not PASSED until the user exercises it**.

## 9. Current Exact Next Action

**User-test the consolidated CREAPD Live control room in Preview before adding another feature.**

Acceptance pass:
1. Hard-refresh CREAPD Live.
2. Confirm top bar contains show status/clock plus Pause/Resume, Clip, Next, End, Record, and Director as applicable.
3. Confirm the old bottom Show Control bar is gone.
4. Confirm there is only one Director window for Graphics + Scenes rather than separate Graphics and Scene Cue windows.
5. In Director → Graphics, confirm Host/Guest/Topic/Custom, positioning, Show/Update/Clear still work.
6. In Director → Scenes & Automation, confirm saved mappings are present, Take Cue works, manual scene Take works, and the Auto toggle is preserved.
7. Confirm Graphics and Scenes report the same Current Segment in the Director summary.
8. Confirm OBS Connection control appears in/near Program Monitor instead of floating over the page.
9. Confirm Program Monitor video remains continuous while using Next Segment and scene Take.
10. Then resume the still-pending timed auto-run acceptance: arm automation and let a non-final segment expire without pressing Next. Confirm automatic segment advance + mapped scene Auto Take + continuous Program Monitor.

If all of that passes, mark the consolidated control center and timed scene automation TESTED + PASSED and choose the next CREAPD Live layer.

## 10. Talk Acceptance Summary

### PASSED before current consolidation
- heavy owned Talk generation / Neon persistence
- research batching/checkpointing
- topic review/approval
- guided Talk setup through Export
- Advanced JSON export
- Live state machine / repeat-run
- Program Monitor / Teleprompter
- Program Monitor continuity through manual segment changes
- OBS bridge auth/state/manual Take
- OBS recording + real file creation
- lower-third Show/Update/Clear
- data-driven graphics + placement
- graphics persistence across OBS scene changes

### BUILT + DEPLOYED / USER TEST REQUIRED
- consolidated top Live control strip
- unified Director Graphics + Scenes control
- docked OBS control near Program Monitor
- scene mapping / Take Cue through unified Director
- timed automatic rundown advancement + Auto Take
- future-build persisted host/guest lower-third generation on a newly rebuilt production

### STILL PARTIAL / FUTURE
- guest shortlist/invite/confirm semantics
- focused asset approve/unapprove persistence regression
- Talk Production Package -> Presentation Studio/editor handoff
- legacy monolithic Talk build/fallback retirement
- Show Book / ZIP
- richer graphics: full-screen topic cards / live text / tickers
- teleprompter auto-scroll / mirror / detached display
- post-show clipping/transcription
- installed desktop/OBS helper packaging
- possible per-session segment-run detail table

Talk overall remains PARTIAL until shared-flow and Base44 cleanup gates are complete.

## 11. Remaining Studios / Major Areas

- Talk — current focus until Live/shared downstream cleanup is done
- Cooking
- Sports
- Cosmo
- Music / Radio
- Spiritual
- News
- shared Production Package flow
- Dispatch
- Presentation Studio/editor full regression
- Show Book/export
- post-show clipping/transcription
- organizations/team/RBAC/RLS
- final Base44 audit/removal

Do not promote individual Studio work to production along the way.

## 12. Final Base44 Removal Gate

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

## 13. Status Vocabulary / Protocol

- **BUILT** — code exists
- **DEPLOYED** — Vercel successful
- **TESTED** — user exercised actual Preview flow
- **PASSED** — acceptance behavior worked and persisted
- **PARTIAL** — important behavior remains unverified/broken
- **BLOCKED** — cannot progress without resolving issue

Never use PASSED merely because code compiled or Vercel deployed.

After each meaningful work block record: date, branch, latest functional commit, what changed, files/routes, Vercel status, DB status, actual user test, result, known issues, and exact next action.

---

### Quick resume prompt

> Open `docs/CREAPD_PREVIEW_HANDOFF.md` from `backend/vercel-foundation` in `davidhambern-ship-it/creapd`, inspect the current branch head and Vercel status, and resume from **Current Exact Next Action**. Do not modify `main`.
