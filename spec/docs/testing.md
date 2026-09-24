# Testing

## Required checks

Run all of these before finishing any task; `spec/skills/work.md` makes
this the first item of the final list.

- `npm install` — installs the development dependencies (`typescript`,
  `@biomejs/biome`, `@types/node`).
- `npm run typecheck` — runs `tsc --noEmit` over `extensions/**/*.ts` and
  `test/**/*.ts`.
- `npm test` — runs the unit tests.
- `npm run lint` — runs Biome over the TypeScript and JSON files.
- `npm run check:md` — runs the markdown checker.

All must pass. `typecheck` and `lint` are expected to report nothing
wrong, and `test` is expected to report no failures. `npm run check` runs
all four in sequence.

### Local-content check

The repository is public and must not disclose machine-specific details;
the rule is in `conventions.md`. Run:

```bash
grep -rn \
  -e '/home/[a-z0-9_-]+/' -e '/Users/[A-Za-z0-9_-]+/' \
  -e '/tmp/[a-z]' -e 'ssh-rs[a]' -e '-----BEGI[N]' \
  --exclude-dir=.git --exclude-dir=node_modules \
  --exclude=package-lock.json .
```

The command must print nothing. The patterns are written so that neither
the placeholders in `conventions.md` nor this command's own text matches
them, so a clean run means no real path, key, or public key is present.

Then review the home-relative paths, which cannot be checked
mechanically:

```bash
grep -rnoE '~/[A-Za-z0-9._/-]+' --exclude-dir=.git \
  --exclude-dir=node_modules .
```

Every hit must be one of: a standard documented location
(`~/.pi/agent`, `~/.bashrc`), the clone example `~/code/pi-ext`, or a
generic placeholder used in the rule text. Anything else is a leak:
replace it with a placeholder or remove it.

Finally, confirm that no key, token, or password appears in the sources or
the documents, and that `.gitignore` still covers the generated files.

### Markdown check

Biome covers TypeScript and JSON, not markdown, so the markdown rules in
`conventions.md` are checked by `npm run check:md`. It parses every
markdown file and fails on a table, a line over the cap, a file without
exactly one leading level-1 heading, and a fenced block without a language
tag. Run it directly, or as part of `npm run check`.

The checker mirrors the rules; it is not their source. When a markdown
convention changes, update `conventions.md` first and `tools/check-md.mjs`
in the same commit. The exemptions for `spec/skills/` and `spec/report/`
are documented in `adr/0006-markdown-checker.md`.

## End-to-end check

`npm run test:e2e` runs `e2e/*.e2e.ts` against the live z.ai API. It is not
part of `npm test` or `npm run check`, because it needs a real key, spends
quota, and depends on the network.

What it does:

- Skips the live suite with a visible reason when no key is configured; it
  does not fail. `resolveZaiKey()` makes that decision, so the same sources
  the tool reads are what enable the check.
- Otherwise it makes one real search with `count: 3` and asserts that
  results come back with links, that the count is honoured, and that
  `formatSearchResults()` renders numbered entries with indented links.
- It also asserts that an invalid key is rejected by the live service. That
  case needs no configured key, so it runs even when the live suite is
  skipped, and it confirms the check is really talking to the API.

Placement is deliberate: the files live in `e2e/`, not under `test/`. Node
treats every file under a `test/` directory as a test file, so a bare
`node --test` would run them and make real requests. A bare `node --test`
collects only the unit suite.

The positive path cannot run without a key, so it is the one part of the
repository that is verified by hand. Run it after any change to
`runZaiWebSearch()`, the request body, or the response handling:

```bash
npm run test:e2e
```

If it skips and a key is configured, the reason is printed next to the
skipped suite.

## Manual smoke test

The tool calls a live API, so the smoke test is manual and needs a key:

```bash
pi -e ./extensions/zai-web-search.ts
```

Then ask for something that requires current information, and confirm that
the tool is selected and that results come back formatted as numbered
entries with a link and a snippet.

To check only that the module loads and registers its tool, import it and
call the default export with a stub object that records
`registerTool`. This needs no key and no network.

Plan mode needs no key. Load it with `pi -e ./extensions/plan-mode.ts`
and confirm the `[NORMAL]` status shows. Run `/plan` and confirm the
`[~PLAN]` status appears immediately; send a prompt and confirm that
`edit` and `write` drop out of the active tools, the status settles to
`[PLAN]`, and the reply stays read-only. Run `/plan` again and confirm
the `[~NORMAL]` status shows, that a still running agent is untouched,
and that the next prompt restores both tools and answers as an agent
free to act. Toggle twice without a prompt in between and confirm the
status returns to `[NORMAL]`.

