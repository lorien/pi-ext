# Testing

## Required checks

Run all of these before finishing any task; `spec/skills/work.md` makes
this the first item of the final list.

- `npm install` — installs the development dependencies (`typescript`,
  `@types/node`).
- `npm run typecheck` — runs `tsc --noEmit` over `extensions/**/*.ts` and
  `test/**/*.ts`.
- `npm test` — runs the unit tests.

All must pass. `typecheck` is expected to produce no output, and `test`
is expected to report no failures.

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

`resolveZaiKey()` is the subject, because it is pure enough to test
without starting pi. The suite covers:

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
- the error naming every source when no key is configured
- the error naming the file when a settings file cannot be parsed

Rules for any test added here:

- No network calls. Do not test the live endpoint from the suite; if
  request-building logic needs coverage, extract it so the request can be
  inspected without being sent.
- No writes outside a temporary directory. Each test creates its own
  temporary project and agent directory and redirects
  `$PI_CODING_AGENT_DIR`, so nothing touches a real agent directory.
- Restore the environment after every test so the suite stays order
  independent.
- Never depend on a real key being present.
