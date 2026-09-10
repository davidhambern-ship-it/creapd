# CREAPD Preview Migration Handoff

> **READ THIS FIRST IN A NEW CHAT / NEW WORK SESSION.**
>
> Before changing code, inspect this file, the current `backend/vercel-foundation` branch head, and Vercel combined status. Resume from **Current Exact Next Action**. Update this file after every meaningful work/test checkpoint.

## 1. Mission — LOCKED

CREAPD is being rebuilt and fully tested **before anything is promoted to the live site**.

Goal: a fully operational, launch-ready CREAPD in Preview, with runtime ownership migrated off Base44. Only after the entire product is upgraded, regression-tested, demo-tested, and audited do we promote the completed rebuild to `main`.

Launch-ready means every Production Studio works end-to-end, shared Production Package/Dispatch/Presentation flows work, CREAPD Live can execute a show with OBS/graphics/post-show tooling, data survives realistic reuse, critical runtime behavior no longer depends on Base44, failure states are explicit, and users are guided through major workflows.

## 2. Branch / Environment Rules

Development/testing branch: `backend/vercel-foundation`

Preview URL: `https://project-1nufq-git-backend-vercel-foundation-texasnomadgames.vercel.app/`

Vercel:
- Project: `project-1nufq`
- Team slug: `texasnomadgames`
- Team ID: `team_E9xyI6RoOjilno6YazF4Bksb`

Neon:
- Project: `bold-term-42963962`
- Database: `neondb`
- Active Preview branch: `br-round-cake-awfbwk2h`

Live branch: `main`

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
- CREAPD Zero-Cost Upgrade & Architecture Blueprint remains the north star: multi-agent editorial intelligence, provider fallbacks, OBS WebSocket, browser overlays, Host/Teleprompter mode, live session/timestamp logging, local FFmpeg clipping, and future org/team/RLS.

### Vercel function-count rule
Preview already hit the serverless function-count ceiling once. Talk and OBS work must stay consolidated behind existing Production Core instead of adding one Vercel function per feature.

## 4. Research Studio — Reference Implementation

Controlled Preview regression PASSED:
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

## 6. Talk Studio 2.0 — Core Build

Stress-test config: `af9ccc24-ba27-46f2-9b63-4025da1b4dbc`

Production:
- We Are America
- Host: TexasNomad
- Panel Discussion
- Date: 2026-09-10
- Total runtime: 120 min
- Talk runtime: 110 min
- Sponsor runtime: 4 min
- Tone: Conversational
- Topics: 8
- Research sources: 18

Neon migration 004 is APPLIED. Owned Talk tables include configuration, topics, research, guests, segments, assets, sessions, and events.

Heavy build — **TESTED + PASSED**:
- config ready / build complete
- 8/8 topics
- 16 research items
- 4 AI guest suggestions
- 13 segments
- 19 original AI assets
- 1 owned Talk Production Package
- all three research batches complete
- production model `openai/gpt-5.4-mini`

Legacy `server/talkEngine.js` and monolithic `talk_build` / `talk_refresh` compatibility handlers remain cleanup work.

## 7. UX Rule — LOCKED

> **Never assume a CREAPD user already understands the production workflow. Every major page should explain what the user is doing, what decision they need to make, what “ready” means, and the next step.**

Talk guided sequence:
**Setup -> Research -> Topics -> Guests -> Rundown -> AI Assets -> Finish & Launch -> CREAPD Live**

The downstream guided flow through Export was manually walked and PASSED.

Guest semantics remain future cleanup: use **Suggested/Shortlist -> Invited -> Confirmed/Declined** rather than implying CREAPD actually booked someone.

## 8. Export Decision

- JSON = **Advanced Data Export**.
- Primary user action = **Enter CREAPD Live**.
- Future human export = **Show Book / ZIP package** with PDF/rundown/scripts/source sheet/assets plus JSON under advanced/data.

## 9. CREAPD Live — Current Status

Route: `/talk/live?config_id=<talk configuration id>`

Product direction: CREAPD is the **brain + live control room**; OBS is the broadcast engine. Do not build a Riverside clone/media transport stack first.

### Live state machine — TESTED + PASSED
- READY / ON AIR / PAUSED / SHOW ENDED
- timing/current/next/rundown
- Start / Pause / Resume / Clip / Next / End
- leave/re-enter during a run
- completed show can Start New Run while retaining prior session/event history

Repeat-run backend repair: `805c4f06514d3556151b93fdf988f29f949a83bd`
Latest restart cleanup: `acfb320d8d56984f5460876cedf9d4ed1344fddb`

### Teleprompter / cockpit layout — ACCEPTED
Commit `79703004fc2697523d973de56de51666174caafe`

Desktop:
- Program Monitor top left
- Teleprompter top right
- Current Segment + Up Next below
- Run of Show below
- sticky show controls

Teleprompter uses topic-specific script/talking-point/notes/global fallbacks, resets on segment change, supports A−/A+ sizing, and shows debate prompts.

