# App Directory Guidelines

## Routing & Structure
- Use Next.js App Router: each segment contains `page.tsx`/`layout.tsx`.
- Grouped routes like `(landing)/` are for layout-only segmentation; avoid importing across groups unless shared via `components/`.
- Dynamic routes: `[id]/page.tsx`; colocate sub-pages under the segment.

## Server vs Client
- Default to server components in `app/` pages/layouts. Add `"use client"` only when hooks or browser APIs are required.
- Keep data fetching server-side when possible; pass minimal props to client components.

## Auth & Roles
- Use Clerk for auth; respect role gating (host/admin) in dashboards.
- Protect pages via server checks or middleware; do not expose admin UI to hosts.

## Data & Convex
- Interactivity lives in client components under `components/`; call Convex via the client provider.
- For simple reads in server components, prefer server-friendly fetch or server actions; avoid leaking secrets.

## Conventions
- File names: lower-case with dashes for folders; components in PascalCase.
- Styling: Tailwind v4 utilities; keep layout in pages minimal and delegate UI to `components/`.
- Do not import from `convex/_generated/*` directly in server components; client components use the Convex client.
