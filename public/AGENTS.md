# Public Directory Guidelines

## Purpose
- Static assets only (images, icons, JSON). No secrets or code.

## Conventions
- Filenames: lowercase with hyphens, e.g., `hero-graphic.png`.
- Prefer `next/image` for images referenced in `app/`.
- Place favicons and manifest at the project root or `public/` as appropriate.

## Don’ts
- Do not import server-only data into `public/`.
- Do not store environment files here.
