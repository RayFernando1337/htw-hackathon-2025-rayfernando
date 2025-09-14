# Lib Directory Guidelines

## Purpose
- Shared utilities, types, and validation logic used across app and components.
- Keep framework-agnostic where possible; avoid React hooks in `lib/`.

## Conventions
- Filenames: kebab-case; exports are named unless there’s a clear default.
- Path alias `@/*` is enabled; import via `@/lib/...`.
- Prefer TypeScript types/interfaces; no runtime side effects at import.

## Validation
- Colocate schemas (e.g., `validations/`) and export helpers for forms and Convex.
- Keep client and server validation in sync; reuse shared schemas when feasible.

## Examples
- `lib/utils.ts`: class merging via `cn`.
- `lib/validations/event.ts`: form steps and guards; update alongside Convex validators.
