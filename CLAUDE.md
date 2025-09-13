# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Next.js 15 SaaS starter template with integrated authentication (Clerk), real-time database (Convex), and subscription billing (Clerk Billing).

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack on http://localhost:3000
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm run lint` - Run Next.js linting

### Convex Development
- `npx convex dev` - Start Convex development server (required for database)
- Run this in a separate terminal alongside `npm run dev`

## Architecture Overview

### Tech Stack
- **Next.js 15** with App Router and Turbopack
- **Convex** for real-time database and serverless functions
- **Clerk** for authentication and user management
- **Clerk Billing** for subscription payments
- **TailwindCSS v4** with custom UI components (shadcn/ui)
- **TypeScript** throughout

### Key Architectural Patterns

#### Authentication Flow
1. Clerk handles all authentication via `middleware.ts`
2. JWT tokens are configured with "convex" template in Clerk dashboard
3. Users are synced to Convex via webhooks at `/api/clerk-users-webhook`
4. Protected routes redirect unauthenticated users to sign-in

#### Database Architecture
- **Convex** provides real-time sync and serverless functions
- Schema defined in `convex/schema.ts`:
  - `users` table: Synced from Clerk (externalId maps to Clerk ID)
  - `paymentAttempts` table: Tracks subscription payments
- All database operations in `convex/` directory

#### Payment Integration
1. Clerk Billing handles subscription management
2. Custom pricing component in `components/custom-clerk-pricing.tsx`
3. Payment-gated content uses `<ClerkBillingGate>` component
4. Webhook events update payment status in Convex

### Project Structure
```
app/
├── (landing)/         # Public landing page components
├── dashboard/         # Protected dashboard area
│   └── payment-gated/ # Subscription-only content
├── layout.tsx         # Root layout with providers
└── middleware.ts      # Auth protection

components/
├── ui/               # shadcn/ui components
├── custom-clerk-pricing.tsx
└── ConvexClientProvider.tsx

convex/
├── schema.ts         # Database schema
├── users.ts          # User CRUD operations
├── paymentAttempts.ts # Payment tracking
├── http.ts           # Webhook handlers
└── auth.config.ts    # JWT configuration
```

## Key Integration Points

### Environment Variables Required
- `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` (from Clerk JWT template)
- `CLERK_WEBHOOK_SECRET` (set in Convex dashboard)

### Webhook Configuration
Clerk webhooks must be configured to:
- Endpoint: `{your_domain}/api/clerk-users-webhook`
- Events: `user.created`, `user.updated`, `user.deleted`, `paymentAttempt.updated`

### Real-time Data Flow
1. UI components use Convex hooks (`useQuery`, `useMutation`)
2. Convex provides automatic real-time updates
3. Authentication context from `useAuth()` (Clerk)
4. User data synced between Clerk and Convex

## Shadcn Component Installation Rules
When installing shadcn/ui components:
- ALWAYS use `bunx --bun shadcn@latest add [component-name]` instead of `npx`
- If dependency installation fails, manually install with `bun add [dependency-name]`
- Check components.json for existing configuration before installing
- Verify package.json after installation to ensure dependencies were added
- Multiple components can be installed at once: `bunx --bun shadcn@latest add button card drawer`
- Component path is configured as `@/components/ui`

## Convex Function Patterns
When writing Convex functions:
- Use Zod validators: `import { z } from "zod"`
- Import from `convex-helpers/server/zod` for Convex-specific validators
- Pattern for queries: `export const getFoo = query({ args: { id: v.id("foos") }, handler: async (ctx, args) => {...} })`
- Pattern for mutations: `export const createFoo = mutation({ args: { ...zodSchema }, handler: async (ctx, args) => {...} })`
- Always check authentication: `const identity = await ctx.auth.getUserIdentity()`
- Use `ctx.db` for database operations

## Event Platform Domain Model (Planned)
The application will manage events with the following workflow:
1. **Draft** → Host creates/edits event
2. **Submitted** → Admin reviews with field-level feedback
3. **Approved** → Admin approves for publishing
4. **Published** → Synced to Lu.ma, visible publicly

Key entities to implement:
- `events`: Core event data with state machine
- `feedbackThreads`: Field-level comments for review
- `auditLog`: Track all changes for compliance
- `eventChecklists`: Dynamic requirements by event type

## Feature Development Workflow
1. Feature specs start in `documentation/features/planned/`
2. Move to `active/` when development begins
3. Archive to `completed/[feature-name]/` when done
4. Follow naming convention: `[feature-name]-[status].md`
5. Consult `/documentation/features/planned/htw-event-platform-mvp-plan.md` for roadmap

## Important Development Notes
- The project uses Bun as package manager - use `bun` commands, not `npm` for installing packages
- Convex functions require both servers running: `bun run dev` AND `bunx convex dev`
- All UI updates are real-time via Convex - no manual refresh needed
- Follow existing patterns in `.cursor/rules/` for consistency
- Check `documentation/AGENTS.md` for AI agent collaboration guidelines

## Directory-Specific Guidelines
When working in specific directories, consult the local CLAUDE.md files:
- `/convex/CLAUDE.md` - Convex backend functions, validators, and database patterns
- `/app/CLAUDE.md` - Next.js app router, React hooks, and frontend patterns
- `/components/CLAUDE.md` - Component structure, shadcn/ui usage, and styling guidelines
