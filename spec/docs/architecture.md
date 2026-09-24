# Architecture

The repository ships two extensions: `zai_web_search`, defined in
`extensions/zai-web-search.ts`, and plan mode, defined in
`extensions/plan-mode.ts`. This document describes their intended design.

## Shape of an extension

- An extension is a single ES module whose default export is a factory:
  `export default function (pi: ExtensionAPI) { ... }`.
- The factory registers everything the extension provides. For
  `zai_web_search` that is one tool; for plan mode, one command, one
  status line, and two event hooks.
- pi loads the file directly from `extensions/`, as declared by the `pi`
  manifest in `package.json`. There is no build step and no bundling.

## Module boundaries

`extensions/zai-web-search.ts` is split into pure helpers and a thin
registration layer:

- `resolveZaiKey(cwd?)` — returns the API key, or throws. Pure apart from
  reading the environment and settings files; takes the working directory
  as an argument so it can be tested directly.
- `readKeyFromSettingsFile(path)` — internal. Returns `undefined` when the
  file is absent or holds no key, and throws when the file exists but is
  not valid JSON.
- `runZaiWebSearch(params, apiKey, signal?)` — performs the HTTP request
  and returns the parsed response.
- `formatSearchResults(json)` — renders results as the text the model
  sees.
- The default export registers the tool and delegates to those helpers.

Keeping the helpers exported and free of pi state is what makes the
extension testable; see `testing.md`.

## Tool registration

The extension registers one tool, `zai_web_search`, with:

- A description and a prompt snippet that tell the model when to reach for
  live web data.
- Parameters validated by typebox: `query` (required), `count`, `recency`,
  `domain`, and `engine`.
- An `execute` that resolves the key, calls the endpoint, and returns the
  formatted text. Raw response data is also returned in the tool result
  details for inspection.

The tool is the only surface: there is no command, no flag, and no key
binding.

## Transport

- A direct HTTPS `POST` to the z.ai REST endpoint for web search, using
  the `search-prime` engine by default.
- The engine is selectable per call. The alternatives are the other
  engines the endpoint accepts.
- Requests carry a 30-second timeout; an incoming abort signal is combined
  with that timeout so either can cancel the request.
- The response is parsed as JSON and returned. The request body and the
  response shape are an external contract and are not abstracted behind
  extra layers.

Reaching the REST API directly, rather than through the z.ai MCP server,
is a recorded decision; see `adr/0002-direct-rest-transport.md`.

## Error behavior

Errors are raised as `Error` with a message that names the cause:

- A missing key: the message names the environment variable and the two
  settings files that were checked.
- An unparseable settings file: the message names the file and the parse
  error.
- A non-JSON response: the message includes the HTTP status and a short
  prefix of the body.
- A non-2xx response or an error payload: the message includes the
  provider error code or the HTTP status and the provider message.

Failures propagate to pi, which surfaces them to the user; the extension
does not swallow them and does not retry.

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
- While the mode stays applied, a compact reminder (the same
  `customType: "plan-mode-context"`) is attached to *every* prompt, so the
  mode is visible on the current turn and a reminder-free turn is not read
  as mode-off. See `adr/0015-plan-mode-per-prompt-reminder.md`.
- The message texts are read at load from `plan-mode-prompt.txt`,
  `plan-mode-off-prompt.txt`, and `plan-mode-reminder.txt` beside the
  module; a missing or blank file fails the extension load instead of
  injecting nothing. See `adr/0011-plan-mode-prompt-file.md`.
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

