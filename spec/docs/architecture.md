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
- On enable it records `pi.getActiveTools()` and sets the list without
  `edit` and `write`; on disable it restores the recorded list. See
  `adr/0009-plan-mode-instruction-injection.md`.
- `before_agent_start` injects a hidden message with
  `customType: "plan-mode-context"` while the mode is on. The system
  prompt is not modified.
- The injected text is read at load from `extensions/plan-mode-prompt.txt`
  beside the module; a missing or blank file fails the extension load
  instead of injecting nothing. See `adr/0011-plan-mode-prompt-file.md`.
- `context` drops messages with that `customType` while the mode is off,
  so the instruction does not outlive the mode.
- The footer shows a `[PLAN]` status while the mode is on.
- State is in memory only; restart and resume both start in normal mode.
- The pure helpers are `withoutWriteTools(active)`, which returns the
  active tool names minus `edit` and `write`; `loadPlanInstruction(path)`,
  which reads and trims the prompt file; and `resolveShortcut(cwd)`,
  which reads the settings. They are the unit-tested seams.
