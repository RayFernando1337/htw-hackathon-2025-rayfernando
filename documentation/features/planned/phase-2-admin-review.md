# Phase 2: Admin Review & Field-Level Feedback (Moved)

This planned spec has moved to the Active section following the documentation standards.

- Active Spec: `documentation/features/active/phase-2-admin-review-spec.md`
- Progress: `documentation/features/active/phase-2-admin-review-progress.md`

Below is the original planning content for historical reference.

# Phase 2: Admin Review & Field-Level Feedback

**Timeline: 3-4 days** | **Complexity: High** | **Priority: Critical**

## Overview
Implement the admin review system with field-level feedback, enabling precise communication between admins and hosts. This phase eliminates ambiguous email threads by anchoring feedback to specific fields.

## Success Criteria
- [x] Review queue shows all pending events
- [x] Field-level feedback can be added
- [x] Feedback threads persist and display correctly
- [x] Request changes updates event status
- [ ] Host receives notification of feedback
- [x] Audit log tracks all actions

## Technical Implementation

### 2.1 Feedback Schema

```typescript
// convex/schema.ts - Add feedback tables
feedbackThreads: defineTable({
  eventId: v.id("events"),
  fieldPath: v.string(), // "shortDescription", "venue", etc
  openedBy: v.id("users"),
  status: v.union(v.literal("open"), v.literal("resolved")),
  reason: v.optional(v.string()), // Quick reasons
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
})
.index("byEvent", ["eventId"])
.index("byEventAndField", ["eventId", "fieldPath"])
.index("byStatus", ["status"]),

feedbackComments: defineTable({
  threadId: v.id("feedbackThreads"),
  authorId: v.id("users"),
  message: v.string(),
  createdAt: v.number(),
})
.index("byThread", ["threadId"]),

auditLog: defineTable({
  eventId: v.id("events"),
  actorId: v.id("users"),
  action: v.string(), // "status_change", "field_update", etc
  fromValue: v.optional(v.any()),
  toValue: v.optional(v.any()),
  metadata: v.optional(v.object({
    fieldPath: v.optional(v.string()),
    reason: v.optional(v.string()),
  })),
  timestamp: v.number(),
})
.index("byEvent", ["eventId"])
.index("byActor", ["actorId"]),
```

### 2.2 Admin Review Queue

