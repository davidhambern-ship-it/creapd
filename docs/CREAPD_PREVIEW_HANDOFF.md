# CREAPD Preview Migration Handoff

> **READ THIS FIRST IN A NEW CHAT / NEW WORK SESSION.**
>
> This file is the persistent handoff for the CREAPD rebuild. Update it after every meaningful migration, regression test, architecture decision, or blocker so a future session can inspect GitHub/Vercel and resume without relying on chat memory.

## 1. Mission

CREAPD is being rebuilt and fully tested **before anything is promoted to the live site**.

The goal is not to patch the current live/Base44 application feature-by-feature. The goal is to finish a **fully operational, launch-ready CREAPD in Preview**, migrate runtime ownership off Base44, regression-test the entire product, and only then promote the completed rebuild to production in one deliberate launch step.

The user specifically wants CREAPD to be dependable enough that live demonstrations do not randomly fail.

### Definition of launch-ready

CREAPD is not launch-ready until:

- Every Production Studio works end-to-end in Preview.
- Shared production flows work across Studios.
- Data survives refresh, navigation, logout/login, reopen, edit, reject/restore, and regeneration flows.
- Critical runtime behavior no longer depends on Base44 entities, backend functions, auth, AI integrations, or hidden fallbacks.
- Failure states are explicit; no endless Initializing states, blank pages, silent failures, or dead buttons.
- The shared flow works: **Studio -> research/content -> Production Package -> Dispatch -> Presentation Studio -> Editor -> review/present/export**.
- We can run multiple realistic demonstrations from the CREAPD home screen without knowing the path in advance.
- A final repository-wide Base44 audit is complete.
- Only after the full Preview build passes do we promote to `main` and perform a production smoke test.

## 2. Branch / Environment Rules

### Development and testing branch

`backend/vercel-foundation`

### Preview URL

`https://project-1nufq-git-backend-vercel-foundation-texasnomadgames.vercel.app/`

### Vercel project

- Project: `project-1nufq`
- Team slug: `texasnomadgames`
- Team ID: `team_E9xyI6RoOjilno6YazF4Bksb`

### Live branch

`main`

**Treat `main` as frozen. Do not implement migration work there.**

As of 2026-09-10, `main` was intentionally restored to:

`ca03bf2af028cc2cf62e915c2e47c41ee6a0f214` — `Add explicit presentation editor exit`

Do not promote Preview work to `main` until the entire CREAPD rebuild is ready for launch.

### Important mistake that was corrected

The following experimental changes were accidentally made on `main` and then removed by resetting `main` back to `ca03bf2...`:

- `a081145...` Rename presentation library to Assembly Projects
- `94f6540...` Clarify Assembly Project terminology
- `3321142...` Add reusable client production package adapter
- `a5612f9...` Add client-side Talk production engine
- `fc6ae7d...` Route Talk builds through client engine

**Do not resurrect those Talk changes as the migration architecture.** They bypassed Base44 backend functions but still depended heavily on the Base44 SDK and were not the owned Vercel/Neon architecture we want.

## 3. Current Preview Baseline

Last functional code commit before this handoff file:

`98dc0b470d8efe5c9f7263dc6f51264a5f7a9476` — `Fix Research Manager JSX syntax`

Vercel status for that commit: **success**.

Previous migration commit:

`7ec41bf67dfccff089a5370d9a67b167256a82be` — `Route Research point actions through owned backend`

The branch is intentionally divergent from `main`. **Do not broad-merge or sync branches.** Port only deliberate, reviewed changes.

## 4. Architecture Direction

Preview is becoming the **new CREAPD**, not merely a patched copy of the old one.

### Owned runtime direction

- Frontend: React/Vite on Vercel
- Backend/API: owned `/api/creapd/*` Vercel routes
- Primary persistent data: Neon/Postgres
- Owned client: `src/api/creapdClient.js`
- Neon-aware auth path: `shouldUseNeonAuth()` / owned authentication work
- Base44 may remain temporarily as compatibility/fallback while migrating, but it is not the final source of truth.

### Migration rule

A Studio is not considered migrated merely because a Base44 backend function was replaced with browser-side Base44 SDK calls.

The target is owned data authority and owned server/API behavior. Prefer:

**React UI -> CREAPD API -> Neon / owned services**

over:

**React UI -> Base44 entities/functions/integrations**

