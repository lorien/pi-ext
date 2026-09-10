# Testing

## Required checks

Run all of these before finishing any task; `spec/skills/work.md` makes
this the first item of the final list.

- `npm install` — installs the development dependencies (`typescript`,
  `@types/node`).
- `npm run typecheck` — runs `tsc --noEmit` over `extensions/**/*.ts`.

Both must pass. `typecheck` is expected to produce no output.

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

## Unit tests

The intended target is `resolveZaiKey()`, which is pure enough to test
without starting pi:

- Set `$ZAI_API_KEY` and confirm it wins over both settings files.
- Point the agent directory at a temporary directory with
  `$PI_CODING_AGENT_DIR` and confirm the global settings file is read.
- Point the working directory at a temporary project and confirm project
  settings win over global settings.
- Confirm that an absent file, a file without the `zaiWebSearch` section,
  a non-string `apiKey`, and a whitespace-only value all fall through.
- Confirm that a malformed settings file throws with the path in the
  message.

Rules for any test added here:

- No network calls. Do not test the live endpoint from the suite; if
  request-building logic needs coverage, extract it so the request can be
  inspected without being sent.
- No writes outside a temporary directory. Tests set
  `$PI_CODING_AGENT_DIR` rather than touching a real agent directory.
- Never depend on a real key being present.

No test runner is configured yet; adding one, with these cases, is tracked
in `plan.md`. Update this document when the runner lands.
