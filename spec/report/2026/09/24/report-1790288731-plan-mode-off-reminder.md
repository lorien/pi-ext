## Report on task: Plan-mode off-state re-assertion

Ad-hoc owner follow-up (2026-09-24) to the per-prompt re-assertion work
(ADR-0015). After the ON reminder became per-prompt, the lift was still
signalled only by the one-time off-notice, so the reinforced read-only
stance could outlive the mode and the model keep planning. The owner
asked for an off reminder on every prompt once plan mode has been used in
the session.

### Done

- `extensions/plan-mode-off-reminder.txt`: compact "plan mode is off, act
  now" text, worded to mirror the ON reminder.
- `extensions/plan-mode.ts`: `PLAN_OFF_REMINDER`; `before_agent_start`
  returns the ON reminder while applied and, once the mode has been
  applied at least once (`everApplied`), the OFF reminder on every prompt
  while off. `reminderMessage(customType, content)` is generalized. The
  per-process `everApplied` flag does not survive a reload or resume.
- Tests: the OFF reminder is returned on every prompt after a lift, the
  ON reminder on re-enable, and no reminder before the mode is ever
  applied; the off-reminder file loads. 76/76 pass; `npm run check`
  green.
- Docs: ADR-0015 revised in place (its "off-notice stays a one-time
  message" bullet is reversed); `architecture.md`, `testing.md`, and
  `README.md` synced.

### Spec/ADR amendments

- ADR-0015 revised: the off state is re-asserted per prompt like the on
  state. No new ADR, because it is the same decision extended to the
  other polarity.

### Future-task notes

- `[open]` `everApplied` is per-process, so a reloaded or resumed session
  carries no plan-mode reminder until the mode is used again. Intended
  (the owner specified it must not survive a reload), but worth
  remembering when diagnosing a resumed session.

### Tooling/process

- No new process notes.
