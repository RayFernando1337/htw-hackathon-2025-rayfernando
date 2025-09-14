# Phase 1: Host Event Submission

**Timeline: 3-4 days** | **Complexity: High** | **Priority: Critical**

## Overview
Implement the complete event submission workflow for hosts, including multi-step form wizard, auto-save functionality, field validation matching Fillout exactly, and event management dashboard.

## Success Criteria
- [ ] Multi-step form saves progress automatically
- [ ] All Fillout fields are present and validated
- [ ] Draft events can be edited multiple times
- [ ] Submit action locks event from further edits
- [ ] My Events dashboard shows all user's events
- [ ] Status badges display correctly

## Technical Implementation

### 1.1 Complete Event Schema

```typescript
// convex/schema.ts - Add events table
events: defineTable({
  // Ownership & Status
  hostId: v.id("users"),
  status: v.union(
    v.literal("draft"),
    v.literal("submitted"),
    v.literal("changes_requested"),
    v.literal("resubmitted"),
    v.literal("approved"),
    v.literal("published")
  ),

  // Core Fields (matching Fillout exactly)
  title: v.string(),
  shortDescription: v.string(),
  eventDate: v.string(), // ISO date string
  venue: v.string(),
  capacity: v.number(),
  formats: v.array(v.string()), // ["panel", "mixer", etc]
  isPublic: v.boolean(),
  hasHostedBefore: v.boolean(),
  targetAudience: v.string(),
  planningDocUrl: v.optional(v.string()),

  // Post-approval
  lumaUrl: v.optional(v.string()),
  onCalendar: v.boolean(),

  // Timestamps
  agreementAcceptedAt: v.optional(v.number()),
  submittedAt: v.optional(v.number()),
  approvedAt: v.optional(v.number()),
  publishedAt: v.optional(v.number()),

  // Checklist
  checklistTemplate: v.string(),
  checklist: v.array(v.object({
    id: v.string(),
    task: v.string(),
    completed: v.boolean(),
    dueDate: v.optional(v.string()),
    section: v.string(),
  })),
})
.index("byHost", ["hostId"])
.index("byStatus", ["status"])
.index("byDate", ["eventDate"])
.index("byHostAndStatus", ["hostId", "status"]),
```

### 1.2 Multi-Step Form Wizard

```typescript
// app/dashboard/events/new/page.tsx
const FORM_STEPS = [
  { id: 'basics', title: 'Event Basics', fields: ['title', 'shortDescription'] },
  { id: 'logistics', title: 'Logistics', fields: ['eventDate', 'venue', 'capacity'] },
  { id: 'audience', title: 'Audience', fields: ['formats', 'isPublic', 'targetAudience'] },
  { id: 'review', title: 'Review & Submit' }
];

export default function CreateEventPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<EventFormData>>({});
  const createDraft = useMutation(api.events.createDraft);
  const updateDraft = useMutation(api.events.updateDraft);
  const [draftId, setDraftId] = useState<Id<"events"> | null>(null);

  // Auto-save on every field change
  const debouncedSave = useDebouncedCallback(
    async (data: Partial<EventFormData>) => {
      if (draftId) {
        await updateDraft({ id: draftId, ...data });
      } else {
        const id = await createDraft(data);
        setDraftId(id);
      }
    },
    1000
  );

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator steps={FORM_STEPS} currentStep={currentStep} />

      {currentStep === 0 && (
        <BasicsStep
          data={formData}
          onChange={(field, value) => {
            setFormData(prev => ({ ...prev, [field]: value }));
            debouncedSave({ [field]: value });
          }}
          onNext={() => setCurrentStep(1)}
        />
      )}

      {/* Other steps... */}

      {currentStep === 3 && (
        <ReviewStep
          data={formData}
          onSubmit={async () => {
            await updateDraft({
              id: draftId,
              status: "submitted",
              submittedAt: Date.now()
            });
            toast.success("Event submitted for review!");
            redirect('/dashboard/events');
          }}
        />
      )}
    </div>
  );
}
```

### 1.3 Form Validation & Field Components

