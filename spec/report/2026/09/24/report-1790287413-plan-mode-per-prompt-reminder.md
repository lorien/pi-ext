## Report on task: Plan-mode per-prompt re-assertion (ADR-0015)

Ad-hoc owner request (2026-09-24) following a live incident in a
`tg-research` session: with plan mode applied, the model wrote files
through `bash` at "OK. Do the fix.", and later treated a false "[NORMAL]"
as authoritative. Root cause: the mode was signalled only at its
transition, so the model read a reminder-free turn as "mode off"; the
ADR-0014 system-prompt guideline was present but did not override that
inference.

### Done

- `extensions/plan-mode-reminder.txt`: a compact per-prompt reminder that
  states it repeats on every message and that a message without one does
  not mean the mode is off.
- `extensions/plan-mode.ts`: `PLAN_REMINDER` loaded from the new file;
  `before_agent_start` returns the reminder on every prompt while applied
  (the full instruction still fires on enable, the off-notice once on
  disable); new pure `keepModeMessages()` keeps exactly one mode message
  per request — the newest of the applied polarity; the `context` hook
  now uses it.
- Tests: `keepModeMessages()` polarity and passthrough cases; a mock-pi
  end-to-end that the reminder is returned per prompt, nothing while off,
  and the filter keeps only the newest mode message; the reminder file
  loads. 74/74 pass; `npm run check` green.
- Docs: ADR-0015; ADR-0012 marked revised; `architecture.md`,
  `testing.md`, and `README.md` updated; the report markers of the three
  prior coverage items reconciled.

### Spec/ADR amendments

- ADR-0015 accepted; ADR-0012 revised (the read-only instruction is
  re-asserted per prompt). The ADR-0014 guideline decision is unchanged
  and remains the system-prompt state signal.

### Future-task notes

- `[open]` The re-asserted reminder still relies on the model honoring
  it. A `tool_call` `bash` write guard is the only hard enforcement; the
  owner declined it again for now (see ADR-0014).
- `[open]` Deduping to the newest mode message changes the context tail
  every prompt, so the provider's cached prefix is partly invalidated
  each turn. Accepted as the cost of a per-turn signal.
- `[open]` The mode is still memory-only; a reload or resume drops to
  normal mode (ADR-0013). Not addressed here.
- `[open]` Compaction or branch summaries can still bake mode wording
  into a summary the filter cannot drop (pre-existing, pi-side).

### Tooling/process

- `[open]` The required checks run before the report is written, so a
  too-long line in a fresh report escapes `check:md`. This session found
  and shortened one such line from the ADR-0014 report; consider running
  `check:md` again after writing the report.
