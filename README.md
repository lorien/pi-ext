# pi-ext

A [pi](https://pi.dev) package hosting custom extensions and skills.

## Contents

- Extension `zai_web_search` — live web search via the z.ai `search-prime`
  engine, called as direct REST rather than through MCP.
- Extension `plan-mode` — a `/plan` toggle for a read-only exploring and
  analysis mode.
- Skills — none yet. Skills live in [`skills/`](./skills).

## Layout

```text
pi-ext/
├── package.json          # pi manifest (declares extensions + skills)
├── tsconfig.json
├── extensions/
│   ├── plan-mode-off-prompt.txt
│   ├── plan-mode-prompt.txt
│   ├── plan-mode.ts
│   └── zai-web-search.ts
└── skills/               # each skill is a directory with a SKILL.md
```

## Install

### From a local clone (development)

```bash
git clone <this-repo> ~/code/pi-ext
pi install ~/code/pi-ext
```

Or load it without installing, for the current run only:

```bash
pi -e ~/code/pi-ext
```

### From Git

```bash
pi install git:github.com/<you>/pi-ext
```

After installing, run `/reload` (or restart pi) so the extensions load.

## Configuration — `zai_web_search`

The key is resolved in this order:

1. `$ZAI_API_KEY` (environment)
2. `<project>/.pi/settings.json`
3. `<agent-dir>/settings.json` (default `~/.pi/agent/settings.json`, which
   honors `$PI_CODING_AGENT_DIR`)

### Via `settings.json`

Add a `zaiWebSearch` section to either file. `apiKey` is either the key
itself, or a `file:` reference to a file holding it:

```json
{
  "zaiWebSearch": {
    "apiKey": "your-key"
  }
}
```

```json
{
  "zaiWebSearch": {
    "apiKey": "file:<path>"
  }
}
```

The `file:` form keeps the secret out of the settings file, which gets
synced, backed up, and shared.

- Only a leading `file:` starts a reference. A literal key that contains
  `file:` elsewhere is still a literal key.
- Paths follow pi's rule for settings paths: `~` and absolute paths work,
  and a relative path resolves against the directory holding the settings
  file.
- The file is read on each tool call and its contents are trimmed, so
  rotating the key needs no `/reload`.
- A reference that cannot be read, names an empty file, or carries no
  path throws with the path in the message instead of falling through to
  the next source.
- `$ZAI_API_KEY` is always a literal key; `file:` is settings syntax
  only.

Project settings win over global ones, so you can scope a key to a single
repository with `.pi/settings.json` (add `.pi/` to `.gitignore` if you do
not want to commit it).

`zaiWebSearch` is this extension's own key — pi has no schema for
extension settings. This is safe to add: pi parses `settings.json` without
validation, and its write path merges into the file's existing contents,
so unknown keys are preserved rather than stripped. No warning is emitted
for unknown keys.

### Via environment

Useful for one-off runs or CI:

```bash
ZAI_API_KEY=your-key pi
export ZAI_API_KEY=your-key   # e.g. in ~/.bashrc
```

If no key is found, the tool fails with a message naming both settings paths it checked.

### Tool parameters

- `query` — string, required. The search query.
- `count` — integer, default `10`. Between 1 and 50 results.
- `recency` — enum, default `noLimit`. One of `oneDay`, `oneWeek`,
  `oneMonth`, `oneYear`, `noLimit`.
- `domain` — string. Restrict results to a domain, for example
  `doc.rust-lang.org`. This is best effort.
- `engine` — enum, default `search-prime`. One of `search-prime`,
  `search_pro_jina`, `search_pro`, `search_std`.

## Plan mode

`/plan` toggles plan mode, a read-only mode for exploring a codebase and
agreeing on a plan before anything is changed.

- Toggling records the change and updates the footer right away, but the
  tool set and the injected message change only when your next prompt
  starts a run. A run always works under the mode it started with, so
  toggling mid-run never pulls tools or instructions out from under the
  running agent, and toggling twice without a prompt in between changes
  nothing at all.
- While plan mode is on, the `edit` and `write` tools are disabled and a
  hidden instruction tells the model it is in a read-only phase and must
  answer the request as asked — a plan is appended only when the user
  asked for a change or for a plan.
- Leaving plan mode injects a one-time hidden notice that the mode is off
  and the write tools are back, so the model knows it may act instead of
  proposing yet another plan.
- One message is injected per mode change, not per prompt, so the
  instruction is never repeated through the session.
- The footer shows `[PLAN]` once a mode is applied and `[~PLAN]` while a
  toggle is waiting for your next prompt.
- Both message texts are read at load from files beside the module:
  [`plan-mode-prompt.txt`](./extensions/plan-mode-prompt.txt) for the
  on-instruction and
  [`plan-mode-off-prompt.txt`](./extensions/plan-mode-off-prompt.txt)
  for the off-notice. Edit either file to change what plan mode tells the
  model; a missing or blank file stops the extension from loading.
- The mode is in memory only: restarting pi or resuming a session starts
  in normal mode.
- `bash` is not restricted, so plan mode is a guardrail, not a sandbox.

### Shortcut

A keyboard shortcut toggles plan mode. Set it with a `planMode.shortcut`
value in `settings.json`:

```json
{
  "planMode": {
    "shortcut": "alt+space"
  }
}
```

The default is `alt+space`. A project `.pi/settings.json` wins over the
global `<agent-dir>/settings.json`; an absent or unusable value falls back
to the default. The shortcut cannot be changed through `keybindings.json`,
because extension shortcuts are not addressable there, so this setting is
the only way to change it. Some terminals and window managers intercept
`alt+space`; pick another key if the shortcut does nothing.

## Development

```bash
npm install          # installs dev deps (typescript, @types/node)
npm run typecheck    # tsc --noEmit
```

Load the working tree directly while iterating:

```bash
pi -e ./extensions/zai-web-search.ts
pi -e ./extensions/plan-mode.ts
```

## License

MIT — see [LICENSE](./LICENSE).
