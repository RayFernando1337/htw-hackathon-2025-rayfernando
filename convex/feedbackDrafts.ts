import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";

export const get = query({
  args: { eventId: v.id("events"), fieldPath: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const draft = await ctx.db
      .query("feedbackDrafts")
      .withIndex("by_event_field_author", (q: any) =>
        q.eq("eventId", args.eventId).eq("fieldPath", args.fieldPath).eq("authorId", user._id)
      )
      .unique();
    return draft;
  },
});

export const upsert = mutation({
  args: {
    eventId: v.id("events"),
    fieldPath: v.string(),
    reason: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existing = await ctx.db
      .query("feedbackDrafts")
      .withIndex("by_event_field_author", (q: any) =>
        q.eq("eventId", args.eventId).eq("fieldPath", args.fieldPath).eq("authorId", user._id)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        reason: args.reason,
        message: args.message,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("feedbackDrafts", {
        eventId: args.eventId,
        fieldPath: args.fieldPath,
        authorId: user._id,
        reason: args.reason,
        message: args.message,
        updatedAt: Date.now(),
      });
    }
  },
});

export const clear = mutation({
  args: { eventId: v.id("events"), fieldPath: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existing = await ctx.db
      .query("feedbackDrafts")
      .withIndex("by_event_field_author", (q: any) =>
        q.eq("eventId", args.eventId).eq("fieldPath", args.fieldPath).eq("authorId", user._id)
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
