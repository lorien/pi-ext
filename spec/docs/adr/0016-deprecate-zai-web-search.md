# ADR-0016: Deprecate the zai-web-search extension

Date: 2026-09-25
Status: accepted

## Context

The repository shipped two extensions, `zai_web_search` and plan mode.
The `zai_web_search` extension calls the z.ai REST search API and is the
only part of the package that needs a third-party API key, a live
network, and a quota spend: its configuration was the subject of
`adr/0001` and `adr/0008`, its transport of `adr/0002`, and its live
end-to-end check of `adr/0007`. The owner asked to disable the extension
in this repository, without deleting it.

## Decision

The extension is deprecated, not deleted. It moves — with its unit test,
its live end-to-end check, and its configuration document — to a new
`deprecated/` directory that the `pi` manifest does not declare:

- `extensions/zai-web-search.ts` → `deprecated/zai-web-search.ts`
- `test/zai-web-search.test.ts` → `deprecated/zai-web-search.test.ts`
- `e2e/live-search.e2e.ts` → `deprecated/live-search.e2e.ts`
- `spec/docs/configuration.md` → `deprecated/CONFIGURATION.md`

Consequences in the same change:

- Nothing under `deprecated/` is loaded, so the tool disappears from
  every session that installs the package. It can still be loaded by
  hand with `pi -e ./deprecated/zai-web-search.ts`.
- `npm run test:e2e` now points at `deprecated/*.e2e.ts`, so the live
  check keeps working against the moved module.
- `npm test` no longer runs the z.ai suite; the unit suite is plan mode
  only.
- `tsc --noEmit` still covers `deprecated/**/*.ts`, so the retired code
  keeps compiling against the current pi peer dependencies.
- The topical documents (`overview.md`, `architecture.md`, `testing.md`,
  `conventions.md`, `index.md`, `README.md`) drop the extension from
  their descriptions of current behavior and point at the deprecation.

## Alternatives rejected

- Delete the module, the tests, and the ADR history outright. The
  decisions in `adr/0001`, `adr/0002`, `adr/0007`, and `adr/0008` are
  part of the record and records are never deleted; losing the working
  module with them was unnecessary for a request that asked to disable,
  not remove.
- Keep the file in `extensions/` and gate it behind a setting. This
  would keep the key-resolution and settings coupling alive in the
  shipped package and keep the live endpoint one reload away, which is
  more than "disabled" means; and the package's rule is one concern per
  extension, not a feature switch.
- Comment the file out or add an early `return` in the default export.
  The source would stay in the loaded directory and still be parsed on
  every session, a half-measure that misleads both pi and a reader.

The records affected remain valid as history and are annotated on their
`Status:` lines with this deprecation.
