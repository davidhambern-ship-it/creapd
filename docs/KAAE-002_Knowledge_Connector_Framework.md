# KAAE-002 — Knowledge Connector Framework

**Document Type:** Technical Implementation Specification
**Parent Document:** KAAE-001 (Knowledge & Asset Acquisition Engine)
**Status:** Canonical Implementation Specification
**Applies To:** All Production Profiles

---

# 1. Purpose

This specification defines the **Knowledge Connector Framework** — the standardized interface layer through which the KAAE communicates with all external providers. No KAAE subsystem, AI Worker, or Production Profile shall access an external provider directly. All external acquisition shall pass through a registered Knowledge Connector.

---

# 2. Core Principle

**Workers never touch providers. Connectors never make policy decisions.**

The connector is a pure transport and normalization layer. It handles the mechanics of communication and returns standardized results. The KAAE decides what to do with them.

---

# 3. Connector Responsibilities

Each Knowledge Connector shall manage:

| Responsibility | Description |
|---|---|
| Authentication | Manage API keys, OAuth tokens, or anonymous access |
| Rate Limiting | Respect provider rate limits; queue requests if necessary |
| Caching | Cache responses to minimize redundant calls |
| Retries | Retry failed requests with exponential backoff |
| Normalization | Convert provider-specific formats to KAAE standard format |
| Licensing | Attach license metadata to every returned resource |
| Error Handling | Return structured errors, not raw HTTP failures |
| Health Monitoring | Report health status to the Provider Health subsystem (KAAE-006) |

---

# 4. Connector Lifecycle

```
Registration → Configuration → Activation → Health Monitoring → Deactivation
```

### 4.1 Registration
A connector is registered with:
- Connector ID (unique slug)
- Display name
- Provider type (API, RSS, OAuth, scraping, public_download)
- Supported resource types
- Default authentication method
- Rate limit profile

### 4.2 Configuration
Runtime configuration includes:
- API key / OAuth credentials (stored in secrets)
- Base URL / endpoints
- Request timeout
- Cache TTL
- Retry policy

### 4.3 Activation
Once configured and verified, the connector is marked `active` and available to the KAAE discovery and acquisition pipeline.

---

# 5. Standard Connector Interface

Every connector shall implement the following interface:

### 5.1 `search(query, options)`
Search the provider for resources matching the query. Returns an array of normalized resource records.

### 5.2 `fetch(resource_id)`
Retrieve a specific resource by its provider-native identifier. Returns a full normalized resource record including content or download URL.

### 5.3 `download(resource_id)`
Download the binary content of a resource. Returns a file URL after storage.

### 5.4 `verify(resource_id)`
Re-check that a resource is still available and its license is still valid.

### 5.5 `health()`
Return the current health status of the connector and its underlying provider.

---

# 6. Normalization Standard

All connectors shall return resources in the following normalized format:

```json
{
  "title": "string",
  "description": "string",
  "resource_type": "knowledge | image | svg | icon | video | audio | dataset | template | font | map | chart",
  "format": "json | pdf | png | svg | mp4 | mp3 | ...",
  "source_url": "string",
  "provider": "string",
  "provider_resource_id": "string",
  "license": "public_domain | creative_commons | mit | apache | bsd | official_free | commercial | restricted | unknown",
  "license_url": "string | null",
  "commercial_use": true | false,
  "modification_allowed": true | false,
  "attribution_required": true | false,
  "preview_url": "string | null",
  "thumbnail_url": "string | null",
  "metadata": {},
  "retrieved_at": "ISO 8601 timestamp"
}
```

---

# 7. Default Connector Categories

Per KAAE-001 §8, the following connector categories shall be supported:

1. **Research Connectors** — academic databases, journals, archives
2. **News Connectors** — wire services, RSS feeds, news APIs
3. **Music Connectors** — artist metadata, album art, music libraries
4. **Image Connectors** — stock photos, public domain images, Creative Commons
5. **SVG Connectors** — icon libraries, illustration repositories
6. **Video Connectors** — stock footage, motion graphics, animations
7. **Audio Connectors** — sound effects, voice libraries, podcasts
8. **Maps Connectors** — geographic data, maps
9. **Statistics Connectors** — government data, economic indicators
10. **Government Connectors** — publications, legal documents, press releases
11. **Scientific Connectors** — research papers, datasets
12. **Presentation Asset Connectors** — templates, slide themes, component libraries

---

# 8. Error Handling

Connectors shall return structured errors:

```json
{
  "error_type": "auth_failure | rate_limit | not_found | timeout | license_blocked | provider_down | unknown",
  "message": "Human-readable description",
  "provider": "string",
  "retry_after_seconds": null | number
}
```

The KAAE shall not crash on connector errors. Failed connectors are marked degraded, and the pipeline continues with remaining providers.

---

# 9. Caching Strategy

| Cache Level | TTL | Purpose |
|---|---|---|
| Response cache | 1 hour | Avoid duplicate search calls |
| Resource cache | 24 hours | Avoid re-fetching the same resource |
| License cache | 7 days | License checks don't change frequently |
| Health cache | 5 minutes | Health status refresh interval |

---

# 10. Security Requirements

- No API keys shall be stored in code or entity fields
- All credentials shall be stored in platform secrets (Deno.env)
- Connectors shall never expose raw credentials to AI Workers
- All external requests shall use HTTPS
- Connectors shall validate response content types before processing

---

# 11. Relationship to Existing App Infrastructure

This framework maps to the following existing app components:
- `SMCSource` / `Source` entities → provider registration
- `SMCHandler` / `SMCParser` entities → connector normalization logic
- `SMCConnectionTest` → health check implementation
- `testSMCConnection` / `testSMCHandler` backend functions → connector verification
- `runSMCDiscovery` / `runSMCImport` / `runSMCMonitoring` → connector operations

---

# 12. Canonical Rules

1. No subsystem outside the KAAE shall communicate directly with an external provider.
2. Every connector shall normalize all responses to the standard format.
3. Every connector shall attach license metadata to every returned resource.
4. Connectors shall never make acquisition policy decisions.
5. Failed connectors shall degrade gracefully without crashing the KAAE.
6. All credentials shall be stored in platform secrets, never in code or entities.