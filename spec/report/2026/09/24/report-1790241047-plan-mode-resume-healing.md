## Report on task: Plan-mode resume healing (ADR-0013)

Ad-hoc owner request (2026-09-24): fix the bug where `edit`/`write`
disappear from a session permanently after a resume, observed live in a
multi-day pi session (the extension restored a gutted checkpoint while the
off-notice claimed the tools were enabled).

### Done

- `extensions/plan-mode.ts`:
  - `missingWriteTools()` / `withConfiguredWriteTools()` pure helpers
    (configured-tools guard: a deployment without `edit`/`write` is never
    touched).
  - Heal on `session_start` when not applied (+ notification naming the
    healed tools); heal again before checkpointing on `enable`; `disable`
    restores the union of checkpoint and configured write tools; the
    off-notice appends a warning when a configured write tool is still
    inactive after the restore.
  - `planModeExtension` is now a named export with `export default`
    preserved (the loader contract is unchanged; tests import by name).
  - Header docstring documents the healing contract.
- `test/plan-mode.test.ts`: helper unit tests + a mock-pi end-to-end of the
  exact corruption (enable → simulated resume with gutted replayed set →
  heal + notify → clean enable/disable) + the off-notice warning path.
- Docs: ADR-0013; architecture.md "Plan-mode resume healing" section;
  testing.md suite description; README behavior bullet.
- `npm run check` green (typecheck, biome, 62 tests, check-md).

### Spec/ADR amendments

- ADR-0013 accepted; architecture/testing/README updated in the same change.

### Future-task notes

- Mode state itself still resets on resume (documented behavior; ADR-0013
  rejected persistence for now). If the owner wants plan mode to survive
  restarts, a new ADR revising that is the path.
- `bash` remains unrestricted in plan mode (guardrail, not sandbox) — the
  live incident showed instruction-layer-only enforcement for bash-writing
  agents; a strict `planMode.lockBash` option is a possible follow-up.

### Tooling/process

- The off-notice text is static by design; the warning is appended to the
  file content at disable time rather than forking a second file.
- Node's test runner executes the TS directly; biome owns import order —
  run `npm run format` after adding imports.
