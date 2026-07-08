# KAAE-008 — Acquisition Policies & Priority Rules

**Document Type:** Policy Specification
**Parent Document:** KAAE-001 (Knowledge & Asset Acquisition Engine)
**Status:** Canonical Implementation Specification
**Applies To:** All Production Profiles

---

# 1. Purpose

This specification defines the **Acquisition Policies & Priority Rules** — the governing logic that dictates how the KAAE selects, prioritizes, and acquires resources. Per KAAE-001 §3 (Prime Directive) and §17 (Canonical Rules), these policies ensure that the KAAE always prefers existing, free, and legally reusable resources over AI generation.

---

# 2. Core Principle

**AI generation is the last resort, not the default.**

The KAAE exists to minimize AI generation by maximizing the discovery and reuse of existing legally obtainable resources.

---

# 3. The Prime Directive

Per KAAE-001 §3, resources shall be prioritized using the following hierarchy:

```
Priority 1: Existing CREAPD Library
       ↓
Priority 2: Free APIs
       ↓
Priority 3: Public Domain Resources
       ↓
Priority 4: Open License Resources
       ↓
Priority 5: Producer Premium Sources
       ↓
Priority 6: AI Generation
```

**AI generation shall only be considered when all higher-priority sources have been exhausted.**

---

# 4. Priority Rules in Detail

### 4.1 Priority 1 — Existing CREAPD Library
- **When to check:** Always, first, before any external request
- **What it includes:** Any resource already in the Asset Registry with `is_active = true`
- **Action:** If a suitable match is found, use it. No external call is made.
- **Matching criteria:** Title similarity, keyword match, resource type match, license compatibility

### 4.2 Priority 2 — Free APIs
- **When to check:** After the library search returns no suitable results
- **What it includes:** Providers with `license_model = free` or `registration_requirements = none` or `free_registration`
- **Action:** Search free API providers for matching resources
- **Constraint:** Respect rate limits and provider health status

### 4.3 Priority 3 — Public Domain Resources
- **When to check:** After free APIs return no suitable results
- **What it includes:** Resources with `license = public_domain` from any provider
- **Action:** Search for public domain resources across all connected providers
- **Constraint:** Must verify public domain status before use

### 4.4 Priority 4 — Open License Resources
- **When to check:** After public domain search returns no suitable results
- **What it includes:** Resources with `license = creative_commons` (CC0, CC-BY, CC-BY-SA only), `mit`, `apache`, `bsd`, or `official_free_access`
- **Action:** Search for open-license resources
- **Constraint:** Must verify license and prepare attribution text

### 4.5 Priority 5 — Producer Premium Sources
- **When to check:** After open license search returns no suitable results
- **What it includes:** Commercial licenses, premium subscriptions, paid stock libraries
- **Action:** Search premium sources; require budget approval before acquisition
- **Constraint:** Cost must be within wallet balance; requires approval based on threshold

### 4.6 Priority 6 — AI Generation
- **When to check:** Only after ALL higher priorities have been exhausted
- **What it includes:** AI-generated images, voice, video, text
- **Action:** Trigger the appropriate AI generation worker (Image Worker, Voice Worker, etc.)
- **Constraint:** Must log that AI generation was used and why no existing resource was suitable

---

# 5. Acquisition Decision Flow

```
Resource Request (from AI Worker or Production Profile)
↓
Priority 1: Search Existing Library
├── MATCH → Return library asset (usage_count++)
└── NO MATCH ↓
↓
Priority 2: Search Free APIs
├── MATCH → Acquire, verify license, index, return
└── NO MATCH ↓
↓
Priority 3: Search Public Domain
├── MATCH → Acquire, verify license, index, return
└── NO MATCH ↓
↓
Priority 4: Search Open License
├── MATCH → Acquire, verify license, prepare attribution, index, return
└── NO MATCH ↓
↓
Priority 5: Search Premium Sources
├── MATCH → Check budget, get approval, acquire, verify license, index, return
└── NO MATCH or INSUFFICIENT BUDGET ↓
↓
Priority 6: AI Generation
└── Generate new resource, log justification, index, return
```

---

# 6. Worker Integration Rules

Per KAAE-001 §13, generation workers shall request assets from the KAAE before generating:

### 6.1 Image Worker
```
Image Worker needs an image
↓
KAAE: Search existing SVG → existing illustration → existing photo
├── FOUND → Return existing asset
└── NOT FOUND → Image Worker generates new image
```

### 6.2 Voice Worker
```
Voice Worker needs a voiceover
↓
KAAE: Search existing Voice Packages
├── FOUND (matching script + voice) → Return existing VP
└── NOT FOUND → Voice Worker generates new voiceover
```

