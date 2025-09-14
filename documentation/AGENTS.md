# Documentation Directory Guidelines

## Purpose
- Living specs, plans, and notes. Source of truth for workflows and acceptance criteria.

## Structure
- `features/`: planned and completed phases per feature.
- `README.md`: entry point for documentation.
- Keep phase docs concise with acceptance tests and screenshots where helpful.

## Conventions
- Use Markdown with clear headings and checklists.
- Link to relevant code paths (e.g., `app/dashboard/...`, `convex/events.ts`).
- Update docs alongside code changes that affect UX or data flows.

## Don’ts
- Do not place secrets or environment keys here.
- Avoid duplicating `README.md` root content; reference instead.
