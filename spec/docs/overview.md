# Overview

pi-ext is a pi package: one repository that ships pi extensions and skills.
An extension is a TypeScript module that adds tools, commands, flags, or
interface elements to pi. A skill is a directory containing a `SKILL.md`
that teaches pi a procedure.

## Purpose

Provide small, focused additions to pi that are useful on their own and do
not depend on each other. The repository is a container, not a framework:
each extension is a standalone module under `extensions/`, loaded from
source with no build step.

## Scope and content policy

- One concern per extension, in one file where practical.
- No local-specific content: no credentials, tokens, absolute local
  paths, private home-relative paths, or generated files that record a
  local resolution. This is a public project for generic use, and it must
  not disclose anything about the machine it was written on. Secrets are
  resolved at runtime from the environment or from pi settings files; see
  `configuration.md`. The full rule is in `conventions.md`, and its check
  is in `testing.md`.
- No bundling, no generated artifacts. pi loads the TypeScript sources
  directly, so the sources are the artifact. `dist/` and `node_modules/`
  are ignored.
- Documentation describes the intended design. Defects are recorded as
  tasks in `plan.md`, never described as design; see `conventions.md`.
- Distribution is git-only. The package is installed from a local checkout
  or from a git reference; it is not published to npm.

## Repository layout

- `package.json` — pi manifest. Declares the package name, the `pi`
  extension and skill directories, the peer dependencies on pi, and the
  development dependencies and scripts (`check`, `check:md`, `format`,
  `lint`, `test`, `typecheck`).
- `tools/` — repository checks that are not part of the extension.
  `check-md.mjs` is the markdown checker; see
  `adr/0006-markdown-checker.md`.
- `tsconfig.json` — TypeScript configuration used by `tsc --noEmit`. No
  emit is configured; the file exists for checking only.
- `biome.json` — the linter and formatter configuration, applied by
  `npm run lint` and `npm run format`. It covers TypeScript and JSON, not
  markdown. See `adr/0004-biome-for-lint-and-format.md`.
- `extensions/` — one TypeScript file per extension, plus any data file
  the extension reads at load. `zai-web-search.ts` provides the
  `zai_web_search` tool; `plan-mode.ts` adds the `/plan` read-only mode
  and reads its message texts from `plan-mode-prompt.txt` and
  `plan-mode-off-prompt.txt` beside it.
- `test/` — the unit tests, run by Node's built-in test runner through
  `npm test`. See `testing.md` and `adr/0003-test-runner.md`.
- `e2e/` — the live end-to-end check, run by `npm run test:e2e`. It is
  kept out of `test/` so a bare `node --test` cannot fire real requests;
  see `adr/0007-end-to-end-check.md`.
- `skills/` — skill directories, each with a `SKILL.md`. Currently empty;
  the directory is kept by `.gitkeep` because the manifest declares it.
- `spec/docs/` — the internal design documents, this knowledge base.
- `spec/docs/adr/` — architecture decision records.
- `spec/skills/` — the workflow files copied from the bootstrap
  procedure: `work.md`, `task_tracking.md`, `report_tracking.md`,
  `adr_tracking.md`.
- `spec/report/` — session reports, created by the workflow in
  `spec/skills/report_tracking.md`.
- `AGENTS.md` — the entry point for coding agents; it points at this
  directory.
- `README.md` — the end-user quick start. It is the repository's only
  end-user documentation; everything under `spec/` is internal (see
  `conventions.md`), so end-user behavior is documented here, not
  deferred to the design documents.
- `LICENSE` — MIT.
- `.gitignore` — ignores `node_modules/`, `dist/`, `package-lock.json`,
  logs, editor metadata, and `.env` files. The lockfile is excluded because
  the package has no runtime dependencies and its peer dependencies are
  supplied by pi, so a lockfile would only record one developer's local
  resolution.
