import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Ensure legacy event documents (created before new required fields) conform to
// the current schema by applying sensible defaults. This avoids return validator
// mismatches in queries.
function normalizeEvent(ev: any) {
  return {
    ...ev,
    status: ev.status ?? "draft",
    title: ev.title ?? "",
    shortDescription: ev.shortDescription ?? "",
    eventDate: ev.eventDate ?? "",
    venue: ev.venue ?? "",
    capacity: ev.capacity ?? 50,
    formats: ev.formats ?? [],
    isPublic: ev.isPublic ?? true,
    hasHostedBefore: ev.hasHostedBefore ?? false,
    targetAudience: ev.targetAudience ?? "",
    planningDocUrl: ev.planningDocUrl ?? undefined,
    lumaUrl: ev.lumaUrl ?? undefined,
    onCalendar: ev.onCalendar ?? false,
    agreementAcceptedAt: ev.agreementAcceptedAt ?? undefined,
    submittedAt: ev.submittedAt ?? undefined,
    approvedAt: ev.approvedAt ?? undefined,
    checklistTemplate: ev.checklistTemplate ?? "general",
    checklist: ev.checklist ?? [],
  };
}

// Create a draft event
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
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

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
  },
});

// Update a draft event
export const updateDraft = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    eventDate: v.optional(v.string()),
    venue: v.optional(v.string()),
    capacity: v.optional(v.number()),
    formats: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
    hasHostedBefore: v.optional(v.boolean()),
    targetAudience: v.optional(v.string()),
    planningDocUrl: v.optional(v.string()),
    agreementAcceptedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    // Verify ownership
    if (event.hostId !== user._id) {
      throw new Error("Unauthorized - you can only edit your own events");
    }

    // Verify event is still editable
    if (event.status !== "draft" && event.status !== "changes_requested") {
      throw new Error("Event cannot be edited in its current state");
    }

    const { id, ...updateData } = args;
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(args.id, filteredData);
  },
});

// Submit event for review
export const submitEvent = mutation({
  args: { id: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    // Verify ownership
    if (event.hostId !== user._id) {
      throw new Error("Unauthorized - you can only submit your own events");
    }

    // Validate all required fields — return field-specific guidance
    const missing: string[] = [];
    if (!event.title) missing.push("Event Title");
    if (!event.shortDescription || event.shortDescription.trim().length < 50)
      missing.push("Short Description (min 50 chars)");
    if (!event.eventDate) missing.push("Event Date");
    if (!event.venue) missing.push("Venue");
    if (!event.targetAudience) missing.push("Target Audience");
    if (!event.formats || event.formats.length === 0)
      missing.push("Event Format (select at least one)");
    if (!event.agreementAcceptedAt) missing.push("Host Agreement");

    if (missing.length > 0) {
      throw new Error(`Please complete the following before submitting: ${missing.join(", ")}`);
    }

    // State machine validation
    if (event.status !== "draft" && event.status !== "changes_requested") {
      throw new Error("Event cannot be submitted in current state");
    }

    const newStatus = event.status === "changes_requested" ? "resubmitted" : "submitted";

    await ctx.db.patch(args.id, {
      status: newStatus,
      submittedAt: Date.now(),
    });

    // TODO: Send notification to admins
  },
});

// Get all events for the current user
export const getMyEvents = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      title: v.string(),
      shortDescription: v.string(),
      eventDate: v.string(),
      venue: v.string(),
      status: v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("changes_requested"),
        v.literal("resubmitted"),
        v.literal("approved"),
        v.literal("published")
      ),
      capacity: v.number(),
      formats: v.array(v.string()),
      submittedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) return [];

    const events = await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostId", user._id))
      .order("desc")
      .collect();

    return events.map((event) => {
      const e = normalizeEvent(event);
      return {
        _id: e._id,
        _creationTime: e._creationTime,
        title: e.title,
        shortDescription: e.shortDescription,
        eventDate: e.eventDate,
        venue: e.venue,
        status: e.status,
        capacity: e.capacity,
        formats: e.formats,
        submittedAt: e.submittedAt,
      };
    });
  },
});

