# Convex Directory Guidelines

## Functions & Validators
- Use `query`, `mutation`, `action`; internal variants for server-only (`internal*`).
- Always define `args` and `returns` validators; prefer `convex/values` and Zod helpers when needed.
- Check auth early: `const identity = await ctx.auth.getUserIdentity()`.

## Database & Indexes
- Define tables and indexes in `schema.ts` with descriptive names.
- Query via `.withIndex()`; avoid `.filter()` on large sets; use `.unique()` when expecting one.
- Keep mutations small and fast; use `scheduler` for background work.

## HTTP & Webhooks
- Define HTTP routes in `http.ts` via `httpRouter`; keep webhook secrets in Convex env, not `.env.local`.

## File Organization
- Public API surface mirrors filenames: import from `convex/_generated/api`.
- Do not edit files under `_generated/`.

## Local Dev
- Run `bunx convex dev` (or `npx convex dev`) to start Convex and generate types.
- Coordinate with Next.js dev server for end-to-end testing.
