import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    // this the Clerk ID, stored in the subject JWT field
    externalId: v.string(),
    // NEW FIELDS FOR HTW EVENT PLATFORM
    role: v.union(v.literal("host"), v.literal("admin")),
    orgName: v.optional(v.string()),
    website: v.optional(v.string()),
    socials: v.optional(
      v.object({
        linkedin: v.optional(v.string()),
        x: v.optional(v.string()),
        instagram: v.optional(v.string()),
      })
    ),
    onboardingCompleted: v.boolean(),
  })
    .index("byExternalId", ["externalId"])
    .index("byRole", ["role"]),

  // Extended profile data
  userProfiles: defineTable({
    userId: v.id("users"),
    bio: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        emailNotifications: v.boolean(),
        smsNotifications: v.boolean(),
      })
    ),
  }).index("byUserId", ["userId"]),

  // Events table for HTW Event Platform
  events: defineTable({
    // Ownership
    hostId: v.id("users"),

    // Status machine
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("changes_requested"),
      v.literal("resubmitted"),
      v.literal("approved"),
      v.literal("published")
    ),

    // Fillout field mappings
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

    // Post-approval fields
    lumaUrl: v.optional(v.string()),
    onCalendar: v.boolean(),

    // Agreement & metadata
    agreementAcceptedAt: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),

    // Checklist
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
    .index("by_host", ["hostId"])
    .index("by_status", ["status"])
    .index("by_eventDate", ["eventDate"]),

  // Field-anchored feedback threads
  feedbackThreads: defineTable({
    eventId: v.id("events"),
    fieldPath: v.string(),
    openedBy: v.id("users"),
    status: v.union(v.literal("open"), v.literal("resolved")),
    reason: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"]) // query all threads for an event
    .index("by_event_field", ["eventId", "fieldPath"]) // locate specific field thread
    .index("by_status", ["status"]),

  feedbackComments: defineTable({
    threadId: v.id("feedbackThreads"),
    authorId: v.id("users"),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),

  // Audit log for state changes
  auditLog: defineTable({
    eventId: v.id("events"),
    actorId: v.id("users"),
    action: v.string(),
    fromValue: v.optional(v.any()),
    toValue: v.optional(v.any()),
    metadata: v.optional(v.object({
      fieldPath: v.optional(v.string()),
      reason: v.optional(v.string()),
    })),
    timestamp: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_actor", ["actorId"]),

  // Keep existing payment attempts
  paymentAttempts: defineTable(paymentAttemptSchemaValidator)
    .index("byPaymentId", ["payment_id"])
    .index("byUserId", ["userId"])
    .index("byPayerUserId", ["payer.user_id"]),
});
