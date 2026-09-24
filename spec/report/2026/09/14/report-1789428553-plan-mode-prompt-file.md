## Report on task: Move the plan-mode instruction into a text file

### Done

- Added `extensions/plan-mode-prompt.txt`, holding the plan-mode
  instruction as plain text. The prompt came from the owner; the only
  adaptation was replacing "delegate explore agents" with "inspect the
  project", because pi ships no built-in sub-agents.
- `extensions/plan-mode.ts` no longer defines the instruction inline. It
  reads the sibling file at load through the exported
  `loadPlanInstruction(path)` helper and injects the trimmed contents. A
  missing or blank file throws at load, naming the path.
- Added `loadPlanInstruction()` coverage: trimmed content, byte-order
  mark, a missing file, and a blank file.
- Recorded the storage decision in `adr/0011-plan-mode-prompt-file.md`
  and updated `architecture.md`, `overview.md`, `testing.md`, and
  `README.md`.
- `npm run check` passes: 40 tests, and typecheck, lint, and the markdown
  checker report nothing wrong. Both local-content greps are clean.
- The owner-supplied prompt was stored with two edits: "delegate explore
  agents" became "inspect the project" (pi ships no sub-agents), and the
  request-scoping paragraph from the 2026-09-14 fix was restored after a
  follow-up review, so plan mode still answers a question without
  appending a plan.

### Spec/ADR amendments

- `[acted]` ADR-0011 records the sibling-file storage decision and the
  load-time failure on a missing or blank file.
- `[acted]` `architecture.md` and `overview.md` name the prompt file;
  `testing.md` lists the loader test; `README.md` documents editing the
  file to change the instruction.

### Future-task notes

- `[open]` The prompt is read once at load, so an edit needs a pi reload.
  Reading it per injection would pick up edits live but adds file I/O to
  every agent run.
- `[open]` The distribution must ship the `.txt` file beside the module.
  A packaging step that copies only `.ts` files breaks the extension at
  load (recorded in ADR-0011).
- `[open]` The prompt restates the read-only restriction that the removed
  tool set already enforces. If the tool set changes, the prompt file is
  a second place to update.
- `[acted]` Only the loader is tested; the `before_agent_start` injection
  and the `context` filter remain wired to pi state, as before.
  (2026-09-19: both shipped prompt files also have explicit load tests;
  the application and filter remain untested.)
  — resolved 2026-09-24 by ADR-0015: the mock-pi suite covers the
  per-prompt reminder injection and the `context` dedupe filter.

### Tooling/process

- `[acted]` The shipped prompt file is covered only implicitly: importing
  the module runs the loader against the real file, so a broken file
  fails the whole suite. An explicit test asserting the shipped file
  loads would turn that into designed coverage. (2026-09-19: the
  plan-mode suite now asserts both shipped prompt files load with
  content.)
