# Phase 1: Host Event Submission

Status: Completed | Date: 2025-09-14

## Executive Summary

Implements host-driven event creation, draft editing with auto-save, and submission for review. Frontend uses a multi-step wizard with relaxed draft validation and strict submit-time validation. Backend enforces ownership and state-machine guards in Convex.

## Architecture Overview

- Frontend: Next.js App Router, React Hook Form + Zod, shadcn/ui, Sonner toasts
- Backend: Convex queries/mutations in `convex/events.ts`, Clerk auth, schema in `convex/schema.ts`
- Realtime: `useQuery` subscriptions keep event detail pages in sync

## Key Implementation Details

- Draft-friendly schema on edit and new pages; full `eventSchema` validated on submit
- Auto-save with debounce and visible status indicator
- Submit-time guard shows inline field errors and focuses first invalid field
- Status transitions: draft → submitted → approved → published; changes_requested → resubmitted supported

## Files

- `convex/events.ts` – createDraft, updateDraft, submitEvent, getMyEvents, getEventById, deleteEvent, getEventStats
- `lib/validations/event.ts` – `eventDraftSchema`, `eventEditSchema`, `eventSchema`, helpers
- `components/event-form/*` – field UI, steps, indicators
- `app/dashboard/events/new/page.tsx` – wizard flow
- `app/dashboard/events/[id]/page.tsx` – detail/edit + submit

## Testing & Verification

- Drafts save incrementally; Convex shows updated fields
- Submit prevents when required fields missing; UI errors displayed
- Status updates visible on dashboards; ownership enforced

## Security Considerations

- Clerk-authenticated mutations; ownership checks on every operation
- State machine prevents invalid transitions

## Notes

See the companion progress log for implementation details and next-phase preparation.