// Get a single event by ID
export const getEventById = query({
  args: { id: v.id("events") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      hostId: v.id("users"),
      status: v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("changes_requested"),
        v.literal("resubmitted"),
        v.literal("approved"),
        v.literal("published")
      ),
      title: v.string(),
      shortDescription: v.string(),
      eventDate: v.string(),
      venue: v.string(),
      capacity: v.number(),
      formats: v.array(v.string()),
      isPublic: v.boolean(),
      hasHostedBefore: v.boolean(),
      targetAudience: v.string(),
      planningDocUrl: v.optional(v.string()),
      lumaUrl: v.optional(v.string()),
      onCalendar: v.boolean(),
      agreementAcceptedAt: v.optional(v.number()),
      submittedAt: v.optional(v.number()),
      approvedAt: v.optional(v.number()),
      checklistTemplate: v.string(),
      checklist: v.array(
        v.object({
          id: v.string(),
          task: v.string(),
          completed: v.boolean(),
          dueDate: v.optional(v.string()),
          section: v.string(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) return null;

    const event = await ctx.db.get(args.id);
    if (!event) return null;

    // Verify ownership (hosts can only see their own events)
    if (event.hostId !== user._id) {
      // TODO: Allow admins to see all events
      return null;
    }

    return normalizeEvent(event);
  },
});

// Delete a draft event
export const deleteEvent = mutation({
  args: { id: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    // Verify ownership
    if (event.hostId !== user._id) {
      throw new Error("Unauthorized - you can only delete your own events");
    }

    // Only allow deletion of draft events
    if (event.status !== "draft") {
      throw new Error("Only draft events can be deleted");
    }

    await ctx.db.delete(args.id);
  },
});

// Get event statistics for dashboard
export const getEventStats = query({
  args: {},
  returns: v.object({
    totalEvents: v.number(),
    draftCount: v.number(),
    submittedCount: v.number(),
    approvedCount: v.number(),
    publishedCount: v.number(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        totalEvents: 0,
        draftCount: 0,
        submittedCount: 0,
        approvedCount: 0,
        publishedCount: 0,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) {
      return {
        totalEvents: 0,
        draftCount: 0,
        submittedCount: 0,
        approvedCount: 0,
        publishedCount: 0,
      };
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostId", user._id))
      .collect();

    const stats = events.reduce(
      (acc, event) => {
        acc.totalEvents++;
        switch (event.status) {
          case "draft":
            acc.draftCount++;
            break;
          case "submitted":
          case "resubmitted":
            acc.submittedCount++;
            break;
          case "approved":
            acc.approvedCount++;
            break;
          case "published":
            acc.publishedCount++;
            break;
        }
        return acc;
      },
      {
        totalEvents: 0,
        draftCount: 0,
        submittedCount: 0,
        approvedCount: 0,
        publishedCount: 0,
      }
    );

    return stats;
  },
});

// Admin: review queue
export const getReviewQueue = query({
  args: {
    status: v.optional(
      v.array(v.union(v.literal("submitted"), v.literal("resubmitted"), v.literal("all")))
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      hostId: v.id("users"),
      status: v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("changes_requested"),
        v.literal("resubmitted"),
        v.literal("approved"),
        v.literal("published")
      ),
      title: v.string(),
      shortDescription: v.string(),
      eventDate: v.string(),
      venue: v.string(),
      capacity: v.number(),
      formats: v.array(v.string()),
      submittedAt: v.optional(v.number()),
      host: v.object({ _id: v.id("users"), name: v.string(), orgName: v.string() }),
      hasOpenThreads: v.boolean(),
      openThreadCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const admin = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!admin || admin.role !== "admin") return [];

    // Fetch events by status
    const statuses =
      args.status && args.status.length > 0 ? args.status : ["submitted", "resubmitted"];
    const includeAll = statuses.includes("all" as any);

    const events: any[] = [];
    const pushWithEnrichment = async (ev: any) => {
      const base = normalizeEvent(ev);
      const host = await ctx.db.get(base.hostId);
      // Count open threads using composite index
      const openThreadCount = (
        await ctx.db
          .query("feedbackThreads")
          .withIndex("by_event_and_status", (q) => q.eq("eventId", base._id).eq("status", "open"))
          .collect()
      ).length;
      const h: any = host;
      events.push({
        _id: base._id,
        _creationTime: base._creationTime,
        hostId: base.hostId,
        status: base.status,
        title: base.title,
        shortDescription: base.shortDescription,
        eventDate: base.eventDate,
        venue: base.venue,
        capacity: base.capacity,
        formats: base.formats,
        submittedAt: base.submittedAt,
        host: { _id: h?._id, name: h?.name ?? "Host", orgName: h?.orgName ?? "" },
        hasOpenThreads: openThreadCount > 0,
        openThreadCount,
      });
    };

    if (includeAll) {
      const list = await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "submitted" as any))
        .order("desc")
        .collect();
      const list2 = await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "resubmitted" as any))
        .order("desc")
        .collect();
      for (const e of [...list, ...list2]) await pushWithEnrichment(e);
    } else {
      for (const s of statuses) {
        const list = await ctx.db
          .query("events")
          .withIndex("by_status", (q) => q.eq("status", s as any))
          .order("desc")
          .collect();
        for (const e of list) await pushWithEnrichment(e);
      }
    }

    // Sort by submittedAt desc if available
    events.sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));

    return events;
  },
});