### OBS local bridge + manual scene control — TESTED + PASSED
Core files:
- `server/obsBridge.js`
- `src/components/talk/TalkObsBridgeControl.jsx`
- `public/creapd-obs-bridge.ps1`
- routed through `/api/creapd/production/core`

Neon migration 005 is APPLIED:
- `creapd.obs_bridges`
- `creapd.obs_commands`

Architecture:
- OBS remains local.
- Local bridge connects to OBS WebSocket v5, default `ws://127.0.0.1:4455`.
- Bridge makes outbound HTTPS calls to CREAPD.
- Preview uses Vercel Automation Protection Bypass only because Preview is protected.
- Final users must not receive PowerShell/manual-token UX. Final direction is a one-click installed helper/desktop app or OBS plugin.

PASSED:
- local OBS auth/pairing
- heartbeat/state round-trip
- OBS version/current-scene metadata
- scene discovery
- manual CREAPD **Take** changes actual OBS Program scene
- resulting scene round-trips back into CREAPD/Neon

### Local Program Monitor — TESTED + PASSED
Architecture:

`OBS Program -> OBS Virtual Camera -> browser getUserMedia() -> CREAPD Program Monitor`

Initial: `735c5fc6d0c2a053bea7c312bea7e9197988a50f`
Black-frame fix: `09ce2bd4e712bdaf7041cb2c6468fc95d731aca4`

Video stays local; no frames are relayed through Vercel/Neon. Monitor audio is muted to avoid echo.

#### Segment-refresh continuity regression — TESTED + PASSED
User found that **Next Segment** killed the Program Monitor feed. Root cause: `useTalkProduction.loadAll()` set full `loading=true` for every refresh, temporarily unmounting the entire Live cockpit and the Program Monitor portal host.

Fix: `0e94d087d8f22c6cf7b96cc119e7e5f788338573`
- Live `refresh()` now uses a background refresh.
- rundown/session/teleprompter update without tearing down the cockpit.
- user retested and confirmed video playback remains continuous through segment changes.

### OBS recording controls — TESTED + PASSED
Key commits:
- `905ce416f70d3f29b71f3dbf226bee533ed49b49`
- `29bf549d16975a25fef0a7832c79f1c60fe72bca`

PASSED:
- Start Recording
- REC state/timecode
- Pause
- Resume
- Stop
- OBS produced actual recording file
- controls are always available in top Live header

### Local lower-third / browser-source graphics — TESTED + PASSED
Architecture:

`CREAPD Live -> owned OBS command queue -> local bridge -> local HTML -> OBS Browser Source “CREAPD Overlay” -> OBS Program -> local Program Monitor`

Overlay files live under `%LOCALAPPDATA%\CREAPD\obs-overlays`. OBS does not load a Vercel-hosted graphics page for this layer.

Core lower-third Show / Update / Clear PASSED. Existing shows safely derive host/show copy when no persisted lower-third asset exists. Future production builds create deterministic host/guest `lower_third` assets.

Important repair commits:
- `7ac364ac01bf8667c4a612c7442cf26c6bfcf86b`
- `0f0a3e6b7e8f12071ca2d71cf54f4c593892fcdc`
- `804fd8989560f5b4982119bdf796225bd9fdd627`

### Data-driven graphics desk — TESTED + PASSED
Functional commits:
- `a10ab1cb8a8347fdb5acd1d5e8f665d571dee7d0` — position accepted by owned OBS queue
- `0baeda8a73e39c1f744fb82816a351dba512be57` — local bridge renders/reports six overlay positions
- `f4dddb6508286bf39aea412a72c4c82770ae5999` — Host / Guest / Topic / Custom presets + Rundown Cue + placement UI

User acceptance on 2026-09-10 — **TESTED + PASSED**:
- Host preset
- Guest preset
- Topic preset
- Custom/manual override
- six CREAPD-controlled positions
- Rundown Cue follows segment change but does not unexpectedly put a new graphic on-air
- Load Cue / Update works
- active graphic survives CREAPD **Take** scene changes
- Program Monitor remains alive through Next Segment

## 10. Segment-to-OBS Scene Mapping + Timed Auto-Run — BUILT + DEPLOYED, TEST REQUIRED

This is the current active work block.

Database inspection on active Preview branch confirmed `creapd.talk_segments` already has:
- `obs_scene text`
- `overlay_payload jsonb`

Therefore **no Neon migration was required**.

Functional commits:
- `b553b5c468b5576ceace3f6c250d0dcf49207df3` — add owned `obs_segment_scene_save` action to `server/obsBridge.js`; persists/clears `talk_segments.obs_scene` through existing Production Core
- `d9299a917be24f0245327256fa9453f509b81078` — add `src/components/talk/TalkObsSceneCueControl.jsx`
- `840ab8036bef2cbcb5c9acb3389dee501200501b` — mount scene cue control in CREAPD Live
- `c555feb6b73b583c44bcdacc9c504e575dbb37a4` — add `src/components/talk/TalkAutoRundownAdvance.jsx`; watches the active segment planned duration while automation is armed and performs the owned Talk transition/start sequence
- `dc529991ec0fd82aac8138e609901d3dceabff80` — mount timed automatic rundown advancement in CREAPD Live

