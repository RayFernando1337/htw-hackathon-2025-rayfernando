import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
  }
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
  }
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
    if (!event.shortDescription || event.shortDescription.trim().length < 50) missing.push("Short Description (min 50 chars)");
       if (!event.eventDate) missing.push("Event Date");
    if (!event.venue) missing.push("Venue");
    if (!event.targetAudience) missing.push("Target Audience");
    if (!event.formats || event.formats.length === 0) missing.push("Event Format (select at least one)");
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
  }
});

// Get all events for the current user
export const getMyEvents = query({
  args: {},
  returns: v.array(v.object({
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
  })),
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

    return events.map(event => ({
      _id: event._id,
      _creationTime: event._creationTime,
      title: event.title,
      shortDescription: event.shortDescription,
      eventDate: event.eventDate,
      venue: event.venue,
      status: event.status,
      capacity: event.capacity,
      formats: event.formats,
      submittedAt: event.submittedAt,
    }));
  }
});

// Get a single event by ID
export const getEventById = query({
  args: { id: v.id("events") },
  returns: v.union(v.null(), v.object({
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
    checklist: v.array(v.object({
      id: v.string(),
      task: v.string(),
      completed: v.boolean(),
      dueDate: v.optional(v.string()),
      section: v.string(),
    })),
  })),
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

    return event;
  }
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
  }
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

    const stats = events.reduce((acc, event) => {
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
    }, {
      totalEvents: 0,
      draftCount: 0,
      submittedCount: 0,
      approvedCount: 0,
      publishedCount: 0,
    });

    return stats;
  }
});

// Admin: review queue
export const getReviewQueue = query({
  args: {
    status: v.optional(v.array(v.union(v.literal("submitted"), v.literal("resubmitted"), v.literal("all"))))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const admin = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!admin || admin.role !== "admin") return [];

    // Fetch events by status
    const statuses = args.status && args.status.length > 0 ? args.status : ["submitted", "resubmitted"];
    const includeAll = statuses.includes("all" as any);

    const events: any[] = [];
    const pushWithEnrichment = async (ev: any) => {
      const host = await ctx.db.get(ev.hostId);
      // Count open threads
      const threads = await ctx.db
        .query("feedbackThreads")
        .withIndex("by_event", (q) => q.eq("eventId", ev._id))
        .collect();
      const openThreadCount = threads.filter((t: any) => t.status === "open").length;
      const h: any = host;
      events.push({
        ...ev,
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

    const host = await ctx.db.get(event.hostId);

    const h: any = host;
    return {
    ...event,
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
    const fieldsNote = args.fieldsWithIssues && args.fieldsWithIssues.length > 0 ? ` Fields: ${args.fieldsWithIssues.join(", ")}.` : "";
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

    await ctx.db.patch(args.id, { status: "approved", approvedAt: Date.now() });

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
