# CLAUDE.md - Convex Backend

This file provides guidance to Claude Code when working with Convex backend functions in this directory.

## Function Syntax Requirements

### Always Use New Function Syntax
```typescript
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const myFunction = query({
  args: { id: v.id("users") },
  returns: v.object({ name: v.string() }),
  handler: async (ctx, args) => {
    // Implementation
  }
});
```

### Function Types
- **Public Functions**: `query`, `mutation`, `action` - exposed to client
- **Internal Functions**: `internalQuery`, `internalMutation`, `internalAction` - only callable from other Convex functions
- ALWAYS include `args` and `returns` validators, even if empty: `args: {}, returns: v.null()`

## Validator Patterns

### Common Validators
- IDs: `v.id("tableName")`
- Nullable values: `v.null()` or `v.optional(v.string())`
- Arrays: `v.array(v.string())`
- Objects: `v.object({ field: v.string() })`
- Unions: `v.union(v.literal("draft"), v.literal("published"))`
- Records: `v.record(v.id("users"), v.string())`

### Zod Integration
For complex validation, use Zod with convex-helpers:
```typescript
import { z } from "zod";
import { zCustomQuery, zCustomMutation } from "convex-helpers/server/zod";

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.date()
});

export const createEvent = zCustomMutation(mutation, {
  args: eventSchema,
  handler: async (ctx, args) => {
    // args is typed from Zod schema
  }
});
```

## Database Operations

### Queries
- ALWAYS use indexes instead of `.filter()`: `ctx.db.query("table").withIndex("by_field", q => q.eq("field", value))`
- Use `.unique()` for single document (throws if multiple)
- Use `.take(n)` to limit results
- Default order is ascending by `_creationTime`

### Mutations
- Insert: `ctx.db.insert("table", data)`
- Update: `ctx.db.patch(id, updates)` (shallow merge)
- Replace: `ctx.db.replace(id, fullDoc)` (complete replacement)
- Delete: `ctx.db.delete(id)`

### Transactions
- Keep under 100ms and few hundred records
- Use `ctx.runMutation` for multiple operations
- Check authentication early: `const identity = await ctx.auth.getUserIdentity()`

## HTTP Endpoints
Define ONLY in `convex/http.ts`:
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();
http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // Handle webhook
  })
});
export default http;
```

## Clerk Integration
- User sync via webhooks in `http.ts`
- Always check auth: `const identity = await ctx.auth.getUserIdentity()`
- Map Clerk ID to Convex user: `ctx.db.query("users").withIndex("by_externalId", q => q.eq("externalId", identity.subject))`

## File References
- Public functions: `api.module.functionName`
- Internal functions: `internal.module.functionName`
- Import from `convex/_generated/api`

## Performance Tips
- Define indexes for all query patterns in `schema.ts`
- Name indexes descriptively: `by_channel_and_status`
- Query index fields in exact order defined
- Use `.paginate()` for large result sets

## Common Patterns

### User Authentication Check
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Unauthenticated");
}
const user = await ctx.db
  .query("users")
  .withIndex("by_externalId", q => q.eq("externalId", identity.subject))
  .unique();
```

### Scheduling Background Work
```typescript
await ctx.scheduler.runAfter(0, internal.module.functionName, { args });
```

### Real-time Subscriptions
Queries automatically create real-time subscriptions - no special handling needed.

## DO NOT
- Use deprecated validators like `v.bigint()` - use `v.int64()`
- Call actions from browser - schedule via mutations
- Use `ctx.db` in actions - they don't have database access
- Pass functions directly to schedulers - use function references
- Use `.filter()` in queries - define and use indexes instead