export const getForReview = query({
  args: { id: v.id("events") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      hostId: v.id("users"),
      status: v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("changes_requested"),
        v.literal("resubmitted"),
        v.literal("approved"),
        v.literal("published")
      ),
      title: v.string(),
      shortDescription: v.string(),
      eventDate: v.string(),
      venue: v.string(),
      capacity: v.number(),
      formats: v.array(v.string()),
      isPublic: v.boolean(),
      hasHostedBefore: v.boolean(),
      targetAudience: v.string(),
      planningDocUrl: v.optional(v.string()),
      lumaUrl: v.optional(v.string()),
      onCalendar: v.boolean(),
      agreementAcceptedAt: v.optional(v.number()),
      submittedAt: v.optional(v.number()),
      approvedAt: v.optional(v.number()),
      checklistTemplate: v.string(),
      checklist: v.array(
        v.object({
          id: v.string(),
          task: v.string(),
          completed: v.boolean(),
          dueDate: v.optional(v.string()),
          section: v.string(),
        })
      ),
      host: v.object({ _id: v.id("users"), name: v.string(), orgName: v.string() }),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const admin = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!admin || admin.role !== "admin") return null;

    const event = await ctx.db.get(args.id);
    if (!event) return null;

    const base = normalizeEvent(event);
    const host = await ctx.db.get(base.hostId);

    const h: any = host;
    return {
      ...base,
      host: { _id: h?._id, name: h?.name ?? "Host", orgName: h?.orgName ?? "" },
    };
  },
});

export const requestChanges = mutation({
  args: {
    id: v.id("events"),
    message: v.string(),
    fieldsWithIssues: v.optional(v.array(v.string())),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    if (!(event.status === "submitted" || event.status === "resubmitted")) {
      throw new Error("Cannot request changes in current state");
    }

    await ctx.db.patch(args.id, { status: "changes_requested" });

    // Log action
    await ctx.db.insert("auditLog", {
      eventId: args.id,
      actorId: admin._id,
      action: "status_change",
      fromValue: event.status,
      toValue: "changes_requested",
      metadata: { reason: args.reason, fieldsWithIssues: args.fieldsWithIssues ?? [] },
      timestamp: Date.now(),
    });

    // Notification to host
    const fieldsNote =
      args.fieldsWithIssues && args.fieldsWithIssues.length > 0
        ? ` Fields: ${args.fieldsWithIssues.join(", ")}.`
        : "";
    await ctx.db.insert("notifications", {
      userId: event.hostId,
      type: "status_change",
      eventId: args.id,
      message: `Changes requested${args.reason ? ` (${args.reason})` : ""}: ${args.message}.${fieldsNote}`,
      createdAt: Date.now(),
    });
  },
});

export const approve = mutation({
  args: { id: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    if (!(event.status === "submitted" || event.status === "resubmitted")) {
      throw new Error("Cannot approve in current state");
    }

    // Generate checklist based on event type and date when approving
    const templateName = getEventTemplateFromFormats(event.formats);
    const checklist = generateChecklist(templateName, new Date(event.eventDate));

    await ctx.db.patch(args.id, {
      status: "approved",
      approvedAt: Date.now(),
      checklistTemplate: templateName,
      checklist: checklist,
    });

    await ctx.db.insert("auditLog", {
      eventId: args.id,
      actorId: admin._id,
      action: "status_change",
      fromValue: event.status,
      toValue: "approved",
      metadata: {},
      timestamp: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: event.hostId,
      type: "status_change",
      eventId: args.id,
      message: `Your event was approved`,
      createdAt: Date.now(),
    });
  },
});

