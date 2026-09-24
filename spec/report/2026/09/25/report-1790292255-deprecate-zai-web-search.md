# Report on task: deprecate the zai-web-search extension

Ad-hoc work, requested directly by the owner ("disable the zai web search
extension in this repo, move it to a deprecated directory"). Not a
`plan.md` record, so there is nothing to archive.

## Done

- Created `deprecated/` at the repository root and moved into it:
  - `extensions/zai-web-search.ts` → `deprecated/zai-web-search.ts`
  - `test/zai-web-search.test.ts` → `deprecated/zai-web-search.test.ts`
  - `e2e/live-search.e2e.ts` → `deprecated/live-search.e2e.ts`
  - `spec/docs/configuration.md` → `deprecated/CONFIGURATION.md`
- The `pi` manifest declares only `extensions/`, so nothing under
  `deprecated/` is loaded: the tool is disabled for every install of the
  package while the module stays available for `pi -e
  ./deprecated/zai-web-search.ts`.
- The moved test files' imports were updated; the extension's and the
  e2e file's header comments now state the deprecation.
- `tsconfig.json` gained `deprecated/**/*.ts` so `tsc --noEmit` still
  type-checks the retired module.
- `package.json` `test:e2e` now points at `deprecated/*.e2e.ts`; `npm
  test` runs the plan-mode suite only.
- README: zai removed from Contents and Layout, the Configuration
  section removed, a deprecation note and a re-enablement pointer added.
- Spec docs synced: `overview.md` (layout, secret-rule reference),
  `architecture.md` (one extension; zai sections dropped, pointer to the
  ADR), `testing.md` (typecheck scope, e2e section, smoke test, unit
  test subjects), `conventions.md` (pure-helper model re-pointed to
  `resolveShortcut()`, credential rule reference), `index.md`
  (configuration.md entry removed, numbering fixed).
- ADR-0016 records the decision; `adr/0001`, `adr/0002`, `adr/0007`,
  `adr/0008` were annotated on their `Status:` lines with the
  deprecation, and their doc pointers updated to
  `deprecated/CONFIGURATION.md`.
- Checks: `npm run check` (typecheck, lint, 55 plan-mode tests, check:md)
  passes; the moved zai unit suite still passes when invoked directly;
  the local-content greps are clean.

## Spec/ADR amendments

- `[acted]` `spec/docs/configuration.md` moved to
  `deprecated/CONFIGURATION.md` with a deprecation banner; `index.md` no
  longer lists it.
- `[acted]` ADR-0016 added; 0001/0002/0007/0008 annotated as describing a
  deprecated component.

## Future-task notes

- `[open]` `deprecated/` is a single-extension graveyard today; if more
  extensions are retired, consider whether the directory needs its own
  `README.md` describing its policy.
- `[open]` The manifest still declares `pi.extensions`/`pi.skills` as
  directories; a disabled extension re-enabled by hand relies on the
  file path staying stable.

## Tooling/process

- `node --test "deprecated/*.e2e.ts"` (via `npm run test:e2e`) keeps the
  invalid-key network probe that runs even without a configured key, so
  the script still talks to the API when invoked; it is unchanged in
  kind, only relocated.
