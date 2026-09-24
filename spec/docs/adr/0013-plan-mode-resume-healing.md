# ADR-0013: Plan mode resume healing for the active tool set

Date: 2026-09-24
Status: accepted

## Context

`pi.setActiveTools()` deltas persist in the session transcript and are
replayed on resume, while plan mode's state (`desiredOn`, `appliedOn`,
`toolsBeforePlan`) is memory-only and resets to normal on every restart or
resume. If a process ends while plan mode is applied — the transcript holds
a "write tools removed" delta — the resumed session starts with `edit` and
`write` missing from the active set while the extension believes it is in
normal mode. The next `enable` then checkpoints the gutted list as
`toolsBeforePlan`, and the eventual `disable` "restores" it: the write
tools are permanently gone for the session, and the static off-notice
falsely announces that they are enabled. Observed live in a multi-day
session: an agent whose writes go through `bash` kept writing after a lift
that claimed to restore tools it never had, and the tool schemas showed no
`edit`/`write` at all.

## Decision

Three defenses, all confined to configured tools (`pi.getAllTools()`), so a
session deliberately configured without `edit`/`write` is never touched:

1. **Heal on `session_start`** when the mode is not applied: any configured
   write tool missing from the active set is restored, and a notification
   names what was healed.
2. **Heal before checkpointing on `enable`**, so the recorded restore
   baseline is a healthy set even if the start-time heal was missed.
3. **Union restore on `disable`** — `withConfiguredWriteTools` unions the
   checkpoint with the configured write tools — and the off-notice reports
   honestly, appending a warning whenever a configured write tool is still
   inactive after the restore.

New pure helpers `missingWriteTools()` / `withConfiguredWriteTools()` carry
the logic and are unit-tested; a mock-pi suite simulates the exact
corruption (enable, resume with a gutted replayed set, heal) end to end.

## Alternatives rejected

- **Persist the mode state itself** (`pi.appendEntry()`), so a resume
  re-enters plan mode instead of starting normal. Rejected for now: it
  changes the documented "restart starts in normal mode" behavior and the
  healing already guarantees the tool set matches that behavior. Can be
  revised by a later ADR if mode persistence is wanted.
- **Restore blindly from `getAllTools()`** on every start, without the
  configured-tool guard. Rejected: it would add tools a deployment
  deliberately keeps out of its toolset.
- **Leaving the static off-notice as is.** Rejected: a lift that claims to
  restore tools must verify it did.
