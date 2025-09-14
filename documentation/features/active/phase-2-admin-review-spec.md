# Phase 2: Admin Review & Field-Level Feedback — Technical Specification

Document Name: Phase 2 Admin Review Spec  
Date: 2025-09-14  
Version: 1.0  
Status: Active

## Executive Summary
Build an admin review workflow that lets admins review host-submitted events, leave field-level feedback threads, request changes or approve, and maintain an audit trail. Hosts see feedback inline on their edit page, can reply, and receive in-app notifications when admins add feedback or change status.

## Architecture Overview
- Data: Convex tables for events, feedbackThreads, feedbackComments, auditLog, notifications, feedbackDrafts, and generic formDrafts.
- Admin UI:
  - Review Queue: list submitted/resubmitted events with filters and thread badges.  
    Code: [`app/dashboard/review/page.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/review/page.tsx)
  - Event Review: detail view with grouped fields and Feedback Drawer.  
    Code: [`app/dashboard/review/[id]/page.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/review/%5Bid%5D/page.tsx)
- Host UI:
  - Edit page surfaces feedback threads, allows replies, and autosaves drafts.  
    Code: [`app/dashboard/events/[id]/page.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/events/%5Bid%5D/page.tsx)
- Notifications: In-app notifications for feedback and status changes, surfaced via a host-only dropdown in the dashboard header with unread badge and list.  
  UI: [`app/dashboard/site-header.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/site-header.tsx)  
  Data: [`convex/notifications.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/notifications.ts)
- Autosave:
  - Generic drafts via `formDrafts` and `useFormDraft` for all long-lived forms.  
    Code: [`hooks/useFormDraft.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/hooks/useFormDraft.ts)
  - Feedback drafts via `feedbackDrafts` in the drawer.  
    Code: [`convex/feedbackDrafts.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/feedbackDrafts.ts)

## Implementation Phases
- Phase 2.1: Feedback Schema
  - Tables: feedbackThreads, feedbackComments, auditLog with indexes.  
    Code: [`convex/schema.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/schema.ts#L91-L117)
- Phase 2.2: Admin Review Queue
  - UI page with filters and badges; server query enriches host and thread counts.  
    Code: [`app/dashboard/review/page.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/review/page.tsx), [`convex/events.ts#getReviewQueue`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/events.ts#L368-L451)
- Phase 2.3: Event Detail Review + Feedback Drawer
  - Grouped fields, open threads on each field, drawer for reasons/message/history.  
    UI: [`components/review/ReviewField.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/components/review/ReviewField.tsx), [`components/review/FeedbackDrawer.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/components/review/FeedbackDrawer.tsx)
  - Convex: createThread, addComment, resolveThread, getThreadsByEvent, getAuditByEvent.  
    Code: [`convex/feedback.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/feedback.ts)
- Phase 2.4: Status Transitions + Notifications
  - `requestChanges`, `approve` mutations update status, audit, and create notifications.  
    Code: [`convex/events.ts`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/convex/events.ts#L491-L547)
- Phase 2.5: Host Visibility & Replies
  - Host event page shows open threads and allows replies; feedback badges near fields in edit form.  
    Code: [`app/dashboard/events/[id]/page.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/app/dashboard/events/%5Bid%5D/page.tsx), [`components/event-form/FeedbackBadge.tsx`](file:///Users/ray/workspace/htw-hackathon-2025-rayfernando/components/event-form/FeedbackBadge.tsx)
- Phase 2.6: Autosave
  - `useFormDraft` across admin/host forms; drawer autosaves feedback drafts to prevent loss on close.

## Testing & Verification
- Review queue lists submitted/resubmitted; filter persists (local draft) and loads quickly.
- Field feedback threads create, persist, and render; drawer resists accidental close and autosaves.
- Request changes transitions event to `changes_requested`; host notification is created.
- Host can reply to threads; admin sees updates in activity timeline.
- Audit timeline records feedback and status changes with actor/time.
- Notifications dropdown shows unread badge count for hosts, lists latest items, and marks items as read on click (navigates to event when applicable).

## Security Considerations
- Only admins can access `/dashboard/review` and perform admin mutations (`requestChanges`, `approve`, `createThread`, `resolveThread`).
- Hosts can view their events only and may comment on their own event threads.
- No secrets in client components; all sensitive writes via Convex mutations.