### Zero-Cost Upgrade & Architecture Blueprint

The project is also using the user-provided document **“CREAPD: Zero-Cost Technical & Strategic Upgrade Blueprint”** as a north-star architecture reference.

Key principles to preserve while adapting them to our existing stack:

- Edge/local hybridization.
- Zero/near-zero infrastructure cost during validation.
- Multi-agent editorial intelligence rather than one giant opaque generation step.
- Cloud model fallback strategy, with local inference as a future fallback.
- OBS WebSocket integration for live execution.
- Dynamic browser-source overlays.
- Dedicated Host/Teleprompter mode.
- Live segment/timestamp logging.
- Post-show transcription and local FFmpeg clipping pipeline.
- Multi-tenant organizations/shows/memberships/RLS architecture.

Do not blindly add Supabase, NextAuth, Lucia, or other providers named in the blueprint if Neon/current owned infrastructure already satisfies the requirement. Preserve the architectural goal rather than the provider name.

## 5. Research Studio Status — REFERENCE IMPLEMENTATION

Research is currently the strongest migration reference.

### Owned Research API routes already present

- `/api/creapd/research/production.js`
- `/api/creapd/research/configuration.js`
- `/api/creapd/research/topic-action.js`
- `/api/creapd/research/dossier-action.js`
- `/api/creapd/research/dossier-status.js`
- `/api/creapd/research/archive.js`
- `/api/creapd/research/voice-upload.js`

Owned engines include examples such as:

- `server/researchPackageEngine.js`
- `server/mediaGateway.js`

### Research point migration

`src/pages/ResearchManager.jsx` was changed so Neon Preview writes go through the owned backend:

- Approve -> `/research/production` action `approve_point`
- Reject/restore/unapprove -> `set_point_status`
- Generate package -> `generate_package`

The stored point status remains `pending`, but the UI label was changed to **Awaiting Review** so users do not confuse review state with a failed research process.

### Research regression result

The controlled Research test passed the important functional path:

- Points persisted.
- Approve worked.
- Package count changed.
- Navigation away/back preserved state.
- Reject/restore worked.
- Package/editor flow opened.
- Explicit Exit Editor works.

Known non-blocking issue:

- Escape key still does not reliably exit Present mode. User explicitly said this is not important; defer unless it becomes part of another issue.

Research should be treated as a **reference implementation**, not something to ship independently.

## 6. Presentation Studio Status

Preview already contains a more advanced owned Presentation Studio than `main`.

`src/pages/Presentations.jsx` in Preview:

- Uses `creapdApi.get('/production/core?limit=200')` when owned Preview auth is active.
- Lists Presentation Studio projects across production Studios.
- Describes projects as arriving after an approved Production Package is dispatched from a Production Studio.
- Opens `/editor/:id`.
- Uses owned `/production/core` action `delete_presentation_studio` for Preview deletes.
- Displays an **OWNED** badge when using the owned path.

Do not overwrite this architecture with the older `main` Presentation/Assembly implementation without inspection.

## 7. Current Focus — Talk Studio 2.0

Talk Studio is the next migration target.

### Critical decision

Do **not** merely recreate the old Base44 Talk backend in the browser.

Build Talk on `backend/vercel-foundation` using the owned Vercel/Neon architecture and use it as the first Studio to substantially implement the Zero-Cost Blueprint.

### Intended Talk architecture

#### Owned data model

Move Talk configuration and generated/runtime data into Neon ownership, including at minimum:

- Talk configuration/show profile
- Topics
- Research items
- Guests
- Rundown segments
- Assets
- Production Package link/state
- Live show/session runtime state
- Segment timestamps / markers

Design new records with future organization/show ownership in mind so multi-tenant support does not require a total rewrite later.

#### Owned Talk API

Create a clean `/api/creapd/talk/*` server/API boundary for:

- configuration read/write
- research generation
- topic/research state
- guests
- rundown generation/update
- assets
- package generation/dispatch
- live session/segment state

Avoid `base44.functions.invoke('buildTalkProduction', ...)` as the final architecture.

#### Talk Agent Engine

Split intelligence into understandable roles instead of one giant generation prompt. Blueprint-inspired roles:

- Intake/research agent
- Fact-check / verification agent
- Counter-perspective / debate agent
- Broadcast dossier / synthesis agent
- Rundown / host production agent

