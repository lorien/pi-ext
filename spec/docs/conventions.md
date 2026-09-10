# Conventions

## Repository content

This is a public repository for generic use. Nothing specific to one
machine, one user, one checkout location, or one private environment may
be committed. A reader must be able to use the repository without knowing
anything about the machine it was written on.

Never commit:

- Absolute local paths, such as `/home/<user>/...`, `/Users/<user>/...`,
  or any path under a private working directory.
- Home-relative paths that assume a private layout: a private
  dot-directory or private configuration directory of your own. Standard
  documented locations of the tools this project integrates with are fine,
  for example `~/.pi/agent` or `~/.bashrc`.
- Generated files that record a local resolution: lockfiles resolved
  against a local install, editor state, logs, caches, and session files.
  See `.gitignore`.
- Hostnames, internal URLs, usernames, e-mail addresses, tokens, keys, and
  any other credential or personal identifier.

Write generic placeholders instead:

- `<project>` for a project directory, `<agent-dir>` for pi's agent
  directory, `<this-repo>` for the clone location.
- Use a documented standard path only when it is genuinely part of the
  interface, for example `~/.pi/agent/settings.json`.

Before every commit, run the local-content check in `testing.md`.

## Markdown

- Wrap every line at 88 characters, breaking at word boundaries.
- Never split an inline code span, a URL, or a link destination across
  lines.
- Do not use tables in any markdown file in the repository, including
  `README.md`. A table cannot be wrapped to the line cap without breaking,
  so convey the same information with a bulleted list.
- Use ATX headings (`##`), with a single `#` title per document.
- Tag fenced code blocks with a language: `bash`, `json`, `ts`, `markdown`.
- Keep one sentence per line where practical; it keeps diffs readable.
- Enforcement: `npm run check:md` checks the line cap, the table ban, the
  single level-1 heading rule, and the language tag on fenced blocks. It
  is AST-based, so a `|` inside a code fence is not mistaken for a table.
- `spec/skills/` and `spec/report/` are exempt from the heading rule
  only, because their structure is fixed upstream; see
  `adr/0006-markdown-checker.md`.

## Documents

- `spec/docs/` holds the design documents. `spec/docs/index.md` catalogs
  them and defines the reading order.
- `spec/docs/plan.md` holds the open-task list. Its record format and
  selection rules are authoritative in `spec/skills/task_tracking.md`.
- `spec/docs/adr/` holds the architecture decision records. Their format
  and supersession rules are authoritative in
  `spec/skills/adr_tracking.md`.
- `spec/report/` holds session reports, described in
  `spec/skills/report_tracking.md`.
- `spec/skills/` holds the workflow files. They are copied verbatim from
  the bootstrap procedure and are not renamed or edited.
- File names are lower-case kebab-case: `configuration.md`,
  `0001-configuration-source.md`.
- Describe the intended design. Never record a known defect as if it were
  a design decision; add a task to `plan.md` instead.

## Task records

A task record in `spec/docs/plan.md` has a `##` header, then the fields
and body, and optionally a reference line:

```markdown
## Add a unit test runner

Status: new
Priority: 5

Body of the task: what is missing and what the finished state is.

References: ADR-0001
```

- `Status:` is `new` for every open task. `done` is not a plan status;
  a finished record is archived into the session report.
- `Priority:` follows the status line. A higher number means more
  important. `Priority: -1` defers the task from automatic selection.
- Records are appended at the end of `plan.md`; the owner edits priority
  values rather than reordering the file.

## TypeScript

Style is enforced, not just described; see
`adr/0004-biome-for-lint-and-format.md`. Run `npm run lint` to check and
`npm run format` to apply.

- ES modules; the package sets `"type": "module"`.
- Double quotes, semicolons, trailing commas, two-space indentation, and a
  88-character line width, the same cap as the markdown.
- Imports are ordered by Biome: `node:` built-ins first, then packages.
- `strict` is enabled and checked by `tsc`. Avoid `any`; prefer `unknown`
  plus narrowing.
- Import Node built-ins with the `node:` prefix, e.g. `node:fs`.
- `@earendil-works/pi-*` and `typebox` are peer dependencies. Use
  `import type` when only types are imported; `verbatimModuleSyntax`
  requires it.
- The recommended Biome lint set is enabled. It is not type-aware, so it
  does not catch promise misuse; `tsc` is the only type-level gate.
- Biome does not process markdown, so the markdown rules above remain
  checked by hand (`testing.md`).
- Keep pure helpers exported so they can be tested without starting pi.
  `resolveZaiKey()` in `extensions/zai-web-search.ts` is the model: it
  takes plain arguments and returns a plain value.
- Keep the pi-facing wiring thin: the default export registers the tool
  and delegates to the pure helpers.
- Never read a credential from a hard-coded path. Resolve it at runtime
  through the sources listed in `configuration.md`.

## Architecture decisions

- The record format is `spec/docs/adr/0000-adr-format.md`.
- The workflow is `spec/skills/adr_tracking.md`.
- Every new decision that had real alternatives gets a numbered record at
  decision time, in the same change as the decision, with the topical
  documents updated alongside it.
- Records are numbered sequentially from `0001` and are never deleted or
  renumbered; a later change supersedes or revises a record.

## Asking the owner

- Ask in plain text only. Never use a dialog, a preset choice list, or any
  other option widget to request input.
