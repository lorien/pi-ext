# ADR-0015: Plan mode per-prompt re-assertion

Date: 2026-09-24
Status: accepted

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

## Decision

While plan mode is applied, the read-only reminder is attached to every
prompt, not only injected once at the enable transition.

- `before_agent_start` returns the full read-only instruction on enable
  and a compact reminder (`plan-mode-reminder.txt`, same
  `customType: "plan-mode-context"`) on every later prompt while the mode
  stays applied. The reminder states explicitly that it repeats on every
  message and that a message without one does not mean the mode is off.
- The `context` hook keeps exactly one mode message per request — the
  newest of the type the applied mode calls for (`keepModeMessages()`):
  while applied, the newest read-only message and no off-notice; while it
  is off, the newest off-notice and no read-only message. Re-asserted
  reminders therefore do not pile up, and a message contradicting the
  applied mode never survives.
- The off-notice stays a one-time message: normal mode is the model's
  default, so it needs no re-assertion.
- The reminder text is loaded with the same fail-on-empty loader as the
  other prompt files (ADR-0011).

## Alternatives rejected

- **Keep the guideline-only state signal (ADR-0014).** Observed to fail:
  the guideline was present in every request and the model still inferred
  mode-off from the absence of a per-message reminder.
- **Re-inject without deduplication.** Stacked copies of the read-only
  wording over-reinforce the mode, which is why ADR-0012 moved to one
  message per change; keeping only the newest bounds the count at one.
- **Mechanical `bash` guard.** The only hard guarantee, but heuristic and
  previously declined; the misread is fixed without it, and it remains a
  possible follow-up.
- **Forcing the whole prompt per turn.** Replacing the system prompt every
  turn is a cache miss every turn and hides the mode from the structured
  sections the rest of the design relies on.
