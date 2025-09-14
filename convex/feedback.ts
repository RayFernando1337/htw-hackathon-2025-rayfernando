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

    // TODO: send notification to host

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
  // Structured return for UI: thread with comments and author names
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return [];

    // Anyone authenticated can see threads if they can view the event via page-level gating.
    const threads = await ctx.db
      .query("feedbackThreads")
      .withIndex("by_event", (q: any) => q.eq("eventId", args.eventId))
      .collect();

    const result = [] as any[];
    for (const t of threads) {
      const comments = await ctx.db
        .query("feedbackComments")
        .withIndex("by_thread", (q: any) => q.eq("threadId", t._id))
        .order("asc")
        .collect();

      // Preload authors
      const authorIds = [...new Set(comments.map((c) => c.authorId))];
      const authorsMap = new Map<Id<"users">, any>();
      for (const aid of authorIds) {
        const a = await ctx.db.get(aid);
        if (a) authorsMap.set(aid, a);
      }

      result.push({
        _id: t._id,
        eventId: t.eventId,
        fieldPath: t.fieldPath,
        status: t.status,
        reason: t.reason,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt,
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
    const threads = await ctx.db
      .query("feedbackThreads")
      .withIndex("by_event", (q: any) => q.eq("eventId", args.eventId))
      .collect();
    return threads.filter((t: any) => t.status === "open").length;
  },
});

export const getAuditByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("auditLog")
      .withIndex("by_event", (q: any) => q.eq("eventId", args.eventId))
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
