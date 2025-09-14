import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";
import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    // Determine role based on email domain or metadata
    const role = determineUserRole(data.email_addresses);

    const userAttributes = {
      name: `${data.first_name} ${data.last_name}`,
      externalId: data.id,
      role: role,
      onboardingCompleted: false,
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

// Role detection function
export const determineUserRole = (emailAddresses: any[]): "host" | "admin" => {
  const primaryEmail = emailAddresses.find((e) => e.primary)?.email_address;
  if (!primaryEmail) return "host"; // default to host if no email found

  // Admin emails from environment or hardcoded list
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [
    "admin@htw.com",
    "staff@htw.com",
    "smile@rayfernando.com",
    // Add more admin emails here
  ];

  return adminEmails.includes(primaryEmail.toLowerCase()) ? "admin" : "host";
};

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(`Can't delete user, there is none for Clerk user ID: ${clerkUserId}`);
    }
  },
});

// Update user profile during onboarding
export const updateProfile = internalMutation({
  args: {
    orgName: v.optional(v.string()),
    website: v.optional(v.string()),
    socials: v.optional(
      v.object({
        linkedin: v.optional(v.string()),
        x: v.optional(v.string()),
        instagram: v.optional(v.string()),
      })
    ),
    onboardingCompleted: v.optional(v.boolean()),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      ...args,
    });
  },
});

// Public mutation for onboarding completion
export const completeOnboarding = mutation({
  args: {
    orgName: v.optional(v.string()),
    website: v.optional(v.string()),
    socials: v.optional(
      v.object({
        linkedin: v.optional(v.string()),
        x: v.optional(v.string()),
        instagram: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      ...args,
      onboardingCompleted: true,
    });
  },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}