### 6.3 Video Worker
```
Video Worker needs B-roll
↓
KAAE: Search existing B-roll → existing animation
├── FOUND → Return existing asset
└── NOT FOUND → Video Worker generates new video
```

---

# 7. Budget & Economic Policies

### 7.1 Wallet System
- The KAAE operates with a wallet balance for premium acquisitions
- Each premium resource has a cost
- Acquisitions are queued when budget is insufficient (per CAEPurchaseQueueItem)
- Queue items have a `savings_progress` that tracks progress toward affordability

### 7.2 Approval Thresholds
| Cost Range | Approval Required |
|---|---|
| $0 (free) | None — auto-approve |
| $0.01 - $5.00 | Auto-approved if within budget |
| $5.01 - $25.00 | Producer approval required |
| $25.01+ | Admin approval required |

### 7.3 Cost Optimization
- The KAAE shall always prefer free resources over paid resources
- When multiple paid sources are available, the KAAE selects the lowest-cost option that meets quality thresholds
- AI generation costs (integration credits) are factored into the comparison — if an existing paid resource is cheaper than AI generation, the paid resource is preferred

---

# 8. Quality Thresholds

Resources must meet minimum quality thresholds to be acquired:

### 8.1 Confidence Score Thresholds

| Resource Type | Minimum Confidence | Minimum QA Status |
|---|---|---|
| Knowledge (text) | 60 | `passed` |
| Images | 50 | `not_reviewed` (auto-preview) |
| SVG / Icons | 40 | `not_reviewed` |
| Video | 60 | `passed` |
| Audio | 55 | `passed` |
| Templates | 50 | `not_reviewed` |
| Fonts | 70 | `passed` |

### 8.2 Quality Override
Producers can override quality thresholds with justification. Overrides are logged.

---

# 9. Reuse Policies

### 9.1 Reuse Preference
- If a resource already in the library matches the request (even partially), it is preferred over acquiring a new one
- The KAAE shall track `usage_count` and surface frequently-used assets in recommendations
- Reuse has zero cost and zero licensing risk

### 9.2 Adaptation Policy
- If an existing resource is close but not perfect, the KAAE may suggest:
  - Using the existing resource with minor edits (if modification is allowed)
  - Using the existing resource as a reference for AI generation
  - Using the existing resource as-is with producer acknowledgment

---

# 10. Fallback Chain

When the preferred acquisition path fails, the KAAE follows a fallback chain:

```
Preferred provider fails
↓
Fallback to alternative provider in same category
↓
If no alternative → Move to next priority level
↓
If all priorities exhausted → AI generation
↓
If AI generation fails → Return "no resource available" to worker
↓
Worker handles gracefully (placeholder, default asset, etc.)
```

---

# 11. Logging & Audit

Every acquisition decision shall be logged with:

| Field | Description |
|---|---|
| `request_source` | Which worker or profile requested the resource |
| `request_query` | The search query or resource description |
| `priority_level_reached` | Which priority level ultimately provided the resource (1-6) |
| `providers_searched` | List of providers that were searched |
| `resources_found` | Count of resources found at each priority level |
| `selected_resource_id` | The registry ID of the selected resource |
| `acquisition_method` | `library_reuse`, `free_api`, `public_domain`, `open_license`, `premium_purchase`, `ai_generation` |
| `cost` | Cost of acquisition (0 for free) |
| `justification` | If AI generation was used, why no existing resource was suitable |
| `timestamp` | When the decision was made |

---

# 12. Relationship to Existing App Infrastructure

These policies map to the following existing app components:
- `CAEEngineConfig` entity — operational mode and economic controls
- `CAEPurchaseQueueItem` entity — premium acquisition queue with budget tracking
- `CAEBudgetTransaction` entity — wallet transaction history
- `CAECollectionGoal` entity — collection targeting
- `CAEOperationLog` entity — operational decision logging
- `runCAE` backend function — CAE execution with policy enforcement
- `developImageWorker` / `developVoiceWorker` / `developVideoWorker` functions — workers that request from KAAE
- `controllerDecisionEngine` function — decision routing

---

# 13. Canonical Rules

1. The Prime Directive hierarchy (library → free APIs → public domain → open license → premium → AI generation) shall always be followed.
2. AI generation shall only be used when all higher-priority sources have been exhausted.
3. Existing library resources shall always be checked first, before any external request.
4. Free resources shall always be preferred over paid resources.
5. When multiple paid sources exist, the lowest-cost option meeting quality thresholds shall be selected.
6. Premium acquisitions require budget approval based on cost thresholds.
7. Every acquisition decision shall be logged with full audit trail.
8. When AI generation is used, the justification for not using an existing resource shall be recorded.
9. The KAAE shall fall back gracefully through providers and priority levels without crashing.
10. Resource reuse shall be maximized to minimize costs and licensing risk.