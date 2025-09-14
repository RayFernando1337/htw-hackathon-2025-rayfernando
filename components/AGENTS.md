# Components Directory Guidelines

## Structure & Placement
- `components/ui/`: shadcn primitives; generated via `bunx --bun shadcn@latest add <component>`.
- Higher-level composites and feature pieces live in `components/`.

## Styling & Conventions
- Tailwind v4 utilities; avoid long arbitrary values.
- Use `cn` from `lib/utils.ts` for class merging.
- Filenames: kebab-case; exported symbols: PascalCase.
- Expose `className` on root where appropriate; keep accessible structure (Radix patterns).

## Client Components
- Most components here are client by default; add `"use client"` when hooks are used.
- Keep logic lean; heavy data work stays in Convex or server components.

## Adding UI
- Install via shadcn generator; do not hand-copy.
- Place primitives in `components/ui/`, compose in sibling directories.

## Testing
- Prefer React Testing Library for units: `*.test.tsx` colocated.
- Snapshot only for stable primitives; test behavior for composites.
