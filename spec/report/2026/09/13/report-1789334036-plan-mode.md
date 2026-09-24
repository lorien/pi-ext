## Report on task: Add a `/plan` read-only mode extension

### Done

- Added `extensions/plan-mode.ts`: a `/plan` command toggles plan mode.
  Enabling removes `edit` and `write` from the active tool set and records
  the previous set; disabling restores it.
- The mode injects a hidden message with `customType:
  "plan-mode-context"` from `before_agent_start`. The system prompt is
  not modified. A `context` handler drops that `customType` while the
  mode is off, so the instruction does not outlive the mode.
- The footer shows a `[PLAN]` status while the mode is on.
- Added `test/plan-mode.test.ts` covering `withoutWriteTools()` and
  `resolveShortcut()`.
- Added a `planMode.shortcut` setting (default `alt+space`) resolved by
  `resolveShortcut(cwd)` and registered once at `session_start`, because
  extension shortcuts cannot be remapped through `keybindings.json`.
- Recorded the injection decision in
  `adr/0009-plan-mode-instruction-injection.md`, the shortcut decision in
  `adr/0010-plan-mode-shortcut-setting.md`, and documented the extension
  in `README.md`, `spec/docs/architecture.md`, `spec/docs/overview.md`,
  `spec/docs/index.md`, and `spec/docs/testing.md`.
- All checks pass: `npm run check`.

### Spec/ADR amendments

- `[acted]` Added ADR-0009 for the message-injection, `customType`-only
  cleanup, and hard tool removal decisions.
- `[acted]` Added ADR-0010 for the `planMode.shortcut` setting.
- `[acted]` `architecture.md` now describes both extensions;
  `overview.md`, `index.md`, the README layout, and `testing.md` list
  plan mode.

### Future-task notes

- `[open]` Only `withoutWriteTools()` and `resolveShortcut()` have
  coverage. The command handler, the `session_start` shortcut
  registration, the `before_agent_start` injection, and the `context`
  filter are wired to pi state and are untested. (2026-09-19:
  `resolveTransition()`, `statusLabel()`, and both prompt-file loads
  also have coverage; the pi-wired handlers remain untested.)
- `[open]` The `planMode.shortcut` value is read at `session_start`, so a
  settings change needs a `/reload` or a new session to take effect.
- `[acted]` Restoring the recorded tool list on disable overwrites any
  active-tool change another extension made while plan mode was on. A
  merge against the current set would avoid that.
  — resolved 2026-09-24 by ADR-0013: disable now unions the checkpoint
  with the configured write tools (stale checkpoints can no longer strand
  `edit`/`write` either).
- `[open]` Plan mode does not restrict `bash`, so shell writes such as
  `rm` or `echo > file` still work. The instruction and the disabled
  tools are a guardrail, not a sandbox.

### Tooling/process

- `[open]` Toggling can only be verified by hand because it needs a
  running pi session; the pure helpers are the only automated seam.
