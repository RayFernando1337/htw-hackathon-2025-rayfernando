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

    ;    const isAdmin = user.role === "admin";
    const events = isAdmin
      ? await ctx.db.query("events").order("desc").collect()
      : await ctx.db
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

    // Allow admins to see any event; hosts can see only their own
    const isAdmin = user.role === "admin";
    if (!isAdmin && event.hostId !== user._id) return null;

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

    const isAdmin = user.role === "admin";
    const events = isAdmin
      ? await ctx.db.query("events").collect()
      : await ctx.db
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

// Update Lu.ma URL for an event (host allowed only after approval; admins anytime)
export const updateLumaUrl = mutation({
  args: { id: v.id("events"), lumaUrl: v.string() },
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

    const isAdmin = user.role === "admin";
    const isOwner = event.hostId === user._id;
    if (!isAdmin) {
      if (!isOwner) throw new Error("Unauthorized");
      if (!(event.status === "approved" || event.status === "published")) {
        throw new Error("Lu.ma URL can only be set after approval");
      }
    }

    // Basic guard to avoid obviously wrong values
    const url = args.lumaUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new Error("Please provide a valid URL (http/https)");
    }

    await ctx.db.patch(args.id, { lumaUrl: url });
    return null;
  },
});

// Mark whether the event is on calendar (admin only)
export const markOnCalendar = mutation({
  args: { id: v.id("events"), onCalendar: v.boolean() },
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

    await ctx.db.patch(args.id, { onCalendar: args.onCalendar });
    return null;
  },
});

// Admin publishes an event (requires approved status and preferably a Luma URL)
export const publish = mutation({
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
    if (event.status !== "approved") {
      throw new Error("Only approved events can be published");
    }
    if (!event.lumaUrl) {
      throw new Error("Please add a Lu.ma URL before publishing");
    }

    await ctx.db.patch(args.id, { status: "published" });

    await ctx.db.insert("auditLog", {
      eventId: args.id,
      actorId: admin._id,
      action: "status_change",
      fromValue: event.status,
      toValue: "published",
      metadata: {},
      timestamp: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: event.hostId,
      type: "status_change",
      eventId: args.id,
      message: `Your event is now published`,
      createdAt: Date.now(),
    });

    return null;
  },
});

// Admin: force set event status to any value (bypasses normal guards)
export const adminSetStatus = mutation({
  args: {
    id: v.id("events"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("changes_requested"),
      v.literal("resubmitted"),
      v.literal("approved"),
      v.literal("published")
    ),
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

    await ctx.db.patch(args.id, { status: args.status });

    await ctx.db.insert("auditLog", {
      eventId: args.id,
      actorId: admin._id,
      action: "status_change_forced",
      fromValue: event.status,
      toValue: args.status,
      metadata: {},
      timestamp: Date.now(),
    });

    // Notify host for visibility
    await ctx.db.insert("notifications", {
      userId: event.hostId,
      type: "status_change",
      eventId: args.id,
      message: `Event status updated by admin to ${args.status}`,
      createdAt: Date.now(),
    });

    return null;
  },
});

// Admin: update arbitrary event fields at any time
export const adminUpdateFields = mutation({
  args: {
    id: v.id("events"),
    // Accept a shallow partial of event fields; rely on server-side normalization + validators elsewhere
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
    lumaUrl: v.optional(v.string()),
    onCalendar: v.optional(v.boolean()),
    checklistTemplate: v.optional(v.string()),
    agreementAcceptedAt: v.optional(v.number()),
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

    const { id, ...data } = args;
    const update = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    if (Object.keys(update).length === 0) return null;

    const before = await ctx.db.get(id);
    await ctx.db.patch(id, update as any);

    await ctx.db.insert("auditLog", {
      eventId: id,
      actorId: admin._id,
      action: "admin_update_fields",
      fromValue: before,
      toValue: update,
      metadata: {},
      timestamp: Date.now(),
    });

    return null;
  },
});

// Basic checklist templates embedded for server-side generation
const CHECKLIST_TEMPLATES: Record<
  string,
  {
    sections: Record<string, Array<{ id: string; task: string; daysBeforeEvent: number }>>;
  }
