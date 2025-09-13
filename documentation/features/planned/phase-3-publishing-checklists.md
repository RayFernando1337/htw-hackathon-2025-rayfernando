# Phase 3: Publishing & Dynamic Checklists

**Timeline: 2-3 days** | **Complexity: Medium** | **Priority: High**

## Overview
Enable approved events to be published with Lu.ma integration and provide dynamic checklists based on event type. This phase ensures hosts have clear guidance for event execution and admins control final publication.

## Success Criteria
- [ ] Approved events can add Lu.ma URL
- [ ] Checklist generates based on event type
- [ ] Tasks can be marked complete
- [ ] Collision warnings appear for overlapping events
- [ ] Admin can mark events as published
- [ ] Email notifications send on key actions

## Technical Implementation

### 3.1 Checklist Templates Configuration

```typescript
// lib/checklist-templates.ts
export const CHECKLIST_TEMPLATES = {
  panel: {
    name: "Panel Discussion",
    sections: {
      planning: [
        { id: "p1", task: "Confirm 3-5 panelists", daysBeforeEvent: 30 },
        { id: "p2", task: "Prepare moderator questions", daysBeforeEvent: 14 },
        { id: "p3", task: "Send panelist prep materials", daysBeforeEvent: 7 },
      ],
      marketing: [
        { id: "m1", task: "Create event graphic with panelist photos", daysBeforeEvent: 21 },
        { id: "m2", task: "Write LinkedIn event post", daysBeforeEvent: 14 },
        { id: "m3", task: "Send reminder email to registrants", daysBeforeEvent: 2 },
      ],
      logistics: [
        { id: "l1", task: "Test A/V setup for panel format", daysBeforeEvent: 3 },
        { id: "l2", task: "Prepare name cards for panelists", daysBeforeEvent: 1 },
        { id: "l3", task: "Set up panel seating arrangement", daysBeforeEvent: 0 },
      ],
    },
  },
  mixer: {
    name: "Networking Mixer",
    sections: {
      planning: [
        { id: "p1", task: "Confirm catering order", daysBeforeEvent: 14 },
        { id: "p2", task: "Plan icebreaker activities", daysBeforeEvent: 7 },
        { id: "p3", task: "Create name tag template", daysBeforeEvent: 3 },
      ],
      marketing: [
        { id: "m1", task: "Create social media graphics", daysBeforeEvent: 21 },
        { id: "m2", task: "Post in relevant Slack/Discord channels", daysBeforeEvent: 10 },
        { id: "m3", task: "Final headcount for catering", daysBeforeEvent: 3 },
      ],
      logistics: [
        { id: "l1", task: "Set up registration table", daysBeforeEvent: 0 },
        { id: "l2", task: "Arrange furniture for mingling", daysBeforeEvent: 0 },
        { id: "l3", task: "Prepare music playlist", daysBeforeEvent: 1 },
      ],
    },
  },
  workshop: {
    name: "Workshop",
    sections: {
      planning: [
        { id: "p1", task: "Finalize workshop curriculum", daysBeforeEvent: 21 },
        { id: "p2", task: "Prepare workshop materials/handouts", daysBeforeEvent: 7 },
        { id: "p3", task: "Send pre-workshop survey", daysBeforeEvent: 5 },
      ],
      marketing: [
        { id: "m1", task: "Write detailed workshop description", daysBeforeEvent: 28 },
        { id: "m2", task: "Create promotional video/teaser", daysBeforeEvent: 14 },
        { id: "m3", task: "Send workshop prep email", daysBeforeEvent: 2 },
      ],
      logistics: [
        { id: "l1", task: "Set up workshop stations/materials", daysBeforeEvent: 0 },
        { id: "l2", task: "Test all required software/tools", daysBeforeEvent: 1 },
        { id: "l3", task: "Print attendance sheets", daysBeforeEvent: 1 },
      ],
    },
  },
};

// Function to generate checklist based on event date
export function generateChecklist(
  template: string,
  eventDate: Date
): ChecklistItem[] {
  const templateConfig = CHECKLIST_TEMPLATES[template];
  if (!templateConfig) return [];

  const checklist: ChecklistItem[] = [];

  Object.entries(templateConfig.sections).forEach(([section, tasks]) => {
    tasks.forEach(task => {
      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - task.daysBeforeEvent);

      checklist.push({
        id: `${template}-${task.id}`,
        task: task.task,
        completed: false,
        section,
        dueDate: dueDate.toISOString(),
      });
    });
  });

  return checklist.sort((a, b) =>
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
}
```