// Helper functions for checklist generation (imported from lib)
function getEventTemplateFromFormats(formats: string[]): string {
  const formatStr = formats.join(" ").toLowerCase();

  if (formatStr.includes("panel") || formatStr.includes("discussion")) {
    return "panel";
  } else if (formatStr.includes("mixer") || formatStr.includes("networking")) {
    return "mixer";
  } else if (formatStr.includes("workshop") || formatStr.includes("training")) {
    return "workshop";
  }

  return "general";
}

function generateChecklist(template: string, eventDate: Date) {
  // Define templates inline to avoid import issues in Convex
  const CHECKLIST_TEMPLATES: any = {
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
    general: {
      name: "General Event",
      sections: {
        planning: [
          { id: "p1", task: "Finalize event agenda", daysBeforeEvent: 21 },
          { id: "p2", task: "Confirm all speakers/facilitators", daysBeforeEvent: 14 },
          { id: "p3", task: "Prepare event materials", daysBeforeEvent: 7 },
        ],
        marketing: [
          { id: "m1", task: "Create promotional materials", daysBeforeEvent: 21 },
          { id: "m2", task: "Share on social media", daysBeforeEvent: 14 },
          { id: "m3", task: "Send reminder notifications", daysBeforeEvent: 2 },
        ],
        logistics: [
          { id: "l1", task: "Prepare venue setup", daysBeforeEvent: 1 },
          { id: "l2", task: "Test audio/visual equipment", daysBeforeEvent: 1 },
          { id: "l3", task: "Prepare registration materials", daysBeforeEvent: 0 },
        ],
      },
    },
  };

  const templateConfig = CHECKLIST_TEMPLATES[template] || CHECKLIST_TEMPLATES.general;
  const checklist: any[] = [];

  Object.entries(templateConfig.sections).forEach(([section, tasks]: [string, any]) => {
    tasks.forEach((task: any) => {
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

  return checklist.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

// Update Lu.ma URL for approved events
export const updateLumaUrl = mutation({
  args: {
    id: v.id("events"),
    lumaUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    // Verify ownership
    if (event.hostId !== user._id) {
      throw new Error("Unauthorized - you can only edit your own events");
    }

    // Only allow Lu.ma URL updates for approved events
    if (event.status !== "approved") {
      throw new Error("Lu.ma URL can only be added to approved events");
    }

    // Basic URL validation
    if (
      !args.lumaUrl.includes("lu.ma/") ||
      (!args.lumaUrl.startsWith("http://") && !args.lumaUrl.startsWith("https://"))
    ) {
      throw new Error("Please provide a valid Lu.ma URL (https://lu.ma/your-event)");
    }

    await ctx.db.patch(args.id, { lumaUrl: args.lumaUrl });

    // Log the action
    await ctx.db.insert("auditLog", {
      eventId: args.id,
      actorId: user._id,
      action: "luma_url_added",
      fromValue: event.lumaUrl,
      toValue: args.lumaUrl,
      metadata: {},
      timestamp: Date.now(),
    });
  },
});

// Update checklist item completion status
export const updateChecklistItem = mutation({
  args: {
    eventId: v.id("events"),
    taskId: v.string(),
    completed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Verify ownership
    if (event.hostId !== user._id) {
      throw new Error("Unauthorized - you can only edit your own events");
    }

    // Update the specific checklist item
    const updatedChecklist = event.checklist.map((item: any) => {
      if (item.id === args.taskId) {
        return { ...item, completed: args.completed };
      }
      return item;
    });

    await ctx.db.patch(args.eventId, { checklist: updatedChecklist });

    // Log the action
    await ctx.db.insert("auditLog", {
      eventId: args.eventId,
      actorId: user._id,
      action: "checklist_updated",
      fromValue: null,
      toValue: null,
      metadata: {
        reason: `Checklist item ${args.completed ? "completed" : "unchecked"}: ${args.taskId}`,
      },
      timestamp: Date.now(),
    });
  },
});

// Detect venue conflicts with other events
export const detectVenueConflicts = query({
  args: {
    eventDate: v.string(),
    venue: v.string(),
    excludeId: v.optional(v.id("events")),
  },
  returns: v.array(
    v.object({
      id: v.id("events"),
      title: v.string(),
      eventDate: v.string(),
      venue: v.string(),
      hostName: v.string(),
      status: v.union(
        v.literal("submitted"),
        v.literal("resubmitted"),
        v.literal("approved"),
        v.literal("published")
      ),
      timeDifferenceHours: v.number(),
      isDirectConflict: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    if (!args.eventDate || !args.venue) return [];

    const proposedDate = new Date(args.eventDate);
    // Check for events within 3 hours (reasonable buffer for setup/cleanup)
    const timeBuffer = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    const windowStart = new Date(proposedDate.getTime() - timeBuffer);
    const windowEnd = new Date(proposedDate.getTime() + timeBuffer);

    // Find events in the same venue within the time window
    const events = await ctx.db
      .query("events")
      .withIndex("by_eventDate", (q) =>
        q.gte("eventDate", windowStart.toISOString()).lte("eventDate", windowEnd.toISOString())
      )
      .collect();

    // Filter for venue conflicts
    const conflicts = events.filter((event) => {
      // Exclude the current event being edited
      if (args.excludeId && event._id === args.excludeId) return false;

      // Only consider submitted, approved or published events
      if (!["submitted", "resubmitted", "approved", "published"].includes(event.status))
        return false;

      // Check if it's the same venue (case-insensitive, normalized)
      const normalizeVenue = (venue: string) => venue.toLowerCase().trim().replace(/\s+/g, " ");

      return normalizeVenue(event.venue) === normalizeVenue(args.venue);
    });

    // Get host information for each conflicting event
    const enrichedConflicts = [];
    for (const event of conflicts) {
      const host = await ctx.db.get(event.hostId);
      const eventTime = new Date(event.eventDate);
      const timeDifferenceHours =
        Math.abs(proposedDate.getTime() - eventTime.getTime()) / (1000 * 60 * 60);

      // Direct conflict = less than 1 hour apart
      const isDirectConflict = timeDifferenceHours < 1;

      enrichedConflicts.push({
        id: event._id,
        title: event.title,
        eventDate: event.eventDate,
        venue: event.venue,
        hostName: host?.name || "Unknown Host",
        status: event.status as any,
        timeDifferenceHours: Math.round(timeDifferenceHours * 10) / 10,
        isDirectConflict,
      });
    }

    // Sort by time difference (most problematic first)
    return enrichedConflicts.sort((a, b) => a.timeDifferenceHours - b.timeDifferenceHours);
  },
});

// Admin: Change event status to any state
export const changeEventStatus = mutation({
  args: {
    id: v.id("events"),
    newStatus: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("changes_requested"),
      v.literal("resubmitted"),
      v.literal("approved"),
      v.literal("published")
    ),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    const oldStatus = event.status;

    // Handle special status transitions
    const updateData: any = { status: args.newStatus };

    if (args.newStatus === "published") {
      updateData.onCalendar = true;
      // Don't require Lu.ma URL for admin override, but warn if missing
    }

    if (args.newStatus === "approved" && !event.approvedAt) {
      updateData.approvedAt = Date.now();

      // Generate checklist if not present
      if (!event.checklist || event.checklist.length === 0) {
        const templateName = getEventTemplateFromFormats(event.formats);
        const checklist = generateChecklist(templateName, new Date(event.eventDate));
        updateData.checklistTemplate = templateName;
        updateData.checklist = checklist;
      }
    }

    await ctx.db.patch(args.id, updateData);

    await ctx.db.insert("auditLog", {
      eventId: args.id,
      actorId: admin._id,
      action: "admin_status_change",
      fromValue: oldStatus,
      toValue: args.newStatus,
      metadata: { reason: args.reason || "Admin override" },
      timestamp: Date.now(),
    });

    // Notify host of status change
    const statusMessages = {
      draft: "Your event has been moved back to draft status",
      submitted: "Your event has been moved back to submitted status",
      changes_requested: "Your event requires additional changes",
      resubmitted: "Your event has been marked as resubmitted",
      approved: "Your event has been approved",
      published: "Your event has been published and is now live!",
    };

    await ctx.db.insert("notifications", {
      userId: event.hostId,
      type: "status_change",
      eventId: args.id,
      message: statusMessages[args.newStatus],
      createdAt: Date.now(),
    });
  },
});

// Legacy function for backward compatibility
export const markPublished = mutation({
  args: { id: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    const oldStatus = event.status;

    await ctx.db.patch(args.id, {
      status: "published",
      onCalendar: true,
    });

    await ctx.db.insert("auditLog", {
      eventId: args.id,
      actorId: admin._id,
      action: "admin_status_change",
      fromValue: oldStatus,
      toValue: "published",
      metadata: { reason: "Marked as published" },
      timestamp: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: event.hostId,
      type: "status_change",
      eventId: args.id,
      message: "Your event has been published and is now live!",
      createdAt: Date.now(),
    });
  },
});