> = {
  general: {
    sections: {
      planning: [
        { id: "p1", task: "Finalize agenda", daysBeforeEvent: 14 },
        { id: "p2", task: "Confirm venue details", daysBeforeEvent: 10 },
      ],
      marketing: [
        { id: "m1", task: "Post event announcement", daysBeforeEvent: 12 },
        { id: "m2", task: "Share on social channels", daysBeforeEvent: 7 },
      ],
      logistics: [
        { id: "l1", task: "Confirm A/V setup", daysBeforeEvent: 3 },
        { id: "l2", task: "Prepare signage", daysBeforeEvent: 1 },
      ],
    },
  },
};

function generateChecklist(template: string, eventDateIso?: string) {
  const config = CHECKLIST_TEMPLATES[template] ?? CHECKLIST_TEMPLATES.general;
  const baseDate = eventDateIso ? new Date(eventDateIso) : undefined;
  const items: Array<{
    id: string;
    task: string;
    completed: boolean;
    dueDate?: string;
    section: string;
  }> = [];
  for (const [section, tasks] of Object.entries(config.sections)) {
    for (const t of tasks) {
      let dueDate: string | undefined = undefined;
      if (baseDate && !Number.isNaN(baseDate.getTime())) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - t.daysBeforeEvent);
        dueDate = d.toISOString();
      }
      items.push({ id: `${template}-${t.id}`, task: t.task, completed: false, dueDate, section });
    }
  }
  items.sort((a, b) => {
    const ta = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
  return items;
}

// Generate and save checklist items for an event (owner or admin)
export const generateChecklistForEvent = mutation({
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

    const ev = await ctx.db.get(args.id);
    if (!ev) throw new Error("Event not found");
    const isOwner = ev.hostId === user._id;
    const isAdmin = user.role === "admin";
    if (!(isOwner || isAdmin)) throw new Error("Unauthorized");

    const normalized = normalizeEvent(ev);
    const checklist = generateChecklist(normalized.checklistTemplate, normalized.eventDate);
    await ctx.db.patch(args.id, { checklist });
    return null;
  },
});

// Toggle a checklist item's completion state (owner or admin)
export const toggleChecklistItem = mutation({
  args: { id: v.id("events"), itemId: v.string(), completed: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const ev = await ctx.db.get(args.id);
    if (!ev) throw new Error("Event not found");
    const isOwner = ev.hostId === user._id;
    const isAdmin = user.role === "admin";
    if (!(isOwner || isAdmin)) throw new Error("Unauthorized");

    const normalized = normalizeEvent(ev);
    const updated = normalized.checklist.map((it: any) =>
      it.id === args.itemId ? { ...it, completed: args.completed ?? !it.completed } : it
    );
    await ctx.db.patch(args.id, { checklist: updated });
    return null;
  },
});

// Derive venue conflicts for an event by id (simple same-date & same-venue match)
export const getVenueConflictsById = query({
  args: { id: v.id("events") },
  returns: v.array(
    v.object({
      _id: v.id("events"),
      title: v.string(),
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
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!user) return [];

    const ev = await ctx.db.get(args.id);
    if (!ev) return [];

    // Owners can see conflicts for their own event; admins can see any
    if (user.role !== "admin" && ev.hostId !== user._id) return [];

    const normalized = normalizeEvent(ev);
    if (!normalized.eventDate || !normalized.venue) return [];

    // Query by date using index, then filter by venue and exclude self
    const sameDay = await ctx.db
      .query("events")
      .withIndex("by_eventDate", (q) => q.eq("eventDate", normalized.eventDate))
      .collect();

    const conflicts = sameDay
      .filter((e) => e._id !== ev._id && normalizeEvent(e).venue === normalized.venue)
      .map((e) => {
        const n = normalizeEvent(e);
        return {
          _id: n._id,
          title: n.title,
          eventDate: n.eventDate,
          venue: n.venue,
          status: n.status,
        };
      });

    return conflicts;
  },
});