### 3.2 Post-Approval Flow

```typescript
// app/dashboard/events/[id]/publish/page.tsx
export default function PublishEventPage({ params }: { params: { id: string } }) {
  const event = useQuery(api.events.get, { id: params.id as Id<"events"> });
  const updateLumaUrl = useMutation(api.events.updateLumaUrl);
  const [lumaUrl, setLumaUrl] = useState("");

  // Only accessible for approved events
  if (event?.status !== "approved") {
    return <NotAuthorized />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Publish Your Event</CardTitle>
          <CardDescription>
            Your event has been approved! Add your Lu.ma URL to publish it publicly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Event Approved!</AlertTitle>
            <AlertDescription>
              Your event "{event.title}" was approved on{" "}
              {format(new Date(event.approvedAt), "PPP")}.
              Now you can create your Lu.ma event and add the URL here.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="luma-url">Lu.ma Event URL</Label>
            <div className="flex gap-2">
              <Input
                id="luma-url"
                placeholder="https://lu.ma/your-event"
                value={lumaUrl}
                onChange={(e) => setLumaUrl(e.target.value)}
              />
              <Button
                onClick={async () => {
                  await updateLumaUrl({
                    id: event._id,
                    lumaUrl
                  });
                  toast.success("Lu.ma URL saved!");
                }}
                disabled={!isValidLumaUrl(lumaUrl)}
              >
                Save URL
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the public URL of your Lu.ma event page
            </p>
          </div>

          {event.lumaUrl && (
            <Alert>
              <LinkIcon className="h-4 w-4" />
              <AlertTitle>Lu.ma URL Set</AlertTitle>
              <AlertDescription>
                Your event is linked to:{" "}
                <a
                  href={event.lumaUrl}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  {event.lumaUrl}
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <EventChecklist eventId={event._id} />
    </div>
  );
}
```

### 3.3 Dynamic Checklist Component

```typescript
// components/events/event-checklist.tsx
export function EventChecklist({ eventId }: { eventId: Id<"events"> }) {
  const event = useQuery(api.events.get, { eventId });
  const updateChecklistItem = useMutation(api.events.updateChecklistItem);

  const groupedTasks = useMemo(() => {
    if (!event?.checklist) return {};

    return event.checklist.reduce((acc, task) => {
      if (!acc[task.section]) acc[task.section] = [];
      acc[task.section].push(task);
      return acc;
    }, {} as Record<string, ChecklistItem[]>);
  }, [event?.checklist]);

  const progress = useMemo(() => {
    if (!event?.checklist) return 0;
    const completed = event.checklist.filter(t => t.completed).length;
    return Math.round((completed / event.checklist.length) * 100);
  }, [event?.checklist]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Event Checklist</CardTitle>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-[100px]" />
            <span className="text-sm font-medium">{progress}%</span>
          </div>
        </div>
        <CardDescription>
          Complete these tasks to ensure your event runs smoothly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="planning">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="planning">
              Planning {getCompletionBadge(groupedTasks.planning)}
            </TabsTrigger>
            <TabsTrigger value="marketing">
              Marketing {getCompletionBadge(groupedTasks.marketing)}
            </TabsTrigger>
            <TabsTrigger value="logistics">
              Logistics {getCompletionBadge(groupedTasks.logistics)}
            </TabsTrigger>
          </TabsList>

          {Object.entries(groupedTasks).map(([section, tasks]) => (
            <TabsContent key={section} value={section} className="space-y-2">
              {tasks.map(task => (
                <ChecklistItemComponent
                  key={task.id}
                  task={task}
                  onToggle={async () => {
                    await updateChecklistItem({
                      eventId,
                      taskId: task.id,
                      completed: !task.completed,
                    });
                  }}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ChecklistItemComponent({ task, onToggle }: ChecklistItemProps) {
  const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border",
      task.completed && "bg-gray-50 opacity-75",
      isOverdue && "border-red-200 bg-red-50"
    )}>
      <Checkbox
        checked={task.completed}
        onCheckedChange={onToggle}
      />
      <div className="flex-1">
        <p className={cn(
          "text-sm",
          task.completed && "line-through text-muted-foreground"
        )}>
          {task.task}
        </p>
        <p className="text-xs text-muted-foreground">
          Due: {format(new Date(task.dueDate), "MMM d")}
          {isOverdue && (
            <span className="ml-2 text-red-600 font-medium">Overdue</span>
          )}
        </p>
      </div>
    </div>
  );
}
```

