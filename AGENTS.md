# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router (routes, `layout.tsx`, `page.tsx`, global styles).
- `components/`: Reusable UI (shadcn/Tailwind v4), form steps, providers.
- `convex/`: Convex schema and functions (queries/mutations, `schema.ts`).
- `lib/` and `hooks/`: Client helpers, validation, and React hooks.
- `public/`: Static assets. `documentation/`: Product and feature specs.

## Directory Guides
- `app/AGENTS.md`: Routing, server/client components, auth/roles.
- `components/AGENTS.md`: shadcn/Tailwind patterns, UI placement, naming.
- `convex/AGENTS.md`: Functions, validators, indexes, HTTP endpoints.
- `lib/AGENTS.md`: Utilities, validation, typing conventions.
- `hooks/AGENTS.md`: Custom hooks patterns and constraints.
- `documentation/AGENTS.md`: Doc structure and contribution rules.
- `public/AGENTS.md`: Static asset guidelines.

## Build, Test, and Development Commands
- `bun dev` or `npm run dev`: Run Next.js with Turbopack.
- `bun run build` or `npm run build`: Production build.
- `bun start` or `npm start`: Start built app.
- `bunx convex dev` or `npx convex dev`: Run Convex locally (pulls env + generates `_generated/`).
- `bun run lint` or `npm run lint`: ESLint via Next.

## Coding Style & Naming Conventions
- Language: TypeScript (strict, noEmit). Path alias `@/*`.
- Indentation: 2 spaces; prefer named exports when sensible.
- React: Functional components; files in `components/` use kebab-case filenames and PascalCase component names.
- Next.js: Route segments in `app/` with `page.tsx`/`layout.tsx`; group routes like `(landing)/` when needed.
- Styling: Tailwind v4 utilities; avoid inline styles unless required. Use shadcn components via `bunx --bun shadcn@latest add <component>`.

## Testing Guidelines
- No formal test runner is configured. Use acceptance flows in `README.md` (e.g., Draft → Submit → Approve → Publish) for manual QA.
- If adding tests: prefer Playwright for e2e and React Testing Library for components. Name tests `*.test.ts(x)` colocated with source.
- Keep coverage focused on critical flows (submission, role gating, state transitions).

## Commit & Pull Request Guidelines
- Commits: Imperative, present tense summaries (e.g., “Refactor event form layout”), with optional body for rationale and scope.
- Branches: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`.
- PRs: Include concise description, linked issues, screenshots for UI, env/setup notes, and test steps referencing acceptance scenarios.

## Security & Configuration Tips
- Secrets: Use `.env.local`; never commit keys. Clerk webhook secret belongs in Convex project env, not `.env.local`.
- Required env: Clerk publishable/secret keys, frontend API URL, redirect URLs; Convex env is auto-loaded by `convex dev`.
- Validate inputs on both client (`lib/validations`) and server (Convex validators) before writes.

References
- `CLAUDE.md` files in repo directories for deeper patterns.
- `.cursor/rules/*.mdc` for shadcn, Convex, and Bun usage specifics.