## Unit tests

The suite runs on the test runner built into Node; the choice and its
rejected alternatives are recorded in `adr/0003-test-runner.md`. Tests are
TypeScript files matching `test/*.test.ts`, executed directly through
Node's type stripping:

```bash
npm test
```

Facts that matter when adding tests:

- `node:test` provides the structure and `node:assert/strict` the
  assertions. There is no test framework dependency.
- Node 22.18 or newer is required, because flagless type stripping does
  not exist before it.
- The sources are executed, not transformed. TypeScript syntax that needs
  a transformation, such as `enum` and parameter properties, cannot be
  used.
- Tests live in `test/`, never in `extensions/`. The `pi` manifest
  declares `extensions/` as an extension directory, so a `*.test.ts` file
  there could be loaded as an extension.
- `npm run typecheck` covers `test/**/*.ts` as well as the extension, so
  the tests are type-checked too.

`resolveZaiKey()` and `withoutWriteTools()` are the subjects, because
they are pure enough to test without starting pi. The z.ai suite covers:

- the environment key, including trimming, and that it wins over both
  settings files
- project settings winning over global settings
- the global settings file being read when the project has none, and when
  no working directory is given
- a settings file that holds other settings alongside `zaiWebSearch`
- a settings file that starts with a byte-order mark
- fall-through for an absent file, a missing `zaiWebSearch` section, a
  non-string `apiKey`, a whitespace-only `apiKey`, a section that is not
  an object, and a whitespace-only environment variable
- a `file:` reference: reading the key from the file, `~` expansion,
  relative resolution against the settings file, a `file:` that is not at
  the start staying literal, and the errors for a path that does not
  exist, an empty file, and a prefix with no path
- the error naming every source when no key is configured
- the error naming the file when a settings file cannot be parsed

The plan-mode suite covers the standing guideline (ADR-0014): no
guideline before the mode is ever applied; the ON guideline (with the
`var/` allowance) on every prompt while applied without stacking; the OFF
guideline after the first lift, kept on later prompts and swapped back on
re-enable; no guideline in a fresh (resumed) session that never applied
the mode; the loader still rejects empty guideline files.

The plan-mode suite covers resume healing (ADR-0013):
`missingWriteTools()` / `withConfiguredWriteTools()`, plus a mock-pi
end-to-end of the corruption scenario — enable, simulated resume with a
gutted replayed tool set, heal with notification, and a clean
enable/disable round-trip — and the off-notice warning when a restore
cannot bring a configured write tool back.

The plan-mode suite covers `withoutWriteTools()`: removal of `edit` and
`write` with the other tools' order preserved, a no-op when neither is
active, exact-name matching, and the empty list. It also covers
`resolveShortcut()`: the project setting winning over the global one, the
global fallback, trimming, the `alt+space` default, fall-through for a
missing section, a non-string value, a whitespace-only value, a section
that is not an object, and unparseable JSON. It also covers
`loadPlanInstruction()`: returning the trimmed contents, stripping a
byte-order mark, and throwing on a missing or a blank file. It also
covers `resolveTransition()`: the enable and disable transitions, `none`
while the desired and applied modes agree, and a toggle reversed before
a run collapsing to `none`. It also covers `statusLabel()`: `[PLAN]` while
plan mode is applied, `[~PLAN]` while enabling is pending, `[NORMAL]` in
normal mode, and `[~NORMAL]` while a lift is pending. It also covers
`statusToken()`: `dim` for `[NORMAL]`, `text` for `[~NORMAL]`, and
`mdHeading` for the plan labels.
It also asserts that both shipped prompt files load with content. The
rest of the extension — the command and shortcut toggle,,
the `session_start` shortcut registration, the `before_agent_start`
application, and the `context` filter — is wired to pi state and has no
unit test.

Rules for any test added here:

- No network calls, ever. The live endpoint is exercised only by the
  end-to-end check below. If request-building logic needs coverage, extract
  it so the request can be inspected without being sent.
- No writes outside a temporary directory. Each test creates its own
  temporary project and agent directory and redirects
  `$PI_CODING_AGENT_DIR`, so nothing touches a real agent directory.
- Restore the environment after every test so the suite stays order
  independent.
- Never depend on a real key being present.
