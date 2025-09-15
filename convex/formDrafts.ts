import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const draft = await ctx.db
      .query("formDrafts")
      .withIndex("by_user_key", (q) => q.eq("userId", user._id).eq("key", args.key))
      .unique();
    return draft;
  },
});

export const upsert = mutation({
  args: { key: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existing = await ctx.db
      .query("formDrafts")
      .withIndex("by_user_key", (q) => q.eq("userId", user._id).eq("key", args.key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { data: args.data, updatedAt: Date.now() });
      return existing._id;
    } else {
      return await ctx.db.insert("formDrafts", {
        userId: user._id,
        key: args.key,
        data: args.data,
        updatedAt: Date.now(),
      });
    }
  },
});

export const clear = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existing = await ctx.db
      .query("formDrafts")
      .withIndex("by_user_key", (q) => q.eq("userId", user._id).eq("key", args.key))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
