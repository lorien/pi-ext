# ADR-0004: Biome for lint and format

Date: 2026-09-10
Status: accepted

## Context

`spec/docs/conventions.md` specified a code style — double quotes,
semicolons, two-space indentation — and a Markdown style with an
88-character cap, but nothing enforced the code rules. The repository had
a type checker (`tsc --noEmit`) and a test runner (`node:test`), and no
linter or formatter at all.

Unenforced style drifts. It also costs review attention: without a
formatter, every change can introduce cosmetic noise, and an agent
following the conventions has no way to confirm it complied.

## Decision

Adopt Biome as the single linter and formatter, configured in
`biome.json`:

- The formatter is enabled with two-space indentation, a 88-character
  line width, double quotes, semicolons, and trailing commas. The line
  width matches the Markdown cap, so there is one number to remember.
- The recommended lint set is enabled.
- Import organization is enabled, which is what put `node:` built-ins
  ahead of package imports in the existing sources.
- Source control integration reads `.gitignore`, so `node_modules/` and
  the lockfile are skipped without a second ignore list.
- `npm run lint` checks; `npm run format` applies.
- Biome covers TypeScript and JSON. It does not process Markdown, so the
  Markdown rules remain checked by hand as described in `testing.md`.

## Alternatives rejected

- `eslint` with `typescript-eslint`, plus `prettier`. The best choice if
  type-aware rules are needed, and the only option that catches promise
  misuse reliably. Rejected because it is two tools and a large dependency
  tree to enforce rules that are almost entirely formatting, in a
  repository of roughly 350 lines.
- `oxlint`, optionally with `oxfmt`. Fastest, and ESLint-compatible. The
  gain over Biome is speed that does not matter at this size, and its
  formatting story was less settled at the time of writing.
- `eslint` alone with stylistic rules disabled. Leaves formatting
  unenforced, which is the problem being solved.
- No linter or formatter, relying on review and on the written
  conventions. This is the state being replaced: the conventions were
  correct but unverifiable.
- Editor-only formatting. It does not apply to agents, to contributors
  with different editors, or to anything scripted.

## Consequences

- One more development dependency, and the first one that is not a type
  checker. The package still ships no runtime dependency.
- Type-aware lint rules are not available, so `tsc` remains the only
  type-level gate and promise-misuse patterns are not caught
  automatically. If that becomes a real risk, this decision is the one to
  revisit; the alternative is recorded above.
- Markdown is outside the tool. That asymmetry is deliberate and is
  documented in `conventions.md` and `testing.md` rather than hidden.
