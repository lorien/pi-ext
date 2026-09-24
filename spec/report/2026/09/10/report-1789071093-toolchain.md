## Report on task: Adopt Biome and TypeScript 7

### Done

- Added `@biomejs/biome@^2.5.13` as a development dependency with
  `biome.json`: two-space indentation, 88-character line width, double
  quotes, semicolons, trailing commas, the recommended lint set, and
  import organization. Source-control integration reads `.gitignore`.
- Added `npm run lint` (check) and `npm run format` (apply).
- Raised the TypeScript development dependency from `^5.6.0` to
  `^7.0.2`; the installed compiler moved from 5.9.3 to 7.0.2.
- Reformatted two files: import order in the extension and the test, and
  lines over the cap in the extension. No semantic change.
- Confirmed after both changes: 14 tests pass, `tsc --noEmit` reports
  nothing, and `biome check` reports nothing.
- Added `adr/0004-biome-for-lint-and-format.md` and
  `adr/0005-typescript-7.md`.
- Updated `conventions.md` (the style rules are now enforced, plus the
  import order and the 88-character code width), `testing.md` (`lint` is a
  required check, and a new Markdown check section), and `overview.md`
  (`biome.json` and the scripts).

### Spec/ADR amendments

- `[acted]` ADR-0004 records the linter and formatter choice; ADR-0005
  records the compiler version.
- `[acted]` `conventions.md` no longer describes rules that nothing
  enforced: the TypeScript section names the enforcing tool and the
  commands.
- `[acted]` `testing.md` documents `npm run lint` and the Markdown check,
  which was previously only implied by `conventions.md`.

### Future-task notes

- `[acted]` Markdown is outside Biome, so the 88-character cap and the
  no-tables rule were still checked by hand. Resolved by ADR-0006:
  `tools/check-md.mjs` now checks both, plus the heading and fence rules.
- `[open]` The lint set is not type-aware, so promise misuse is not
  caught. Relevant only if async code beyond the single request helper is
  added; the alternative is ESLint with `typescript-eslint`.
- `[open]` Nothing runs the checks automatically. `npm run format` is
  manual, and there is no CI workflow, so the gate depends on the person
  or agent remembering. A pre-commit hook or a CI workflow would make it
  real.
- `[acted]` The extension still reads its key from a settings file without
  schema validation, per ADR-0001. That reliance is on pi's behavior, not
  on anything this repository controls. Resolved 2026-09-25: the
  extension was deprecated and moved to `deprecated/` (ADR-0016), so the
  shipped package no longer carries the reliance.

### Tooling/process

- `[acted]` `biome init` writes tab indentation. The generated config had
  to be edited to space indentation with width 2 and a line width of 88,
  otherwise the first run rewrites every file to Biome's defaults.
- TypeScript 7 still publishes a `tsc` binary, so the `typecheck` script
  and `tsconfig.json` needed no change. The published package requires
  Node 16.20 or newer, below the 22.18 the test suite requires.
- The type check takes about one second on this repository, before and
  after the compiler change, so the native compiler's speed is not
  observable at this size.
