# KAAE-004 — Licensing & Rights Engine

**Document Type:** Functional Specification
**Parent Document:** KAAE-001 (Knowledge & Asset Acquisition Engine)
**Status:** Canonical Implementation Specification
**Applies To:** All Production Profiles

---

# 1. Purpose

This specification defines the **Licensing & Rights Engine** — the subsystem responsible for classifying, verifying, and enforcing licensing compliance for every resource that enters the CREAPD production pipeline. Per KAAE-001 §11, resources with incompatible licensing shall never enter the production pipeline.

---

# 2. Core Principle

**No resource enters production without a verified license.**

The Licensing Engine is a hard gatekeeper. If the license cannot be determined or is incompatible, the resource is blocked — regardless of quality, relevance, or cost.

---

# 3. License Classifications

Per KAAE-001 §11, every resource shall receive one of the following license classifications:

| License | Commercial Use | Modification | Redistribution | Attribution |
|---|---|---|---|---|
| `public_domain` | ✅ | ✅ | ✅ | ❌ |
| `creative_commons` | Varies | Varies | Varies | ✅ |
| `mit` | ✅ | ✅ | ✅ | ✅ |
| `apache` | ✅ | ✅ | ✅ | ✅ |
| `bsd` | ✅ | ✅ | ✅ | ✅ |
| `official_free_access` | ✅ | Varies | Varies | Varies |
| `commercial_license` | ✅ | Varies | ❌ | Varies |
| `premium_subscription` | ✅ | Varies | ❌ | Varies |
| `restricted` | ❌ | ❌ | ❌ | Varies |
| `unknown` | ❌ | ❌ | ❌ | ❌ |
| `rejected` | ❌ | ❌ | ❌ | ❌ |

---

# 4. License Verification Pipeline

```
Resource Discovered
↓
License Detection (auto-detect from provider metadata)
↓
License Classification (assign one of the 11 classifications)
↓
Compliance Check (verify against CREAPD usage policy)
↓
Decision: PASS → enter pipeline | BLOCK → reject and log
```

### 4.1 License Detection
The engine shall attempt to detect the license from:
- Provider-provided license metadata
- License URL on the resource page
- Creative Commons embedded metadata
- Provider terms of service
- Manual producer override

### 4.2 License Classification
Based on detected metadata, the engine assigns one of the 11 classifications. If the license cannot be determined, the classification is `unknown` and the resource is blocked.

### 4.3 Compliance Check
The engine verifies that the license permits:
- Commercial use (CREAPD is a commercial platform)
- Modification (if the production requires editing)
- Redistribution (if the asset will be published)

### 4.4 Decision
- **PASS** — The resource enters the asset registry and production pipeline
- **BLOCK** — The resource is rejected and logged with the reason

---

# 5. Creative Commons Sub-Classification

Creative Commons licenses have multiple variants that must be resolved:

| CC Variant | Commercial Use | Modification |
|---|---|---|
| CC0 (Public Domain Dedication) | ✅ | ✅ |
| CC-BY | ✅ | ✅ |
| CC-BY-SA | ✅ | ✅ (must share alike) |
| CC-BY-ND | ✅ | ❌ |
| CC-BY-NC | ❌ | ✅ |
| CC-BY-NC-SA | ❌ | ✅ (must share alike) |
| CC-BY-NC-ND | ❌ | ❌ |

Only CC0, CC-BY, and CC-BY-SA are compatible with CREAPD's default commercial production pipeline. All NC (NonCommercial) variants are blocked by default.

---

# 6. Attribution Management

For resources requiring attribution:

### 6.1 Attribution Text Storage
The engine shall store a properly formatted attribution string for each resource:
```
"Title" by Author — License — Source URL
```

### 6.2 Attribution Injection
Attribution text shall be automatically included in:
- Presentation closing credits
- Export metadata
- Production package documentation

### 6.3 Attribution Verification
The engine shall verify that required attributions are present before any export or publication.

---

# 7. License Monitoring

Licenses can change over time. The engine shall:

- **Re-verify licenses on a 7-day cycle** (per KAAE-002 caching strategy)
- **Detect license downgrades** (e.g., a resource that was CC-BY is now CC-BY-NC)
- **Flag affected productions** if a license changes to incompatible
- **Auto-block resources** whose licenses become incompatible

---

# 8. License Override Protocol

In rare cases, the producer may need to override a license classification:

### 8.1 Producer Override
- Producer provides written justification
- Override is logged with producer ID, timestamp, and reason
- Override does not apply to `restricted` or `rejected` licenses
- Override requires admin approval

### 8.2 Override Audit Trail
All overrides shall be recorded in an audit log with:
- Original license classification
- New license classification
- Producer ID
- Justification
- Admin approver ID
- Timestamp

---

# 9. Integration with Acquisition Pipeline

```
Connector returns resource
↓
Licensing Engine classifies license
↓
Licensing Engine runs compliance check
↓
PASS → Resource enters Asset Registry (KAAE-003)
↓
BLOCK → Resource is rejected
         ↓
         Logged in Licensing Issue tracker
```

---

# 10. Relationship to Existing App Infrastructure

This engine maps to the following existing app components:
- `LicensingIssue` entity — tracks licensing problems
- `SMCLicenseRecord` entity — stores license records
- License fields on `CAEDiscovery` and `ImageAsset` entities
- `controllerDecisionEngine` function — can escalate licensing issues

---

# 11. Canonical Rules

1. No resource without a verified license shall enter the production pipeline.
2. Resources with `unknown` licenses shall be blocked by default.
3. Creative Commons NC (NonCommercial) variants shall be blocked by default.
4. License re-verification shall occur on a 7-day cycle.
5. License downgrades shall flag affected productions.
6. All license overrides shall be logged with full audit trail.
7. Attribution text shall be automatically included in all exports and publications.
8. The Licensing Engine shall be a hard gatekeeper — no bypass is permitted without producer override + admin approval.