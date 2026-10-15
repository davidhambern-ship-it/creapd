# CREAPD Backend Migration

## Priority

Backend independence is Priority #1. New CREAPD business logic must not be added to Base44 backend functions.

## Confirmed blocker

The Base44 JavaScript SDK documents service-role access (`asServiceRole`) as available only inside Base44-hosted backend functions. External backends can use normal SDK access, but cannot use Base44 service-role permissions.

Because many CREAPD functions depend on `asServiceRole`, Vercel cannot become a full replacement execution layer while Base44 remains the sole privileged data layer.

## Target architecture

```text
creapd.com
    |
    +-- React/Vite frontend (Vercel)
    |
    +-- /api/creapd/* (Vercel Functions)
            |
            +-- Postgres (Neon)
            +-- CREAPD auth/session layer
            +-- AI/provider integrations
            +-- workers / orchestration / exports

Temporary only:
/api/* unmatched CREAPD routes -> Base44 proxy
```

## Migration phases

### Phase 0 — Vercel backend foundation

- [x] Reserve `/api/creapd/*` for CREAPD-owned Vercel Functions.
- [x] Add `/api/creapd/health`.
- [x] Add server-only database connection helper.
- [x] Add `/api/creapd/db-health`.
- [ ] Provision Postgres and set `DATABASE_URL` in Vercel.
- [ ] Confirm database health endpoint returns 200.

### Phase 1 — Database and identity

- [ ] Create CREAPD Postgres schema.
- [ ] Establish migration tracking.
- [ ] Establish CREAPD-owned authentication/session model.
- [ ] Create server authorization helpers (`requireUser`, `requireAdmin`).
- [ ] Stop creating new Base44 entities.

### Phase 2 — Data migration

- [ ] Inventory every Base44 entity and access rule.
- [ ] Convert entity definitions to Postgres tables.
- [ ] Export Base44 records.
- [ ] Import into Postgres with original IDs retained where practical.
- [ ] Validate counts, relationships, and required fields.

### Phase 3 — CREAPD API layer

- [ ] Add a frontend API client for `/api/creapd/*`.
- [ ] Move CRUD operations behind Vercel APIs.
- [ ] Replace direct Base44 entity calls incrementally.
- [ ] Add consistent error, auth, logging, and request ID handling.

### Phase 4 — Port business logic

Port by dependency/impact rather than alphabetically.

1. Research / RPP pipeline
2. Production package builders (Talk, Cooking, Cosmo, Music, News, Research, Spiritual, Sports)
3. Packet assembly / QA / export
4. Presentation generation
5. Media / voice / image / video workers
6. CAE / KAAE / SMC system workers
7. Admin utilities and maintenance jobs

Each migrated function must:

- run from `/api/creapd/*` or a CREAPD worker;
- use server-only secrets;
- read/write Postgres rather than Base44 service role;
- have explicit authentication/authorization;
- return structured errors;
- be observable in Vercel logs;
- include cancellation/idempotency where long-running work requires it.

### Phase 5 — Frontend cutover

- [ ] Remove `base44.functions.invoke(...)` calls.
- [ ] Remove direct Base44 entity dependencies page by page.
- [ ] Remove Base44 auth dependency.
- [ ] Remove the Base44 `/api/*` fallback proxy.

### Phase 6 — Base44 retirement

- [ ] Verify no production traffic depends on Base44.
- [ ] Archive final Base44 data export.
- [ ] Remove Base44 SDK and Vite plugin.
- [ ] Remove Base44 environment variables and DNS/auth compatibility settings.

## Rule during migration

Base44 is a legacy compatibility dependency only. If a feature requires new privileged backend behavior, implement it in the CREAPD backend rather than adding another Base44 function.