The exact model provider can change. Architect the engine so primary/fallback providers can be swapped without changing Studio logic.

#### Talk Host Mode

Talk should eventually have a first-class live Host Mode with:

- large current-segment talking points
- countdown / elapsed time
- upcoming segment
- guest/context information
- next / hold / pause controls
- `Clip This Moment`
- push graphic / overlay actions
- keyboard navigation

#### Live session logging

Even before FFmpeg automation is finished, Talk execution should record:

- real segment start/end
- transitions
- pauses/holds
- clip markers
- planned vs actual duration

This metadata becomes the basis for future transcription and automated clipping.

#### OBS foundation

Add the architecture required for future OBS WebSocket v5 integration and browser-source overlays. It does not all need to ship in the first Talk coding pass, but Talk data/events should not be designed in a way that blocks it.

## 8. Talk Acceptance Test Before Marking Green

A Talk Studio migration is not green until Preview can complete and persist this path:

1. Create/configure a Talk production from scratch.
2. Generate owned research.
3. See verification/counter-perspective outputs where applicable.
4. Generate/edit topics and rundown.
5. Generate assets/scripts.
6. Create the owned Production Package.
7. Dispatch/open the result in the shared Presentation Studio where appropriate.
8. Open/exit/reopen editor/project state without loss.
9. Exercise Host Mode / runtime state once implemented.
10. Navigate away, refresh, log out/in, return, and verify persistence.
11. Intentionally cause at least one recoverable failure and verify the UI reports it clearly.
12. Confirm the tested path does not silently fall back to a Base44 backend function.

Only after the user performs the real Preview test should Talk be marked passed.

## 9. Remaining Studios / Major Areas

Not yet fully migrated/tested as part of the launch-ready Preview build:

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
- OBS/live execution foundation
- Host Mode
- Post-show clipping/transcription foundation
- Organizations/team/RBAC/RLS architecture
- Final Base44 audit/removal

Sequence may change based on dependency complexity, but do not promote individual Studio work to production along the way.

## 10. Base44 Removal Audit — FINAL GATE

Before launch, search the entire Preview codebase for at least:

- `@base44/sdk`
- `base44.entities`
- `base44.functions`
- `base44.integrations`
- `createClient(` Base44 construction
- Base44 app URLs / app IDs / tokens
- compatibility adapters
- fallback branches
- old service-role assumptions

For each remaining reference, classify it as:

1. Removed/replaced,
2. Temporary one-time migration utility,
3. Explicitly isolated compatibility code scheduled for deletion,
4. A blocker.

Do not call CREAPD fully migrated while critical runtime behavior still depends on Base44.

## 11. Work-Session Update Protocol

At the end of every meaningful work block, update this file with:

- Date/time.
- Branch.
- Last code commit SHA.
- What changed.
- Which files/routes were touched.
- Vercel status.
- What the user actually tested.
- PASS / FAIL / PARTIAL result.
- Known blockers/non-blockers.
- Exact next action.

### Status vocabulary

Use these consistently:

- **BUILT** — code exists.
- **DEPLOYED** — Vercel status is successful.
- **TESTED** — user exercised the actual Preview flow.
- **PASSED** — acceptance behavior worked and persisted.
- **PARTIAL** — some path worked but important behavior remains unverified/broken.
- **BLOCKED** — cannot progress without resolving an issue.

Never use “passed” just because code compiled or Vercel deployed.

## 12. Current Exact Next Action

**Talk Studio 2.0 architecture audit on `backend/vercel-foundation`.**

Before writing code:

1. Inspect current Preview Talk pages/hooks/entities/backend dependencies.
2. Identify every Base44 read/write/function/integration used by Talk.
3. Map the required Neon tables/data model.
4. Map the owned `/api/creapd/talk/*` endpoints.
5. Reuse Research/Production Core patterns where appropriate rather than creating a second architecture.
6. Then implement the first owned Talk vertical slice in Preview.

Do not touch `main` while doing this.

---

### Quick resume prompt for a future session

If a new chat begins, use:

> Open `docs/CREAPD_PREVIEW_HANDOFF.md` from the `backend/vercel-foundation` branch of `davidhambern-ship-it/creapd`, inspect the current branch head and Vercel status, and resume from the **Current Exact Next Action**. Do not modify `main`.
