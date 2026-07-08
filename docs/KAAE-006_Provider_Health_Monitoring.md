# KAAE-006 — Provider Health & Monitoring

**Document Type:** Operational Specification
**Parent Document:** KAAE-001 (Knowledge & Asset Acquisition Engine)
**Status:** Canonical Implementation Specification
**Applies To:** All Production Profiles

---

# 1. Purpose

This specification defines the **Provider Health & Monitoring** subsystem — responsible for tracking the operational status, reliability, and performance of all external providers and Knowledge Connectors. Per KAAE-001 §5 and §14, the KAAE shall maintain provider health and detect broken sources.

---

# 2. Core Principle

**Know before it breaks.**

The monitoring subsystem continuously evaluates provider health so the KAAE can proactively route around degraded or down providers without disrupting production.

---

# 3. Health Status Model

Every provider and connector shall have one of the following health statuses:

| Status | Description | Action |
|---|---|---|
| `healthy` | Operating normally | Full use |
| `degraded` | Experiencing issues (slow, intermittent errors) | Reduced use; warnings shown |
| `down` | Completely unavailable | No use; fallback to other providers |
| `unknown` | Not yet tested or recently registered | Limited use; pending verification |

---

# 4. Health Check Types

### 4.1 Connectivity Check
- Verifies the provider's API/website is reachable
- Measures response time
- Runs every 5 minutes (per KAAE-002 caching strategy)

### 4.2 Functional Check
- Sends a minimal search or fetch request
- Verifies the response is valid and non-empty
- Runs every 30 minutes

### 4.3 License Check
- Verifies license endpoints are still valid
- Detects license terms changes
- Runs every 7 days (per KAAE-004)

### 4.4 Content Check
- Verifies that previously discovered resources are still available
- Samples 5-10 resources per provider
- Runs daily

---

# 5. Metrics Tracked

### 5.1 Availability Metrics

| Metric | Description |
|---|---|
| `uptime_percentage` | Percentage of successful health checks over 30 days |
| `last_successful_check` | Timestamp of last successful health check |
| `last_failed_check` | Timestamp of last failed health check |
| `consecutive_failures` | Current count of consecutive failures |

### 5.2 Performance Metrics

| Metric | Description |
|---|---|
| `avg_response_time_ms` | Average response time over 24 hours |
| `p95_response_time_ms` | 95th percentile response time |
| `timeout_count` | Number of timeouts in 24 hours |

### 5.3 Quality Metrics

| Metric | Description |
|---|---|
| `import_success_rate` | Percentage of successful imports (0-100) |
| `broken_link_count` | Number of broken links detected |
| `total_resources_discovered` | Total resources discovered from this provider |
| `total_resources_imported` | Total resources successfully imported |
| `license_compatibility_rate` | Percentage of resources with compatible licenses |

---

# 6. Health Score Calculation

Each provider receives a composite health score (0-100):

```
Health Score = (
  (uptime_percentage * 0.30) +
  (import_success_rate * 0.25) +
  (license_compatibility_rate * 0.20) +
  (response_time_score * 0.15) +
  (broken_link_score * 0.10)
)
```

| Score Range | Status | Interpretation |
|---|---|---|
| 80-100 | `healthy` | Fully operational |
| 50-79 | `degraded` | Experiencing issues |
| 0-49 | `down` | Unavailable or critically impaired |

---

# 7. Alerting

### 7.1 Alert Triggers

| Trigger | Severity | Action |
|---|---|---|
| Provider goes from `healthy` to `down` | Critical | Immediate notification + fallback routing |
| Provider goes from `healthy` to `degraded` | Warning | Notification + reduced usage |
| Consecutive failures > 5 | Critical | Mark as `down` |
| Broken link count > 20% of sampled resources | Warning | Mark as `degraded` |
| License compatibility rate < 50% | Warning | Review provider suitability |
| Response time > 10s average | Warning | Mark as `degraded` |

### 7.2 Notification Channels
- In-app notification (AppNotification entity)
- Provider health dashboard (admin UI)
- Activity log entry (CAEActivityEvent entity)

---

# 8. Fallback & Routing

When a provider is degraded or down:

### 8.1 Automatic Fallback
- The KAAE automatically routes discovery requests to the next-best provider in the same category
- If no alternative provider exists, the KAAE falls through to the next priority in the acquisition hierarchy (KAAE-008)

### 8.2 Graceful Degradation
- Existing cached resources from the down provider remain available
- No new resources are fetched from the down provider
- Producers are informed via UI indicators
- Production is not halted — the pipeline continues with available providers

---

# 9. Provider Relationship Management

### 9.1 Relationship Status Tracking

| Status | Description |
|---|---|
| `discovered` | Provider found but not yet evaluated |
| `under_review` | Being evaluated for trust and compatibility |
| `verified` | Verified as trustworthy and compatible |
| `connected` | Fully connected with active credentials |
| `api_connected` | API integration active and functional |
| `import_enabled` | Actively importing resources |
| `metadata_only` | Only metadata is being collected |
| `license_negotiation` | In negotiation for commercial license |
| `inactive` | Temporarily disabled |
| `blocked` | Permanently blocked due to violations |

### 9.2 Follow-Up Tracking
Each provider has a `next_follow_up` date and `follow_up_reason` to ensure ongoing relationship management.

---

# 10. Monitoring Dashboard

The admin monitoring dashboard shall display:
- Real-time health status of all providers
- Health score trends (30-day graph)
- Recent alerts and incidents
- Broken link reports
- Import success/failure statistics
- Provider comparison table
- Recommended actions for degraded providers

---

# 11. Relationship to Existing App Infrastructure

This subsystem maps to the following existing app components:
- `CAESourceProvider` entity — provider registration with `api_health`, `website_status`, `import_success_rate`, `broken_link_count`
- `SMCConnectionTest` entity — connection test records
- `SMCMonitoringEvent` entity — monitoring events
- `testSMCConnection` / `testSMCHandler` backend functions — health check execution
- `runSMCMonitoring` backend function — continuous monitoring
- `CAESubsystemStatus` entity — subsystem health tracking

---

# 12. Canonical Rules

1. Every provider shall have a health status that is continuously monitored.
2. Health checks shall run at minimum every 5 minutes for connectivity and every 30 minutes for functionality.
3. Providers with 5+ consecutive failures shall be marked as `down`.
4. The KAAE shall automatically route around degraded or down providers.
5. Existing cached resources from down providers shall remain available.
6. All health metrics shall be visible on an admin monitoring dashboard.
7. Alerting shall notify on all critical status transitions.
8. Provider relationship status shall be tracked with follow-up dates for ongoing management.