### 3.4 Collision Detection

```typescript
// convex/events.ts
export const detectCollisions = query({
  args: {
    eventDate: v.string(),
    targetAudience: v.string(),
    excludeId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const proposedDate = new Date(args.eventDate);
    const twoHoursBefore = new Date(proposedDate.getTime() - 2 * 60 * 60 * 1000);
    const twoHoursAfter = new Date(proposedDate.getTime() + 2 * 60 * 60 * 1000);

    // Find overlapping events
    const events = await ctx.db
      .query("events")
      .withIndex("byDate")
      .filter(q =>
        q.and(
          q.gte(q.field("eventDate"), twoHoursBefore.toISOString()),
          q.lte(q.field("eventDate"), twoHoursAfter.toISOString()),
          q.or(
            q.eq(q.field("status"), "approved"),
            q.eq(q.field("status"), "published")
          )
        )
      )
      .collect();

    // Filter by audience overlap
    const collisions = events.filter(event => {
      if (args.excludeId && event._id === args.excludeId) return false;

      // Check audience overlap
      const audienceOverlap = event.targetAudience
        .toLowerCase()
        .includes(args.targetAudience.toLowerCase());

      return audienceOverlap;
    });

    return collisions.map(event => ({
      id: event._id,
      title: event.title,
      eventDate: event.eventDate,
      venue: event.venue,
      targetAudience: event.targetAudience,
      severity: calculateSeverity(event, args),
    }));
  }
});

// components/events/collision-warning.tsx
export function CollisionWarning({
  eventDate,
  targetAudience
}: CollisionWarningProps) {
  const collisions = useQuery(api.events.detectCollisions, {
    eventDate,
    targetAudience,
  });

  if (!collisions || collisions.length === 0) return null;

  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle>Potential Event Conflicts</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          {collisions.map(collision => (
            <div key={collision.id} className="text-sm">
              <span className="font-medium">{collision.title}</span>
              <span className="text-muted-foreground">
                {" "}• {format(new Date(collision.eventDate), "h:mm a")}
                {" "}• {collision.venue}
              </span>
              {collision.severity === "high" && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  High conflict
                </Badge>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Consider adjusting your event time to avoid audience overlap.
        </p>
      </AlertDescription>
    </Alert>
  );
}
```

### 3.5 Admin Publishing Controls

```typescript
// app/dashboard/admin/events/[id]/page.tsx
export default function AdminEventDetailPage({ params }) {
  const event = useQuery(api.events.getWithFullDetails, { id: params.id });
  const markPublished = useMutation(api.events.markPublished);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{event?.title}</CardTitle>
            <div className="flex gap-2">
              <StatusBadge status={event?.status} />
              {event?.lumaUrl && (
                <Badge variant="outline">
                  <LinkIcon className="mr-1 h-3 w-3" />
                  Lu.ma linked
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Event details */}
        </CardContent>
        <CardFooter>
          {event?.status === "approved" && event?.lumaUrl && (
            <Button
              onClick={async () => {
                await markPublished({ id: event._id });
                toast.success("Event published to calendar!");
              }}
            >
              <Globe className="mr-2 h-4 w-4" />
              Mark as Published
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Checklist completion status */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistSummary eventId={event?._id} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.6 Email Notifications with Resend

```typescript
// convex/notifications.ts
import { Resend } from "@convex-dev/resend";
import { components } from "@convex-dev/resend";

