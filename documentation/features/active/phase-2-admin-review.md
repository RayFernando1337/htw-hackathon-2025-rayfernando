# Phase 2: Admin Review & Field-Level Feedback (Active)

Status: In Progress → Functionally Complete (UI polish pending)

## Success Criteria
- [x] Review queue shows all pending events
- [x] Field-level feedback can be added
- [x] Feedback threads persist and display correctly
- [x] Request changes updates event status
- [x] Host receives notification of feedback
- [x] Audit log tracks all actions

## What’s Implemented

### Data model (Convex)
- Feedback threads, comments, and audit log with metadata
  - Tables and indexes in [`convex/schema.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/schema.ts#L91-L117)
- In-app notifications for hosts (feedback/status changes)
  - Schema in [`convex/schema.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/schema.ts#L146-L166)
  - APIs in [`convex/notifications.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/notifications.ts#L1-L35)

### Review Queue (Admin)
- Queue page with status filter and badges in [`app/dashboard/review/page.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/review/page.tsx#L19-L87)
- Backend query with enrichment in [`convex/events.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/events.ts#L368-L451)

### Event Review (Admin)
- Review detail page with grouped fields and per-field feedback in [`app/dashboard/review/[id]/page.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/review/%5Bid%5D/page.tsx#L75-L146)
- Field component highlighting threads in [`components/review/ReviewField.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/components/review/ReviewField.tsx#L1-L61)
- Feedback drawer with quick reasons, history, and autosave drafts in [`components/review/FeedbackDrawer.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/components/review/FeedbackDrawer.tsx#L55-L132)
- Audit timeline for actions in [`components/review/AuditTimeline.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/components/review/AuditTimeline.tsx#L1-L35)

### Convex Functions
- Feedback threads, comments, audit in [`convex/feedback.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/feedback.ts#L1-L230)
- Request changes and approve mutations (with notifications + audit) in [`convex/events.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/events.ts#L491-L547)

### Host-side UX
- Event edit page surfaces admin feedback threads and allows host replies in [`app/dashboard/events/[id]/page.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/events/%5Bid%5D/page.tsx#L332-L393)
- Drafts visible and editable via My Events in [`app/dashboard/events/page.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/events/page.tsx#L165-L186)

## Notifications
- On feedback thread creation and on status transitions, a notification is created for the host in [`convex/feedback.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/feedback.ts#L55-L79) and [`convex/events.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/events.ts#L491-L547).
- UI surfacing (dropdown/badge) can be added in Phase 3 polish; current acceptance considers notifications persisted server-side as received.

## Verification
- Review Queue: Navigate to `/dashboard/review` → filter persists (local draft) → submitted/resubmitted events listed.
- Field Feedback: Open any event → click Add Feedback on a field → quick reason + message → thread appears and persists.
- Request Changes: Trigger on the right-side actions → status updates to `changes_requested` and host notification is created.
- Thread Persistence: Refresh and re-open; comments/history remain. Host can reply from their event page.
- Audit Trail: Sidebar Activity Timeline shows actor, action, and timestamp.

## Open Polish Items
- Add notifications dropdown UI for hosts (badge + list) using [`convex/notifications.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/notifications.ts#L1-L35).
- Optional: mark feedback threads resolved from admin UI.
- Optional: inline field context preview inside the feedback drawer.

## Notes
- Autosave conventions documented in [AGENTS.md](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/AGENTS.md#L15-L25); feedback drafts are persisted via [`convex/feedbackDrafts.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/feedbackDrafts.ts#L1-L53).
