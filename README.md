# HTW Event Platform MVP Plan

## Problem → Outcome

**Problem:** Community event hosts struggle to plan and execute great events. Staff waste time on fragmented review processes across Fillout, email, text, Google Docs, and Lu.ma.

**Outcome:**

- Single source of truth for event submission → review → approval
- Field-level feedback that eliminates ambiguous email threads
- Guided checklists that prevent hosts from missing critical steps

**Success Signals:**

- Submission → decision time: Days → Hours
- Complete submissions: 60% → 90%
- Review cycles: 3-4 → 1-2

---

## Core Principle: Replace the Workflow, Not the Tools

**What we're replacing:**

- Email/text for review communication → In-app field-level feedback
- Google Docs for static guidance → Dynamic checklists by event type
- Mental tracking of status → Explicit state machine with notifications

**What stays (for now):**

- Lu.ma for public calendar (we store the URL)
- Fillout can continue (we'll import later)
- Existing venue/vendor relationships

---

## Users & Permissions

| Role      | Can Do                                                             | Cannot Do                                                   |
| --------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Host**  | Create/edit own drafts, submit, respond to feedback, add Lu.ma URL | Edit after submit (until changes requested), approve events |
| **Admin** | Review all events, request changes, approve, mark published        | Edit host's content directly                                |

---

## State Machine

```
┌──────┐      submit       ┌───────────┐     request      ┌─────────────────┐
│ DRAFT├──────────────────>│ SUBMITTED ├────changes──────>│ CHANGES_REQUESTED│
└──────┘                   └─────┬─────┘                  └────────┬────────┘
                                 │                                  │resubmit
                                 │approve                           ▼
                           ┌─────▼─────┐                    ┌──────────────┐
                           │ APPROVED  │<───────────────────│ RESUBMITTED  │
                           └─────┬─────┘      approve       └──────────────┘
                                 │add Lu.ma URL
                           ┌─────▼──────┐
                           │ PUBLISHED  │
                           └────────────┘
```

**Transition Rules:**

- Only hosts can: submit, resubmit, add Lu.ma URL
- Only admins can: request changes, approve, mark published
- Submitted events are locked from host edits until changes requested

---

## Database Schema (Convex)

```typescript
// User profile extends Clerk auth
export const userProfiles = defineTable({
  clerkUserId: v.string(),
  role: v.union(v.literal("host"), v.literal("admin")),
  orgName: v.optional(v.string()),
  website: v.optional(v.string()),
  socials: v.optional(v.object({
    linkedin: v.optional(v.string()),
    x: v.optional(v.string()),
    instagram: v.optional(v.string()),
  })),
});

// Events with field mapping from Fillout
export const events = defineTable({
  // Ownership
  hostId: v.id("userProfiles"),

  // Status machine
  status: v.union(
    v.literal("draft"),
    v.literal("submitted"),
    v.literal("changes_requested"),
    v.literal("resubmitted"),
    v.literal("approved"),
    v.literal("published")
  ),

  // Fillout field mappings
  title: v.string(),                    // "What is your event title?"
  shortDescription: v.string(),         // "Please provide a short description"
  eventDate: v.string(),                 // "What day and time are you planning?"
  venue: v.string(),                     // "What venue are you planning?"
  capacity: v.number(),                  // "What is your target event capacity?"
  formats: v.array(v.string()),         // "What is the format?" (max 3)
  isPublic: v.boolean(),                // "Public or private event?"
  hasHostedBefore: v.boolean(),         // "Have you hosted similar events?"
  targetAudience: v.string(),           // "Who is your targeted audience?"
  planningDocUrl: v.optional(v.string()), // "Link to Planning Docs"

  // Post-approval fields
  lumaUrl: v.optional(v.string()),
  onCalendar: v.boolean(),

  // Agreement & metadata
  agreementAcceptedAt: v.optional(v.number()),
  submittedAt: v.optional(v.number()),
  approvedAt: v.optional(v.number()),

  // Checklist
  checklistTemplate: v.string(), // 'panel' | 'mixer' | 'workshop' etc
  checklist: v.array(v.object({
    id: v.string(),
    task: v.string(),
    completed: v.boolean(),
    dueDate: v.optional(v.string()),
    section: v.string(), // 'planning' | 'marketing' | 'logistics'
  })),
});

// Field-anchored feedback threads
export const feedbackThreads = defineTable({
  eventId: v.id("events"),
  fieldPath: v.string(), // e.g., "shortDescription", "venue", "eventDate"
  openedBy: v.id("userProfiles"),
  status: v.union(v.literal("open"), v.literal("resolved")),
  reason: v.optional(v.string()), // Quick reason: "needs_clarity", "date_conflict", etc
});

export const feedbackComments = defineTable({
  threadId: v.id("feedbackThreads"),
  authorId: v.id("userProfiles"),
  message: v.string(),
  createdAt: v.number(),
});

// Audit log for state changes
export const auditLog = defineTable({
  eventId: v.id("events"),
  actorId: v.id("userProfiles"),
  action: v.string(), // 'status_change', 'field_update', etc
  fromValue: v.optional(v.any()),
  toValue: v.optional(v.any()),
  timestamp: v.number(),
});

// Indexes
.index("by_host", ["hostId"])
.index("by_status", ["status"])
.index("by_date", ["eventDate"])
.index("by_field_thread", ["eventId", "fieldPath"])
```

---

## Field Mapping (Fillout → Database)

| Fillout Form Field | Database Field        | Validation             | Helper Text                               |
| ------------------ | --------------------- | ---------------------- | ----------------------------------------- |
| Event title        | `title`               | Required, 100 char     | "Be compelling and clear"                 |
| Short description  | `shortDescription`    | Required, 500 char     | "Include speakers, what makes it special" |
| Day and time       | `eventDate`           | Required, date picker  | "Check calendar for conflicts"            |
| Venue              | `venue`               | Required               | "Your office or see venue list"           |
| Target capacity    | `capacity`            | Required, number       | "Set 20-30% above actual"                 |
| Format (≤3)        | `formats[]`           | Required, multi-select | "Panel, Mixer, Workshop, etc"             |
| Public/Private     | `isPublic`            | Required, boolean      | "Public = open registration"              |
| Hosted before?     | `hasHostedBefore`     | Required, boolean      | "Helps us provide right guidance"         |
| Target audience    | `targetAudience`      | Required               | "B2B founders, engineers, etc"            |
| Planning doc       | `planningDocUrl`      | Optional, URL          | "Google Doc or similar"                   |
| Host Agreement     | `agreementAcceptedAt` | Required checkbox      | "I accept the terms"                      |

---

## Collision Detection (MVP)

```typescript
// When host selects date/time, run:
function detectCollisions(proposedDate: Date, audience: string) {
  const twoHoursBefore = proposedDate - 2 * HOUR;
  const twoHoursAfter = proposedDate + 2 * HOUR;

  const overlapping = events
    .where("eventDate", ">=", twoHoursBefore)
    .where("eventDate", "<=", twoHoursAfter)
    .where("status", "in", ["approved", "published"]);

  // Flag if same audience or format
  return overlapping.filter(
    (event) =>
      event.targetAudience.includes(audience) ||
      event.formats.some((f) => proposedFormats.includes(f))
  );
}
// Show as warning, not blocking: "⚠️ Potential conflict with [Event Name]"
```

---

## Build Phases

### Phase 0: Foundation

**Goal:** Auth + role-based routing works

- [ ] Next.js + Tailwind v4 + shadcn setup
- [ ] Clerk auth with role detection
- [ ] Convex schema + initial migrations
- [ ] Layout shells (Host vs Admin nav)

**Acceptance:** User can sign in, correct dashboard loads based on role

### Phase 1: Host Submission

**Goal:** Complete submission flow with field validation

- [ ] Multi-step form wizard (matches Fillout fields exactly)
- [ ] Autosave to draft on every change
- [ ] Submit action (locks record, changes status)
- [ ] "My Events" list with status badges

**Acceptance:** Host can create, save, and submit event; form locks after submit

### Phase 2: Admin Review + Feedback

**Goal:** Field-level feedback loop works

- [ ] Review queue with filters (status, date range)
- [ ] Event detail view with sectioned layout
- [ ] Field-anchored comment threads (drawer UI)
- [ ] Request changes action (with quick reasons)
- [ ] Approve action (status change + notification)

**Acceptance:** Admin requests changes on venue field → Host sees feedback on that field → Host updates and resubmits → Admin approves

### Phase 3: Publishing + Checklists

**Goal:** Approved events get published with checklist completion

- [ ] Lu.ma URL field (unlocked after approval)
- [ ] Dynamic checklist by event type
- [ ] Collision warnings on date selection
- [ ] "Mark Published" admin action
- [ ] Email notifications (Resend using Convex componnets https://www.convex.dev/components/resend has getting started guide)

**Acceptance:** Approved event → Host adds Lu.ma URL → Admin marks published → Shows in public list

### Phase 4: Polish + Import

**Goal:** Production-ready with data migration

- [ ] Bulk actions for admin
- [ ] Activity timeline per event
- [ ] Performance optimization

---

## Pages & Routes

```
/
├── (host)
│   ├── events
│   │   ├── page.tsx          [My Events list]
│   │   └── [id]
│   │       ├── page.tsx      [Event wizard]
│   │       └── checklist
├── (admin)
│   ├── review
│   │   ├── page.tsx          [Review queue]
│   │   └── [id]
│   │       └── page.tsx      [Detail + feedback]
│   └── calendar              [Read-only grid view]
└── settings                  [Profile + socials]
```

---

## Component Architecture

```typescript
// Field with feedback indicator
<FormField name="venue">
  <Input />
  {hasThread && <CommentIndicator count={3} status="open" />}
</FormField>

// Feedback drawer (admin)
<FeedbackDrawer
  eventId={eventId}
  fieldPath="venue"
  onResolve={handleResolve}
/>

// Status badge with state machine awareness
<StatusBadge
  status={event.status}
  allowedTransitions={['approve', 'request_changes']}
/>
```

---

## Acceptance Test Scenarios

1. **Happy Path:** Draft → Submit → Approve → Publish
2. **Feedback Loop:** Submit → Changes Requested (venue) → Edit → Resubmit → Approve
3. **Collision Warning:** Two AI panels at 6pm → Warning shown → Host proceeds anyway
4. **Permission Check:** Host A cannot see Host B's draft
5. **State Lock:** Submitted event cannot be edited by host
6. **Agreement Required:** Submit blocked without checkbox
7. **Lu.ma Integration:** Approved → Add URL → Published

---

## Non-Goals (Explicitly Out of Scope)

- Full Lu.ma API integration (just store URL)
- Payment processing
- Attendee registration
- Post-event analytics
- AI content generation
- Mobile app
- Venue booking system

---

## Open Questions (Won't Block MVP)

1. Should "Published" be automatic when Lu.ma URL is added?

- The Staff will manually mark as published for the MVP

2. Do we need co-host invites in MVP?

- Not in scope for the MVP

3. Should collision warnings block submission?

- Not in scope for the MVP

---

## Migration Strategy

Since Fillout continues to run:

1. Build and test with new submissions

---

## Why This Architecture Wins

1. **Field-level feedback** eliminates "which part?" confusion
2. **State machine** prevents illegal transitions and confusion
3. **Exact Fillout parity** means zero learning curve for staff
4. **Convex reactivity** means no refresh buttons, ever
5. **Phased delivery** ships value in Day 5, not Day 30

---

## Instructions for AI Builder

1. Start with Phase 0 - get auth working with role detection
2. Build Phase 1 completely before moving on (no half-built features)
3. Use the exact field names from the Field Mapping table
4. Implement the state machine transitions as server-side guards
5. For each phase, run the acceptance test before proceeding
6. Keep components small - one file, one responsibility
7. Use Convex subscriptions for all real-time updates

The schema, field mappings, and state machine above are your single source of truth. When in doubt, match the Fillout form exactly.