export const sendEventApprovedEmail = internalAction({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.runQuery(internal.events.getWithHost, {
      id: args.eventId
    });

    const resend = new Resend(components.Resend);

    await resend.emails.send({
      from: "HTW Events <events@hacktheweekend.com>",
      to: event.host.email,
      subject: `Your event "${event.title}" has been approved!`,
      html: `
        <h2>Congratulations! Your event has been approved.</h2>
        <p>Hi ${event.host.name},</p>
        <p>Great news! Your event "${event.title}" scheduled for ${format(new Date(event.eventDate), "PPP")} has been approved.</p>

        <h3>Next Steps:</h3>
        <ol>
          <li>Create your event on Lu.ma</li>
          <li>Add the Lu.ma URL to your event dashboard</li>
          <li>Complete your event checklist</li>
        </ol>

        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events/${event._id}/publish"
             style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Event Dashboard
          </a>
        </p>

        <p>Best,<br>The HTW Team</p>
      `,
    });
  },
});

// Hook into approval mutation
export const approve = mutation({
  // ... existing args
  handler: async (ctx, args) => {
    // ... existing approval logic

    // Schedule email notification
    await ctx.scheduler.runAfter(0, internal.notifications.sendEventApprovedEmail, {
      eventId: args.id,
    });
  },
});
```

## Checklist Templates

| Event Type | Planning Tasks | Marketing Tasks | Logistics Tasks | Total Tasks |
| ---------- | -------------- | --------------- | --------------- | ----------- |
| Panel      | 3              | 3               | 3               | 9           |
| Mixer      | 3              | 3               | 3               | 9           |
| Workshop   | 3              | 3               | 3               | 9           |

## Collision Detection Rules

| Time Overlap | Audience Overlap | Severity | Action            |
| ------------ | ---------------- | -------- | ----------------- |
| < 2 hours    | High (>50%)      | High     | Strong warning    |
| < 2 hours    | Low (<50%)       | Medium   | Mild warning      |
| > 2 hours    | High (>50%)      | Low      | Information only  |
| > 2 hours    | Low (<50%)       | None     | No warning        |

## Verification Steps

### 1. Checklist Generation
```bash
# Approve an event
# Navigate to publish page
# Verify checklist generates with:
  - Correct number of tasks
  - Appropriate due dates
  - Grouped by section
```

### 2. Task Completion
```bash
# Mark tasks as complete
# Verify progress bar updates
# Check completed tasks show strikethrough
# Verify overdue tasks highlighted in red
```

### 3. Lu.ma Integration
```bash
# Add Lu.ma URL to approved event
# Verify URL validation works
# Check URL saves and displays
# Test invalid URLs are rejected
```

### 4. Collision Detection
```bash
# Create approved event at 6pm
# Create new event at 7pm same day
# Verify collision warning appears
# Test different audiences
# Check severity levels
```

### 5. Publishing Flow
```bash
# As admin, view approved event with Lu.ma URL
# Click "Mark as Published"
# Verify status updates to "published"
# Check event appears in public calendar
```

### 6. Email Notifications
```bash
# Approve an event
# Check Resend dashboard
# Verify email sent to host
# Test email contains:
  - Event title
  - Approval date
  - Next steps
  - Dashboard link
```

## Performance Requirements
- Checklist generation < 200ms
- Task toggle < 300ms
- Collision detection < 500ms
- Email sending queued immediately

## Error Handling
- Invalid Lu.ma URLs show validation error
- Failed email sends are retried
- Network errors during task toggle show retry
- Missing checklist template uses default

## UI/UX Requirements
- Progress bar shows completion percentage
- Overdue tasks highlighted prominently
- Tabs organize checklist by category
- Lu.ma URL field validates format
- Collision warnings are non-blocking

## Dependencies
- Phase 2 complete (approval flow)
- Resend component for emails
- Progress component from shadcn/ui
- Tabs component for checklist sections
- date-fns for date calculations

## Risk Mitigation
- **Risk**: Lu.ma API changes
  - **Mitigation**: Store URL only, no API integration
  - **Fallback**: Manual URL entry

- **Risk**: Email delivery fails
  - **Mitigation**: Resend handles retries
  - **Fallback**: In-app notifications

## Future Enhancements
- Lu.ma API integration for auto-sync
- Custom checklist templates
- Recurring event support
- Automated collision resolution
- Analytics dashboard