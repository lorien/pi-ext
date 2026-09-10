## Report on task: Add a markdown checker

### Done

- Added `tools/check-md.mjs`, which parses every markdown file outside
  `node_modules/` and `.git/` with `unified` + `remark-parse` +
  `remark-gfm` and fails on: a table, a line over 88 characters, a missing
  or duplicated level-1 heading, an opening fence with no language tag.
- Added `npm run check:md`, and `npm run check` to run typecheck, lint,
  tests, and the markdown check in sequence.
- Added three development dependencies: `unified`, `remark-parse`,
  `remark-gfm`. Biome's file list now includes `**/*.mjs` so the checker
  itself is linted and formatted.
- Fixed the one existing violation the checker found: the bare fence in
  `README.md` under `## Layout` is now ```` ```text ````.
- Added `adr/0006-markdown-checker.md`.
- Updated `conventions.md` (the markdown rules and their enforcement),
  `testing.md` (the manual `grep`/`awk` section is replaced by the
  command), and `overview.md` (the `tools/` directory and the scripts).
- No git hooks were added, as instructed. Verified: `core.hooksPath` is
  unset and there is no `.githooks` directory.

### Verification

- The checker passes on the repository: `check-md: OK`.
- It is not vacuous. A probe file with one table, two level-1 headings,
  an over-length line, and an untagged fence produced exactly those four
  failures.
- `remark-gfm` is load-bearing, not decorative: the same table source
  yields 0 table nodes with `remark-parse` alone and 1 with the plugin.
  Without it the table ban would silently never fire.

### Spec/ADR amendments

- `[acted]` ADR-0006 records the checker, the GFM requirement, the two
  heading-rule exemptions, and the decision not to add a hook.
- `[acted]` `conventions.md` states which markdown rules are enforced and
  by what.
- `[acted]` `testing.md` no longer documents hand-run markdown checks.

### Future-task notes

- `[open]` The checker's rule set duplicates the prose rules in
  `conventions.md`; nothing verifies that the two agree. If a rule is
  added or reworded there, the checker must be updated by hand. The
  failure mode is silent: a rule that is documented but not checked.
- `[open]` `spec/skills/` and `spec/report/` are exempt from the level-1
  heading rule. The exemption is by path prefix, so a new directory with
  an upstream-fixed format needs the same treatment.
- `[open]` Nothing runs the checks automatically. `npm run check` is
  manual, and no hook or CI workflow exists. Deliberate, per the owner,
  but the gate is only as reliable as the person or agent remembering.

### Tooling/process

- `[acted]` Tables are a GitHub Flavored Markdown extension. An AST check
  for them requires `remark-gfm`; plain CommonMark parsing reports no
  table node at all. This is the reason the dependency exists.
- Biome formats `.mjs` once `**/*.mjs` is added to `files.includes`. The
  checker was written by hand and then normalized by `npm run format`.
- A checker written against the repository's own conventions will find
  violations in existing files the first time it runs. Budget for that:
  this one found a single fence, but the same run surfaced a conflict
  between the heading rule and the report format, which the exemptions
  resolve.
