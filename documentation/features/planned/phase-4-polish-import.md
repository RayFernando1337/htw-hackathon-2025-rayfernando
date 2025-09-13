# Phase 4: Polish, Ops, and Import

**Timeline: 2-3 days** | **Complexity: Medium** | **Priority: Medium**

## Overview

Finalize the MVP with performance tuning, operational readiness, and a lightweight import path to migrate (or seed) initial event data. Ensure the system is stable, observable, and easy to iterate on.

## Success Criteria

- [ ] Admin bulk actions work for common workflows
- [ ] Activity timeline visible per event (auditable)
- [ ] Key pages meet baseline performance budgets
- [ ] Error handling and empty states are covered
- [ ] Import script can load seed data for testing

## Technical Implementation

### 4.1 Activity Timeline (Audit Log UI)

- Add UI to render audit entries for an event with paging.
- Surface: action, actor, timestamp, optional fieldPath and reason.
- Links to related feedback threads when applicable.

Verification

- Create status transitions and feedback → entries appear in chronological order.
- Refresh browser → timeline persists, includes new actions in realtime.

### 4.2 Admin Bulk Actions

Common actions:

- Approve multiple resubmitted events
- Request changes to multiple submitted events with a shared note

Backend

- Add mutations `events.bulkApprove`, `events.bulkRequestChanges` taking `ids: Id<"events">[]` and optional `message`.
- Validate role: admin only. Validate allowed state transitions for each id. Write audit entries per event.

Frontend

- On review queue, add multi-select with sticky actions bar.
- Disable actions if no rows are selected.

Verification

- Select 2+ events and approve → statuses update; audit entries created.
- Select 2+ events and request changes → statuses update; notifications queued.

### 4.3 Performance Baselines

- Index hygiene: ensure all hot queries use `.withIndex(...)` per `convex_rules`.
- Paginate long lists: review queue and My Events should paginate (or infinite scroll) to avoid slow renders.
- Memoization: memo expensive derived state (e.g., checklist progress) with `useMemo`.
- Bundle: verify production build output is reasonable; avoid gigantic client bundles on dashboard pages.

Verification

- My Events and Review Queue render in < 1s with 100 events (seeded).
- Convex queries show no warnings for full scans in logs.

### 4.4 Error States & Empty States

- Add friendly empty states for: no events, no feedback threads, no audit entries.
- Centralize toasts for mutation errors; confirm retry paths on network failure.
- Guard routes by role; show NotAuthorized component where appropriate.

Verification

- Visit each page with no data → meaningful empty state.
- Force a mutation error (e.g., illegal transition) → user-friendly message.

### 4.5 Minimal Import/Seed Flow

Goal: Seed development or migrate a small CSV/JSON from Fillout export.

Format

- JSON lines or CSV with columns matching the MVP schema mapping in `@htw-event-platform-mvp-plan.md` (title, shortDescription, eventDate, venue, capacity, formats, isPublic, hasHostedBefore, targetAudience, planningDocUrl).

Backend

- Add internal action `internal.import.ingest` that:
  - Validates input rows and maps fields.
  - Inserts events as `draft` owned by a selected host (or a placeholder user) while setting `onCalendar=false` and default checklist.
  - Batches writes in chunks (e.g., 50) to keep transactions fast.

Admin UI (optional for MVP)

- CLI-only for now to reduce scope. Use Convex dashboard one-off function or `bunx convex run` to trigger.

Verification

- Provide a 5–10 row sample file, run import → rows appear as drafts for the target host.
- Invalid rows are skipped with an error report.

## Checklists

### Developer Readiness

- [ ] All queries use indexes; no `.filter(...)` on large tables
- [ ] Mutations include argument validators and role checks
- [ ] Audit log written for every status/field change
- [ ] Notifications are queued but non-blocking

### Operational Readiness

- [ ] Environment variables documented (`CLERK_WEBHOOK_SECRET`, admin emails)
- [ ] Basic monitoring via Convex dashboard (function latency, errors)
- [ ] Seed/import documented with sample file and command

## Verification Steps

### 1. Bulk Actions

```bash
# Seed 10 submitted events
# Select 5 in review queue → Bulk approve
# Confirm 5 become approved; audit entries present
```

### 2. Timeline

```bash
# On an event, perform: request changes, add feedback, approve
# Timeline displays 3+ entries in order with actor and timestamps
```

### 3. Import

```bash
# Prepare sample.jsonl with 5 rows
# Trigger internal import action with file contents
# Verify 5 draft events created and visible to assigned host
```

### 4. Performance

```bash
bun run build
# Ensure production build succeeds; inspect bundle sizes
# Test dashboards with 100 events → <1s initial render
```

## Dependencies

- Phases 0–3 complete
- Convex deployment configured

## Risks & Mitigations

- Risk: Import writes cause slow transactions → Mitigate by batching
- Risk: Bulk actions misapply transitions → Validate per-event state before patch
- Risk: Missing indexes → Pre-flight check all queries for `.withIndex(...)`
