# ADR-0015: Plan mode per-prompt re-assertion

Date: 2026-09-24
Status: accepted (revised 2026-09-24: off-state re-assertion)

## Context

Plan mode signalled the model through one hidden message at each
transition (ADR-0009/0012), plus a standing system-prompt guideline while
applied (ADR-0014). A live incident showed the state signal could still be
missed. Plan mode had been applied at 19:41; at 20:51 the model wrote
files through `bash` while the mode was still applied, with both the
read-only instruction and the guideline present in its context. Its own
reasoning named the cause: the previous message had carried the plan-mode
reminder and the current one did not, so it inferred the mode was off. The
model reads the mode from the reminder attached to the message it is
answering; a guideline in the system prompt did not override that
inference.

The same evidence applies in reverse after a lift. Once re-asserted, the
read-only reminders are the strongest mode signal in the transcript, and
the one-time off-notice is not enough to outweigh them: ADR-0012 already
recorded a model that kept proposing plans after the lift until the user
forced it with an explicit "go".

## Decision

While plan mode is applied — and, once it has been used, after it is
lifted — a compact reminder for the current mode is attached to every
prompt, not only injected once at the transition.

- `before_agent_start` returns the full read-only instruction on enable
  and a compact reminder (`plan-mode-reminder.txt`, same
  `customType: "plan-mode-context"`) on every later prompt while the mode
  stays applied. The reminder states explicitly that it repeats on every
  message and that a message without one does not mean the mode is off.
- After the mode has been applied at least once in the session, the off
  state is re-asserted the same way: the off reminder
  (`plan-mode-off-reminder.txt`, `customType: "plan-mode-off"`) is
  attached to every prompt while the mode is off. A session that never
  applied plan mode still carries no plan-mode prompt content at all;
  the `everApplied` flag is per-process, so a reload or resume starts
  clean.
- The `context` hook keeps exactly one mode message per request — the
  newest of the type the applied mode calls for (`keepModeMessages()`):
  while applied, the newest read-only message and no off-notice; while it
  is off, the newest off-notice and no read-only message. Re-asserted
  reminders therefore do not pile up, and a message contradicting the
  applied mode never survives.
- The transition off-notice remains: it fires once on disable and carries
  the tool-restore warning. The per-prompt off reminder replaces it on
  later turns, so the warning is not repeated.
- The reminder texts are loaded with the same fail-on-empty loader as
  the other prompt files (ADR-0011).

## Alternatives rejected

- **Keep the guideline-only state signal (ADR-0014).** Observed to fail:
  the guideline was present in every request and the model still inferred
  mode-off from the absence of a per-message reminder.
- **Re-assert only the ON state, signalling the lift once.** Rejected:
  the re-asserted read-only stance otherwise outlives the mode and the
  model keeps planning; the off state needs the same per-prompt weight.
- **Re-inject without deduplication.** Stacked copies of the read-only
  wording over-reinforce the mode, which is why ADR-0012 moved to one
  message per change; keeping only the newest bounds the count at one.
- **Mechanical `bash` guard.** The only hard guarantee, but heuristic and
  previously declined; the misread is fixed without it, and it remains a
  possible follow-up.
- **Forcing the whole prompt per turn.** Replacing the system prompt every
  turn is a cache miss every turn and hides the mode from the structured
  sections the rest of the design relies on.
