import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getCurrentUserOrThrow } from "./users";

async function logAction(
  ctx: any,
  params: {
    eventId: Id<"events">;
    actorId: Id<"users">;
    action: string;
    fromValue?: any;
    toValue?: any;
    metadata?: { fieldPath?: string; reason?: string };
  }
) {
  await ctx.db.insert("auditLog", {
    eventId: params.eventId,
    actorId: params.actorId,
    action: params.action,
    fromValue: params.fromValue,
    toValue: params.toValue,
    metadata: params.metadata,
    timestamp: Date.now(),
  });
}

export const createThread = mutation({
  args: {
    eventId: v.id("events"),
    fieldPath: v.string(),
    message: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.id("feedbackThreads"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
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

    await logAction(ctx, {
    eventId: args.eventId,
    actorId: user._id,
    action: "feedback_added",
    metadata: { fieldPath: args.fieldPath, reason: args.reason },
    });

    // Create notification for host
    const event = await ctx.db.get(args.eventId);
    if (event) {
    await ctx.db.insert("notifications", {
    userId: event.hostId,
      type: "feedback",
    eventId: args.eventId,
    message: `Feedback added on ${args.fieldPath}`,
    createdAt: Date.now(),
    });
    }

    // Clear any draft for this field by this admin
      const existingDraft = await ctx.db
      .query("feedbackDrafts")
      .withIndex("by_event_field_author", (q) =>
        q.eq("eventId", args.eventId).eq("fieldPath", args.fieldPath).eq("authorId", user._id)
      )
      .unique();
    if (existingDraft) await ctx.db.delete(existingDraft._id);

    return threadId;
  },
});

export const addComment = mutation({
  args: {
    threadId: v.id("feedbackThreads"),
    message: v.string(),
  },
  returns: v.id("feedbackComments"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    const event = await ctx.db.get(thread.eventId);
    if (!event) throw new Error("Event not found");

    // Allow admin or the host of the event to comment
    if (!(user.role === "admin" || user._id === event.hostId)) {
      throw new Error("Unauthorized");
    }

    const commentId = await ctx.db.insert("feedbackComments", {
      threadId: args.threadId,
      authorId: user._id,
      message: args.message,
      createdAt: Date.now(),
    });

    await logAction(ctx, {
      eventId: thread.eventId,
      actorId: user._id,
      action: "feedback_commented",
      metadata: { fieldPath: thread.fieldPath },
    });

    return commentId;
  },
});

export const resolveThread = mutation({
  args: {
    threadId: v.id("feedbackThreads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    if (user.role !== "admin") throw new Error("Unauthorized");

    await ctx.db.patch(args.threadId, { status: "resolved", resolvedAt: Date.now() });

    await logAction(ctx, {
      eventId: thread.eventId,
      actorId: user._id,
      action: "feedback_resolved",
      metadata: { fieldPath: thread.fieldPath },
    });
  },
});

export const getThreadsByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  returns: v.array(
    v.object({
      _id: v.id("feedbackThreads"),
      eventId: v.id("events"),
      fieldPath: v.string(),
      status: v.union(v.literal("open"), v.literal("resolved")),
      reason: v.optional(v.string()),
      createdAt: v.number(),
      resolvedAt: v.optional(v.number()),
      lastActivity: v.number(),
      comments: v.array(
        v.object({
          _id: v.id("feedbackComments"),
          message: v.string(),
          createdAt: v.number(),
          author: v.object({ _id: v.id("users"), name: v.string() }),
        })
      ),
    })
  ),
  // Structured return for UI: thread with comments and author names
  handler: async (ctx, args) => {
    // Enforce access: only admins or the host of the event may view threads
    const current = await getCurrentUserOrThrow(ctx);
    const ev = await ctx.db.get(args.eventId);
    if (!ev) return [];
    const canView = current.role === "admin" || current._id === ev.hostId;
    if (!canView) return [];

    const threads = await ctx.db
      .query("feedbackThreads")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const result = [] as any[];
    for (const t of threads) {
      const comments = await ctx.db
        .query("feedbackComments")
        .withIndex("by_thread", (q) => q.eq("threadId", t._id))
        .order("asc")
        .collect();

      // Preload authors
      const authorIds = [...new Set(comments.map((c) => c.authorId))];
      const authorsMap = new Map<Id<"users">, any>();
      for (const aid of authorIds) {
        const a = await ctx.db.get(aid);
        if (a) authorsMap.set(aid, a);
      }

      const lastActivity = comments.length ? comments[comments.length - 1].createdAt : t.createdAt;
      result.push({
        _id: t._id,
        eventId: t.eventId,
        fieldPath: t.fieldPath,
        status: t.status,
        reason: t.reason,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt,
        lastActivity,
        comments: comments.map((c) => ({
          _id: c._id,
          message: c.message,
          createdAt: c.createdAt,
          author: {
            _id: c.authorId,
            name: authorsMap.get(c.authorId)?.name ?? "User",
          },
        })),
      });
    }

    return result;
  },
});

export const getOpenThreadCountByEvent = query({
  args: { eventId: v.id("events") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const openThreads = await ctx.db
      .query("feedbackThreads")
      .withIndex("by_event_and_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "open")
      )
      .collect();
    return openThreads.length;
  },
});

export const getAuditByEvent = query({
  args: { eventId: v.id("events") },
  returns: v.array(
    v.object({
      _id: v.id("auditLog"),
      action: v.string(),
      timestamp: v.number(),
      fromValue: v.optional(v.any()),
      toValue: v.optional(v.any()),
      metadata: v.optional(
        v.object({
          fieldPath: v.optional(v.string()),
          reason: v.optional(v.string()),
          fieldsWithIssues: v.optional(v.array(v.string())),
        })
      ),
      actor: v.object({ _id: v.id("users"), name: v.string() }),
    })
  ),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("auditLog")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();

    // Attach actor names
    const actors = new Map<Id<"users">, any>();
    const result = [] as any[];
    for (const it of items) {
      if (!actors.has(it.actorId)) {
        const a = await ctx.db.get(it.actorId);
        if (a) actors.set(it.actorId, a);
      }
      result.push({
        _id: it._id,
        action: it.action,
        timestamp: it.timestamp,
        fromValue: it.fromValue,
        toValue: it.toValue,
        metadata: it.metadata,
        actor: { _id: it.actorId, name: actors.get(it.actorId)?.name ?? "User" },
      });
    }

    return result;
  },
});
