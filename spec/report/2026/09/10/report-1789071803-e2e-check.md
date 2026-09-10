## Report on task: Add a live end-to-end check

### Done

- Added `e2e/live-search.e2e.ts`: one real search with `count: 3`,
  asserting that results arrive with links, that the count is honoured,
  and that `formatSearchResults()` renders numbered entries with indented
  links; plus a check that the live service rejects an invalid key.
- Added the `npm run test:e2e` script.
- `tsconfig.json` includes `e2e/**/*.ts`, so the check is type-checked,
  and Biome covers it through the existing `**/*.ts` pattern.
- Added `adr/0007-end-to-end-check.md`.
- Updated `testing.md` (a new end-to-end section, and the no-network rule
  now names the unit suite as its scope instead of being absolute) and
  `overview.md` (the `e2e/` directory).

### Verification

- The unit suite is unaffected: `npm test` reports 14 tests, 0 skipped.
- `npm run check` does not reach the network; it still runs the 14 unit
  tests and the markdown checker.
- A bare `node --test` collects 14 tests and does not run the e2e files.
  This is why `e2e/` sits at the root rather than under `test/`: Node
  treats every file under a `test/` directory as a test file, so `test/e2e`
  was discovered by a bare `node --test` and would have fired real
  requests. Placement was chosen from that measurement, not by guess.
- With no key configured, `npm run test:e2e` skips the live suite and
  prints the reason, and the invalid-key check still runs and passes.
- The invalid-key check is genuinely live: the service answered
  `z.ai web_search failed (401): token expired or incorrect`.
- **Not verified: the positive path.** No usable key was reachable without
  reading a private local file, so the live search itself was not run in
  this session. Everything around it was: the harness runs, the skip gate
  works, and the same code path reaches the real API.

### Spec/ADR amendments

- `[acted]` ADR-0007 records the opt-in live check, the gating, the file
  placement, and the rejected alternatives.
- `[acted]` `testing.md` gains the end-to-end section and scopes the
  no-network rule to the unit suite.
- `[acted]` `overview.md` lists `e2e/`.

### Future-task notes

- `[open]` Run `npm run test:e2e` with a valid key at least once, to
  confirm the positive path. It is the only part of the repository that
  requires a real credential.
- `[open]` The endpoint is a module constant in `runZaiWebSearch()`, so
  the request body and the parameter mapping have no offline coverage and
  cannot be stubbed without exporting the endpoint and threading it
  through. If request-body regressions become a real risk, make the
  transport injectable and cover it with a stub, keeping the live check
  for the contract.
- `[open]` The live check spends one search request per run. If it is ever
  wired into automation, that cost recurs.
- `[open]` Nothing runs any check automatically: no hook and no CI. The
  live check makes that more visible, since a scheduled run is the only
  way it would ever be exercised without a person asking.

### Tooling/process

- `[acted]` Node's discovery rule is the whole reason for the `e2e/`
  location: test files are any `*.test.ts`, and any file at all under a
  directory named `test`. A live test placed under `test/` is therefore
  one careless `node --test` away from making real requests.
- `[acted]` Suite-level skip in `node:test` is expressed as
  `describe(name, { skip: reason }, fn)`, and the reason is printed next to
  the skipped suite. This is how the missing-key case reports itself
  without failing.
