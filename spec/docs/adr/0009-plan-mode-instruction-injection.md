# ADR-0009: Plan mode instruction injection

Date: 2026-09-13
Status: accepted

## Context

A `/plan` toggle turns pi into a read-only planning assistant: the model
should analyze the request and propose changes, not modify the project.
The extension must tell the model this, and the instruction has to take
effect when the user toggles, which can be mid-conversation after turns
that already edited files.

pi offers two places for the instruction: append it to the system prompt
in `before_agent_start`, or inject it as a conversation message from the
same hook. The model receives one token sequence with the system prompt
first, so an appended instruction sits before the edit-heavy history it
is meant to constrain and competes with the recent edit pattern. A
message lands after that history, at the transition point, and leaves the
cached prefix of the conversation intact.

## Decision

Plan mode injects a hidden conversation message with
`customType: "plan-mode-context"` from `before_agent_start`. The system
prompt is never modified.

- The message is `display: false`; it is model context, not chat.
- While plan mode is off, a `context` handler drops every message whose
  `customType` is `plan-mode-context`, so a stale instruction cannot steer
  later turns. The filter matches on `customType` only.
- `edit` and `write` are removed from the active tool set while plan mode
  is on, and the previous set is restored when it is toggled off. The
  instruction is soft; removing the tools is the enforcement.
- State is in memory. A restart or session resume starts in normal mode.

## Alternatives rejected

- Appending to the system prompt. Simpler and needs no cleanup, but the
  instruction is positionally first while the behavior it must stop is
  most recent, and a system-prompt change invalidates the cached prefix of
  the whole conversation on every toggle.
- Injecting a visible message. It would clutter the transcript with an
  internal directive.
- Prompt-only enforcement, leaving `edit`/`write` active. A model can
  ignore the instruction, and an edit-heavy history is a strong pull;
  removing the tools makes the action unavailable instead of discouraged.
- Persisting the toggle in the session. Not needed for a mode whose
  correct default on resume is off.
- A `context` filter keyed on the marker text as well as `customType`.
  The injected message is the extension's own and carries `customType`
  where the hook sees it; a text fallback would add a second key and
  could match unrelated prose.

## Consequences

- The instruction is delivered when it matters and does not disturb the
  system prompt or the prompt cache.
- The injected message is stored in the session, so the `context` filter
  is what keeps it out of later normal-mode turns. The filter and the
  injection must stay in step.
- Removing the tools leaves `bash` available, so plan mode does not stop
  writes made through the shell. That is a known limit of this decision.
- (2026-09-19, ADR-0012) The cache claim in the Context above holds only
  for the enable-time append at the transition point; the disable-time
  removal invalidates the cached prefix from the earliest removed
  message. ADR-0012 stages the transitions at run boundaries, injects
  one message per mode change instead of one per prompt, and adds the
  off-notice.
