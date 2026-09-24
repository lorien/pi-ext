## Report on task: Plan-mode standing guideline + var/ scratch + session-aware off state (ADR-0014)

Ad-hoc owner request (2026-09-24): implement the "motivation" enhancement
(item 1 of the proposal only — no bash guard, no full prompt rewrite), add
a `var/` scratch allowance to the plan-mode prompt, and make the off-state
explanation appear only after plan mode has actually been used in the
session.

### Done

- `extensions/plan-mode-guideline-on.txt` / `-off.txt`: standing guideline
  texts (ON: read-only incl. bash vectors, explicit-instruction-declined
  rule, `var/`-only write exception; OFF: "may create, edit, and delete
  files again — execute instead of proposing").
- `extensions/plan-mode-prompt.txt`: added the "Scratch exception — `var/`"
  section, consistent with the ON guideline.
- `extensions/plan-mode.ts`: `everApplied` session state;
  `wantedGuideline()` pure helper; per-`before_agent_start`
  `syncGuideline()` keeps exactly one `Plan mode`-prefixed guideline in
  `systemPromptOptions.promptGuidelines` (ON while applied, OFF only after
  first use, none otherwise); the transition logic is factored into
  `transitionMessage()`; header docstring documents the design.
- Tests: guideline lifecycle (never-applied → none; applied → ON on every
  prompt without stacking; lift → OFF kept on later prompts; re-enable →
  ON again; fresh resume without use → none) + loader rejection; mock now
  carries a `promptGuidelines` array through the `before_agent_start`
  event. 66/66 pass; `npm run check` green.
- Docs: ADR-0014; architecture.md section; testing.md suite description;
  README behavior bullets.

### Spec/ADR amendments

- ADR-0014 accepted; architecture/testing/README updated in the same
  change. ADR-0013 (healing) untouched and still in force.

### Future-task notes

- Bash write blocking via the `tool_call` hook remains available as a
  follow-up behind a `planMode.bashGuard` setting (owner declined for
  now).
- `everApplied` is per-process: a resume starts with no guideline until
  the mode is used again — consistent with ADR-0013's "restart starts
  normal".

### Tooling/process

- pi diffs `promptGuidelines` changes into a single system-prompt patch —
  the guideline swap on enable/lift is cheap and cannot stack.
- Guideline texts are loaded with the same fail-on-empty loader as the
  instruction files; shipping the repo without them fails the extension
  load loudly.
