# ADR-0006: Markdown checker

Date: 2026-09-10
Status: accepted

## Context

`conventions.md` specifies markdown rules, four of which are mechanically
checkable: no tables, a line cap of 88 characters, exactly one level-1
heading and it comes first, and a language tag on every fenced code block.
None of them was enforced. Biome covers TypeScript and JSON and does not
process markdown, so these rules were checked by hand with the `grep` and
`awk` commands recorded in `testing.md`.

Hand checks fail in three ways: they are forgotten, they produce false
positives (a line beginning with `|` inside a fenced code block is not a
table), and they cannot express the heading rules at all.

A sibling project, `awesome-web-scraping`, checks its markdown by parsing
each file into an abstract syntax tree. Its shape is adopted here, with
this repository's rules.

## Decision

Add `tools/check-md.mjs`, run by `npm run check:md` and included in
`npm run check`. It parses every markdown file outside `node_modules/` and
`.git/` with `unified` + `remark-parse` + `remark-gfm` and reports:

- A table node: tables are banned.
- A line longer than 88 characters.
- A file with no level-1 heading, more than one, or one that is not the
  first heading.
- A fenced code block whose opening fence has no language tag.

`remark-gfm` is required rather than optional: tables are a GitHub Flavored
Markdown extension, so without that plugin a table parses to no table node
at all and the ban would silently never fire. This was verified directly —
the same table source yields zero table nodes without the plugin and one
with it.

Two exemptions, because the structure of those files is fixed upstream
rather than by our conventions:

- `spec/skills/` — copied verbatim from the bootstrap procedure.
- `spec/report/` — a report's first line is mandated by
  `report_tracking.md`, so it begins at level 2.

Only the heading rule is waived for them; the other rules still apply.

No git hook is added. The checks run when a person or an agent runs
`npm run check`, and can be wired into continuous integration later. This
is a deliberate decision by the owner, not an oversight.

## Alternatives rejected

- Keep the hand-run `grep` and `awk` checks. They cannot express the
  heading rules, they misread a `|` inside a code fence as a table, and
  they depend on remembering to run them.
- `remark-lint` with rule packages. The reference project pins four
  `remark-lint` packages and never imports them; the rules that matter
  there, and here, are custom AST checks. They would be dead weight.
- `markdownlint-cli`. Its table rules cover pipe style, column count, and
  blank lines around tables — not a ban on tables, which is the rule that
  matters most here. It would also introduce a second rule vocabulary
  alongside this repository's own.
- Prettier or Biome for markdown. Biome does not process markdown, and
  neither tool expresses "no tables".
- A git hook. Rejected by the owner. A hook is also per-contributor
  opt-in, so it enforces nothing for anyone who has not enabled it.

## Consequences

- Three development dependencies: `unified`, `remark-parse`, and
  `remark-gfm`.
- The check is AST-based, so fenced code blocks and other non-prose
  content cannot trigger a false table report.
- The rule set lives in this repository and mirrors `conventions.md`; when
  a convention changes, the checker has to change in the same commit.
  `testing.md` states this.
- Nothing runs the checks automatically, so a commit can still contain a
  violation. That is the accepted cost of not having a hook.