Vercel combined status for `dc529991...` on 2026-09-10: **SUCCESS / DEPLOYED**.

Design:
- Top Live header shows current segment scene cue.
- Each rundown segment can be mapped to one of the real scenes reported by OBS.
- Scene map persists on the owned Talk segment row (`obs_scene`).
- Current segment automatically **cues** its mapped scene.
- CREAPD does **not** automatically switch Program by default.
- Producer can use **Take Cue / Take Cued Scene**.
- Existing manual OBS Take remains available.
- Optional **Auto Take on segment change** exists as an explicit opt-in and is OFF by default.
- When that automation is armed during a live session, CREAPD now also watches the active segment's `duration_seconds`. When the planned duration expires and another segment exists, it automatically records the transition, ends the current segment, starts the next segment, and then the existing Auto Take behavior can take the next segment's mapped OBS scene.
- Auto-run re-reads production immediately before mutation to reduce manual/automatic double-advance races.
- If an interruption leaves a live session with no active segment after a completed prior segment, the automation can recover by starting the first incomplete waiting segment.
- The final segment **does not automatically End Show**. The producer retains the explicit End Show decision.
- Auto Take/auto-run preference is local to the browser/config; scene mappings themselves are persisted in Neon.
- Existing local bridge requires no redownload because it already supports `set_scene`.

Acceptance status: **BUILT + DEPLOYED, NOT YET PASSED**.

User-reported failure that caused the timed auto-run repair:
- With automation armed, allowing a segment to run to its planned end did not advance the CREAPD rundown. Auto Take only reacted after an operator-created segment change, so the next mapped scene never appeared automatically.

Required user test:
1. Hard-refresh CREAPD Live and keep the same mapped consecutive segments.
2. Arm the existing scene automation.
3. Start or continue a live segment with a positive planned duration and do **not** press Next Segment.
4. Allow the active segment timer to reach/exceed its planned duration.
5. Confirm CREAPD automatically changes Current Segment to the next rundown segment.
6. Confirm the next segment timer starts from its own fresh start.
7. If the next segment has a different mapped OBS scene, confirm Auto Take switches actual OBS Program to that mapped scene after the automatic transition.
8. Confirm Program Monitor remains alive through the automatic transition.
9. Confirm manual Next Segment and manual OBS Take still work afterward.
10. Do not expect the final segment to auto-End Show; that remains manual by design.

Do not mark this scene-mapping/timed-auto-run layer PASSED until the real OBS timed transition test succeeds.

## 11. Talk Acceptance Summary

### PASSED
- heavy owned Talk generation / Neon persistence
- research batching/checkpointing
- topic approval/review
- guided Research -> Topics -> Guests -> Rundown -> AI Assets -> Export
- Advanced JSON export
- Live state machine / repeat-run
- Program Monitor / Teleprompter layout
- OBS bridge auth/state/manual scene Take
- real local OBS Program Monitor
- Program Monitor continuity through manual segment changes
- OBS recording Start/Pause/Resume/Stop + real file creation
- lower-third Show/Update/Clear
- data-driven Host/Guest/Topic/Custom graphics
- CREAPD-controlled graphics placement
- safe Rundown Cue graphics behavior
- overlay persistence across OBS scene changes

### BUILT / PARTIAL TEST REQUIRED
- segment-to-OBS scene mapping / cue / Take Cue
- optional Auto Take on segment change
- timed automatic rundown advancement when automation is armed
- future-build persisted host/guest lower-third asset generation on a newly rebuilt production

### STILL PARTIAL / FUTURE
- guest shortlist/invite/confirm semantics
- focused asset approve/unapprove persistence regression
- Talk Production Package -> Presentation Studio/editor handoff
- legacy monolithic Talk build/fallback retirement
- Show Book / ZIP
- richer graphics such as full-screen topic cards / live text / tickers
- teleprompter auto-scroll / mirror / detached display
- post-show clipping/transcription
- installed desktop/OBS helper packaging
- possible per-session segment-run detail table

Talk overall remains PARTIAL until shared-flow and Base44 cleanup gates are complete.

## 12. Current Exact Next Action

**User-test the deployed timed automatic segment transition + mapped OBS scene change in Preview.**

Specifically, arm automation and let a non-final timed segment expire without pressing Next Segment. Confirm CREAPD advances Current Segment by itself, starts the next segment timer, Auto Take changes OBS to the next mapped scene when applicable, and Program Monitor remains continuous. Also confirm manual Next and manual OBS Take still work afterward.

Do not begin another feature until this timed automation regression is confirmed.

## 13. Remaining Studios / Major Areas

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
- post-show clipping/transcription
- organizations/team/RBAC/RLS
- final Base44 audit/removal

Do not promote individual Studio work to production along the way.

## 14. Final Base44 Removal Gate

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

## 15. Status Vocabulary / Protocol

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