```typescript
// lib/validations/event.ts
export const eventSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(100, "Title must be under 100 characters"),

  shortDescription: z.string()
    .min(50, "Description must be at least 50 characters")
    .max(500, "Description must be under 500 characters"),

  eventDate: z.string()
    .refine(date => new Date(date) > new Date(), {
      message: "Event date must be in the future"
    }),

  venue: z.string()
    .min(1, "Venue is required"),

  capacity: z.number()
    .min(10, "Minimum capacity is 10")
    .max(1000, "Maximum capacity is 1000"),

  formats: z.array(z.string())
    .min(1, "Select at least one format")
    .max(3, "Maximum 3 formats allowed"),
});

// components/event-form/field-with-help.tsx
export function FieldWithHelp({
  field,
  label,
  help,
  error,
  children
}: FieldProps) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>{children}</FormControl>
      {help && <FormDescription>{help}</FormDescription>}
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
}
```

### 1.4 My Events Dashboard

```typescript
// app/dashboard/events/page.tsx
export default function MyEventsPage() {
  const events = useQuery(api.events.getMyEvents);

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    changes_requested: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    published: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Events</h1>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {events?.map(event => (
          <Card key={event._id}>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle>{event.title}</CardTitle>
                <Badge className={statusColors[event.status]}>
                  {event.status.replace('_', ' ')}
                </Badge>
              </div>
              <CardDescription>
                {format(new Date(event.eventDate), 'PPP')} • {event.venue}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {event.shortDescription}
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/events/${event._id}`}>
                  {event.status === 'draft' ? 'Continue Editing' : 'View Details'}
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

### 1.5 Convex Functions for Events

```typescript
// convex/events.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createDraft = mutation({
  args: {
    title: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", q => q.eq("externalId", identity.subject))
      .unique();

    return await ctx.db.insert("events", {
      hostId: user._id,
      status: "draft",
      title: args.title || "",
      shortDescription: args.shortDescription || "",
      // Initialize all required fields with defaults
      eventDate: "",
      venue: "",
      capacity: 50,
      formats: [],
      isPublic: true,
      hasHostedBefore: false,
      targetAudience: "",
      onCalendar: false,
      checklistTemplate: "general",
      checklist: [],
    });
  }
});

export const submitEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);

    // Validate all required fields
    if (!event.title || !event.eventDate || !event.venue) {
      throw new Error("Please complete all required fields");
    }

    // State machine validation
    if (event.status !== "draft" && event.status !== "changes_requested") {
      throw new Error("Event cannot be submitted in current state");
    }

    await ctx.db.patch(args.id, {
      status: event.status === "changes_requested" ? "resubmitted" : "submitted",
      submittedAt: Date.now(),
    });

    // TODO: Send notification to admins
  }
});
```

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

## Verification Steps

### 1. Draft Creation
```bash
# Navigate to /dashboard/events/new
# Start filling form
# Check Convex dashboard for draft creation
# Verify auto-save triggers after 1 second of inactivity
```

### 2. Form Validation
```bash
# Try to submit with empty required fields
# Verify error messages appear
# Fill all required fields
# Verify submission succeeds
```

### 3. Step Navigation
```bash
# Move between form steps
# Verify data persists when navigating back
# Check that progress is saved in database
```

### 4. Status Transition
```bash
# Submit a draft event
# Verify status changes to "submitted"
# Try to edit submitted event
# Verify editing is blocked
```

### 5. My Events View
```bash
# Create multiple events with different statuses
# Verify all events appear in list
# Check status badges show correct colors
# Verify "Continue Editing" vs "View Details" button logic
```

### 6. Permission Check
```bash
# Create event as Host A
# Login as Host B
# Verify Host B cannot see Host A's events
# Try to access Host A's event directly via URL
# Verify access is denied
```

## Performance Requirements
- Auto-save completes within 500ms
- Form step transitions are instant (<100ms)
- My Events page loads within 1 second for 50 events

## Error Handling
- Network failures during auto-save show retry indicator
- Form validation errors are clear and actionable
- State machine violations show user-friendly messages
- Failed submissions allow retry without data loss

## Dependencies
- Phase 0 must be complete (auth and roles)
- React Hook Form for form management
- Zod for validation schemas
- date-fns for date formatting
- Debounce utility for auto-save

## Risk Mitigation
- **Risk**: Data loss during form filling
  - **Mitigation**: Auto-save every field change
  - **Fallback**: Local storage backup

- **Risk**: Incomplete submissions
  - **Mitigation**: Clear validation messages
  - **Fallback**: Save as draft, complete later

## Next Phase Dependencies
Phase 2 (Admin Review) requires:
- ✅ Events can be submitted
- ✅ Event status tracking works
- ✅ Event detail pages exist