```typescript
// app/dashboard/review/page.tsx
export default function ReviewQueuePage() {
  const [filter, setFilter] = useState<ReviewFilter>({
    status: ["submitted", "resubmitted"],
    dateRange: "all",
  });

  const events = useQuery(api.events.getReviewQueue, filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <div className="flex gap-2">
          <Select value={filter.status} onValueChange={(v) => setFilter({...filter, status: v})}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pending</SelectItem>
              <SelectItem value="submitted">New Submissions</SelectItem>
              <SelectItem value="resubmitted">Resubmitted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {events?.map(event => (
          <Card key={event._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{event.title}</CardTitle>
                  <CardDescription>
                    Submitted by {event.host.name} • {formatDistanceToNow(event.submittedAt)} ago
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {event.hasOpenThreads && (
                    <Badge variant="outline" className="bg-yellow-50">
                      <MessageSquare className="mr-1 h-3 w-3" />
                      {event.openThreadCount} feedback
                    </Badge>
                  )}
                  <Badge>{event.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">{event.shortDescription}</p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>📅 {format(new Date(event.eventDate), 'PPP')}</span>
                  <span>📍 {event.venue}</span>
                  <span>👥 {event.capacity} people</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href={`/dashboard/review/${event._id}`}>
                  Review Event
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 2.3 Event Detail Review Page

```typescript
// app/dashboard/review/[id]/page.tsx
export default function ReviewEventPage({ params }: { params: { id: string } }) {
  const event = useQuery(api.events.getForReview, { id: params.id as Id<"events"> });
  const threads = useQuery(api.feedback.getThreadsByEvent, { eventId: params.id as Id<"events"> });
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const requestChanges = useMutation(api.events.requestChanges);
  const approveEvent = useMutation(api.events.approve);

  const FIELD_GROUPS = [
    {
      title: "Basic Information",
      fields: [
        { key: "title", label: "Event Title", required: true },
        { key: "shortDescription", label: "Description", required: true },
      ]
    },
    {
      title: "Logistics",
      fields: [
        { key: "eventDate", label: "Date & Time", required: true },
        { key: "venue", label: "Venue", required: true },
        { key: "capacity", label: "Capacity", required: true },
      ]
    },
    {
      title: "Audience & Format",
      fields: [
        { key: "formats", label: "Event Formats", required: true },
        { key: "targetAudience", label: "Target Audience", required: true },
        { key: "isPublic", label: "Public Event", required: true },
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6">
      {/* Main Content - 2 columns */}
      <div className="col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{event?.title}</CardTitle>
                <CardDescription>
                  Submitted by {event?.host.name} • {event?.host.orgName}
                </CardDescription>
              </div>
              <Badge>{event?.status}</Badge>
            </div>
          </CardHeader>
        </Card>

        {FIELD_GROUPS.map(group => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="text-lg">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.fields.map(field => (
                <ReviewField
                  key={field.key}
                  field={field}
                  value={event?.[field.key]}
                  thread={threads?.find(t => t.fieldPath === field.key)}
                  onFeedback={() => setSelectedField(field.key)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sidebar - 1 column */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              variant="default"
              onClick={() => approveEvent({ id: event._id })}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Event
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setSelectedField("_request_changes")}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Request Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditTimeline eventId={event?._id} />
          </CardContent>
        </Card>
      </div>

      {/* Feedback Drawer */}
      <FeedbackDrawer
        open={!!selectedField}
        onClose={() => setSelectedField(null)}
        eventId={event?._id}
        fieldPath={selectedField}
        onSubmit={async (message, reason) => {
          if (selectedField === "_request_changes") {
            await requestChanges({
              id: event._id,
              message,
              fieldsWithIssues: threads?.filter(t => t.status === "open").map(t => t.fieldPath)
            });
          } else {
            // Create/update feedback thread
          }
          setSelectedField(null);
        }}
      />
    </div>
  );
}
```

### 2.4 Field-Level Feedback Component

```typescript
// components/review/review-field.tsx
export function ReviewField({
  field,
  value,
  thread,
  onFeedback
}: ReviewFieldProps) {
  const hasIssue = thread?.status === "open";

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-colors",
      hasIssue && "border-yellow-500 bg-yellow-50/50"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="mt-1">
            {renderFieldValue(field, value)}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {hasIssue && (
            <Badge variant="outline" className="bg-yellow-100">
              <AlertCircle className="mr-1 h-3 w-3" />
              Needs revision
            </Badge>
          )}
          <Button
            size="sm"
            variant={hasIssue ? "default" : "ghost"}
            onClick={onFeedback}
          >
            <MessageSquare className="h-4 w-4" />
            {hasIssue ? `${thread.commentCount}` : ""}
          </Button>
        </div>
      </div>

      {hasIssue && thread.latestComment && (
        <div className="mt-3 p-3 bg-white rounded border border-yellow-200">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{thread.latestComment.author}:</span>{" "}
            {thread.latestComment.message}
          </p>
        </div>
      )}
    </div>
  );
}
```

### 2.5 Feedback Drawer Component

```typescript
// components/review/feedback-drawer.tsx
export function FeedbackDrawer({
  open,
  onClose,
  eventId,
  fieldPath,
  onSubmit
}: FeedbackDrawerProps) {
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState<string>("");

  const thread = useQuery(
    api.feedback.getThread,
    fieldPath ? { eventId, fieldPath } : "skip"
  );

  const QUICK_REASONS = {
    "needs_clarity": "Needs more clarity",
    "incorrect_format": "Incorrect format",
    "missing_info": "Missing information",
    "date_conflict": "Date conflict",
    "venue_issue": "Venue issue",
    "capacity_concern": "Capacity concern",
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>
            {fieldPath === "_request_changes"
              ? "Request Changes"
              : `Feedback on ${fieldPath}`}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Quick reason selector */}
          <div>
            <Label>Quick Reason (Optional)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(QUICK_REASONS).map(([key, label]) => (
                <Button
                  key={key}
                  variant={reason === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReason(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Message input */}
          <div>
            <Label>Feedback Message</Label>
            <Textarea
              className="mt-2"
              placeholder="Provide specific feedback for the host..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {/* Previous comments */}
          {thread?.comments && thread.comments.length > 0 && (
            <div>
              <Label>Previous Feedback</Label>
              <ScrollArea className="h-[200px] mt-2 p-3 border rounded">
                {thread.comments.map(comment => (
                  <div key={comment._id} className="mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{comment.author.name}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(comment.createdAt)} ago
                      </span>
                    </div>
                    <p className="text-sm mt-1">{comment.message}</p>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => onSubmit(message, reason)}
              disabled={!message.trim()}
            >
              Send Feedback
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 2.6 Convex Functions for Review

```typescript
// convex/feedback.ts
export const createThread = mutation({
  args: {
    eventId: v.id("events"),
    fieldPath: v.string(),
    message: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getUserByClerkId(ctx, identity.subject);
    if (user.role !== "admin") throw new Error("Unauthorized");

    // Create thread
    const threadId = await ctx.db.insert("feedbackThreads", {
      eventId: args.eventId,
      fieldPath: args.fieldPath,
      openedBy: user._id,
      status: "open",
      reason: args.reason,
      createdAt: Date.now(),
    });

    // Add first comment
    await ctx.db.insert("feedbackComments", {
      threadId,
      authorId: user._id,
      message: args.message,
      createdAt: Date.now(),
    });

    // Log action
    await logAction(ctx, {
      eventId: args.eventId,
      actorId: user._id,
      action: "feedback_added",
      metadata: { fieldPath: args.fieldPath },
    });

    return threadId;
  }
});

// convex/events.ts
export const requestChanges = mutation({
  args: {
    id: v.id("events"),
    message: v.string(),
    fieldsWithIssues: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);

    // Validate state transition
    if (!["submitted", "resubmitted"].includes(event.status)) {
      throw new Error("Cannot request changes in current state");
    }

    // Update status
    await ctx.db.patch(args.id, {
      status: "changes_requested",
    });

    // Send notification to host
    await sendNotification(ctx, {
      userId: event.hostId,
      type: "changes_requested",
      eventId: args.id,
      message: args.message,
    });
  }
});
```

## Quick Feedback Reasons

| Reason Key       | Display Label         | Common Use Case                           |
| ---------------- | --------------------- | ------------------------------------------ |
| needs_clarity    | Needs more clarity    | Description is vague or unclear           |
| incorrect_format | Incorrect format      | Date/time format issues                   |
| missing_info     | Missing information   | Required details not provided             |
| date_conflict    | Date conflict         | Overlaps with another event               |
| venue_issue      | Venue issue           | Venue unavailable or inappropriate        |
| capacity_concern | Capacity concern      | Capacity too high/low for venue           |

## Verification Steps

### 1. Review Queue
```bash
# Login as admin
# Navigate to /dashboard/review
# Verify all submitted/resubmitted events appear
# Test filtering by status
# Check that event cards show key information
```

### 2. Field Feedback
```bash
# Open event for review
# Click feedback button on venue field
# Add comment with quick reason
# Verify feedback appears on field
# Check thread persists on page refresh
```

### 3. Request Changes Flow
```bash
# Add feedback to multiple fields
# Click "Request Changes"
# Add overall message
# Submit request
# Verify event status changes to "changes_requested"
# Login as host
# Verify notification received
```

### 4. Thread Persistence
```bash
# Create feedback thread as admin
# Logout and login again
# Navigate back to event
# Verify thread still visible
# Add another comment
# Verify thread updates
```

### 5. Audit Trail
```bash
# Perform various actions on event
# Check audit log in sidebar
# Verify all actions logged with:
  - Actor name
  - Action type
  - Timestamp
  - Field affected (if applicable)
```

### 6. Permission Check
```bash
# Login as host
# Try to access /dashboard/review
# Verify access denied
# Try to call admin mutations
# Verify unauthorized error
```

## Performance Requirements
- Review queue loads within 1 second for 100 events
- Feedback submission completes within 500ms
- Real-time updates appear within 200ms
- Audit log loads instantly (<100ms)

## Error Handling
- Network failures show retry option
- Invalid state transitions show clear messages
- Permission errors redirect appropriately
- Failed notifications don't block review process

## UI/UX Requirements
- Fields with feedback highlighted in yellow
- Open thread count visible on cards
- Quick reasons reduce typing burden
- Previous comments visible for context
- Activity timeline shows chronological history

## Dependencies
- Phase 0 complete (roles and auth)
- Phase 1 complete (event submission)
- Sheet/Drawer component from shadcn/ui
- ScrollArea for comment history
- Real-time subscriptions via Convex

## Risk Mitigation
- **Risk**: Feedback gets lost
  - **Mitigation**: Persist all threads in database
  - **Fallback**: Audit log captures all actions

- **Risk**: Ambiguous feedback
  - **Mitigation**: Field-anchored comments
  - **Fallback**: Overall message option

## Next Phase Dependencies
Phase 3 (Publishing) requires:
- ✅ Events can be approved
- ✅ Status tracking complete
- ✅ Review process established