# pi-ext

A [pi](https://pi.dev) package hosting custom extensions and skills.

## Contents

- Extension `zai_web_search` — live web search via the z.ai `search-prime`
  engine, called as direct REST rather than through MCP.
- Skills — none yet. Skills live in [`skills/`](./skills).

## Layout

```
pi-ext/
├── package.json          # pi manifest (declares extensions + skills)
├── tsconfig.json
├── extensions/
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

### From Git (pinned release)

```bash
pi install git:github.com/<you>/pi-ext@v0.1.0
```

After installing, run `/reload` (or restart pi) so the extensions load.

## Configuration — `zai_web_search`

The key is resolved in this order:

1. `$ZAI_API_KEY` (environment)
2. `<project>/.pi/settings.json`
3. `<agent-dir>/settings.json` (default `~/.pi/agent/settings.json`, which
   honors `$PI_CODING_AGENT_DIR`)

### Via `settings.json`

Add a `zaiWebSearch` section to either file:

```json
{
  "zaiWebSearch": {
    "apiKey": "your-key"
  }
}
```

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

## Development

```bash
npm install          # installs dev deps (typescript, @types/node)
npm run typecheck    # tsc --noEmit
```

Load the working tree directly while iterating:

```bash
pi -e ./extensions/zai-web-search.ts
```

## License

MIT — see [LICENSE](./LICENSE).
