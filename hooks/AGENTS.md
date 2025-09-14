# Hooks Directory Guidelines

## Purpose
- Reusable React hooks prefixed with `use*` for view logic and client-side behavior.

## Constraints
- Hooks must not run server-only code; they execute in the browser.
- No Convex writes inside hooks by default; expose callbacks that call mutations from components.
- Handle subscriptions and cleanup correctly; avoid memory leaks.

## Conventions
- Filenames: `use-thing.ts` or `useThing.ts` (prefer kebab-case).
- Keep hooks single-purpose; return stable shapes `{ data, isLoading, error, ...actions }`.
- Document required providers (e.g., Convex client, Clerk) in JSDoc.

## Testing
- Use React Testing Library hooks utilities; mock Convex where necessary.
