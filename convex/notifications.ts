import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getCurrentUserOrThrow } from "./users";

export const create = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    eventId: v.optional(v.id("events")),
    message: v.string(),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      eventId: args.eventId,
      message: args.message,
      createdAt: Date.now(),
    });
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== user._id) throw new Error("Unauthorized");
    await ctx.db.patch(args.id, { readAt: Date.now() });
  },
});

export const markAllRead = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const list = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const unread = list.filter((n) => !n.readAt);
    for (const n of unread) {
      await ctx.db.patch(n._id, { readAt: Date.now() });
    }
    return unread.length;
  },
});

export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const list = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return list;
  },
});
