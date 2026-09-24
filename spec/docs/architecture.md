# Architecture

The repository ships one extension: plan mode, defined in
`extensions/plan-mode.ts`. This document describes its intended design.

The `zai_web_search` extension was retired and moved to `deprecated/`;
see `adr/0016-deprecate-zai-web-search.md`. The design decisions it
carried (`adr/0001`, `adr/0002`, `adr/0007`, `adr/0008`) remain on record,
and the module itself still documents its own design in its header
comment.

## Shape of an extension

- An extension is a single ES module whose default export is a factory:
  `export default function (pi: ExtensionAPI) { ... }`.
- The factory registers everything the extension provides. For plan mode
  that is one command, one status line, and two event hooks.
- pi loads the file directly from `extensions/`, as declared by the `pi`
  manifest in `package.json`. There is no build step and no bundling.

## Module boundaries

`extensions/plan-mode.ts` is split into pure helpers and a thin wiring
layer. Keeping the helpers exported and free of pi state is what makes
the extension testable; see `testing.md`. `resolveZaiKey()` in the
retired `deprecated/zai-web-search.ts` was the original model for this
split.

## Plan mode

`extensions/plan-mode.ts` provides a togglable read-only mode.

- One command, `/plan`, toggles it, and a keyboard shortcut registered at
  `session_start`.
- The shortcut comes from `planMode.shortcut` in settings, resolved by the
  pure `resolveShortcut(cwd)` helper (project settings over global over
  the `alt+space` default). See `adr/0010-plan-mode-shortcut-setting.md`.
- The mode is staged: the toggle records the *desired* mode and updates
  the footer, and `before_agent_start` moves it into the *applied* mode.
  A run always executes under the mode it started with, so a mid-run
  toggle changes nothing for the running agent, and a toggle reversed
  before the next prompt collapses to no transition. See
  `adr/0012-plan-mode-staged-transitions.md`, which extends the
  message-injection decision of `adr/0009-plan-mode-instruction-injection.md`.
- Applying a transition swaps the tool set — recording the active tools
  and removing `edit` and `write` to enable, restoring the recorded list
  to disable — and injects a hidden message: the full read-only
  instruction (`customType: "plan-mode-context"`) on enable, and an
  off-notice (`customType: "plan-mode-off"`) on disable. The on-instruction
  states the read-only restriction and scopes the reply to the request: a
  proposal or plan follows only when the user asked for a change or a
  plan. The off-notice tells the model the mode is lifted and that an
  instruction to act should be executed. The system prompt is not
  modified.
- A compact reminder is attached to *every* prompt so the mode is visible
  on the current turn and a reminder-free turn is not read as the opposite
  mode: the read-only reminder (`customType: "plan-mode-context"`) while
  applied, and — once the mode has been used — the off reminder
  (`customType: "plan-mode-off"`) while it is off. See
  `adr/0015-plan-mode-per-prompt-reminder.md`.
- The message texts are read at load from `plan-mode-prompt.txt`,
  `plan-mode-off-prompt.txt`, `plan-mode-reminder.txt`, and
  `plan-mode-off-reminder.txt` beside the module; a missing or blank file
  fails the extension load instead of injecting nothing. See
  `adr/0011-plan-mode-prompt-file.md`.
- `context` keeps exactly one mode message per request — the newest of the
  type the applied mode calls for: the newest read-only message while the
  mode is applied (dropping off-notices and older reminders), the newest
  off-notice while it is off (dropping every read-only message). A
  contradicting message never outlives its mode.
- The footer always names the desired mode and marks it pending with `~`
  until the next prompt applies it: `[PLAN]` while plan mode is applied,
  `[~PLAN]` while enabling is pending, `[NORMAL]` in normal mode, and
  `[~NORMAL]` while a lift is pending. The plan labels are colored
  `mdHeading`, `[NORMAL]` uses `dim` to match the footer's own text, and
  `[~NORMAL]` uses `text`.
- State is in memory only; restart and resume both start in normal mode.
- The pure helpers are the unit-tested seams: `withoutWriteTools(active)`
  returns the active tool names minus `edit` and `write`;
  `resolveTransition(desired, applied)` decides the next transition;
  `statusLabel(desired, applied)` renders the footer label;
  `statusToken(label)` picks the label's theme color;
  `loadPlanInstruction(path)` reads and trims a prompt file;
  `keepModeMessages(messages, applied)` keeps exactly the newest mode
  message of the applied polarity; and `resolveShortcut(cwd)` reads the
  settings.

## Plan-mode resume healing (ADR-0013)

`setActiveTools` deltas persist in the session transcript; plan mode's
flags do not. A resume can therefore replay a "write tools removed" delta
while the extension starts in normal mode, which previously stranded
`edit`/`write` forever and corrupted the restore checkpoint. The extension
now heals: on `session_start` (when not applied) and again before
checkpointing on `enable`, any *configured* write tool missing from the
active set is restored; `disable` unions the checkpoint with the configured
write tools and the off-notice warns when a tool could not be brought
back. A session deliberately configured without `edit`/`write` is never
touched.

## Plan-mode standing guideline (ADR-0014)

The mode's state — not just its transitions — rides the system prompt: on
every `before_agent_start` the extension keeps exactly one guideline in
`systemPromptOptions.promptGuidelines`. Applied → the read-only guideline
with the `var/` scratch exception; after the first lift → the "you may
edit files again" guideline; never applied → nothing. Guidelines are
recognized by their `Plan mode` prefix and re-synced per request, so they
never stack and edited texts are replaced. The hidden messages remain the
transition signals, re-asserted per prompt while applied (ADR-0015); the
guideline is the per-request state signal in the system prompt.

