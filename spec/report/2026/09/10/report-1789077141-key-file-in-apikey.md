## Report on task: Key file support inside `apiKey`

### Done

- Replaced the `apiKeyFile` option with a `file:` form of the single
  `apiKey` option: `"apiKey": "file:<path>"` reads the key from that file,
  anything else is the key itself.
- Removed the conflict check and its error path, which existed only because
  two options could disagree.
- Kept path handling as it was: `~` expansion, absolute paths, and relative
  paths resolved against the directory holding the settings file, matching
  pi's rule for settings paths.
- Made a broken reference loud: a `file:` value with no path, a path that
  cannot be read, or an empty file throws with the path in the message,
  rather than falling through to the next source.
- Trapped the case that a key containing `file:` at a non-leading position
  stays a literal key, since the prefix is only syntax at the start.
- Updated the 7 affected unit tests; the suite is 21 tests, all passing.
- Pointed the global pi settings at
  `"apiKey": "file:<path to the key file>"`, so the secret is no longer
  stored in the settings file.
- Added `adr/0008-api-key-file-reference.md`, revised ADR-0001's status to
  record the successor, updated `configuration.md` and `testing.md`.

### Verification

- `npm run check` passes: 21 unit tests, typecheck, lint, markdown checker.
- The key resolves through the `file:` form, and `npm run test:e2e` passes
  both live checks, so the real search works with a key read from a file.
- `rg "apiKeyFile"` finds nothing left in the repository.

### Spec/ADR amendments

- `[acted]` ADR-0008 added; ADR-0001 marked as revised rather than
  superseded, because its core still holds: source order, no CLI flag, and
  no package-invented path.
- `[acted]` `configuration.md` documents both forms of `apiKey` and the
  error behavior.
- `[acted]` `testing.md` lists the `file:` cases.
- `[acted]` Marked the plaintext-credential item `[acted]` in
  `report-1789074430-live-path-verified.md`: the settings file now holds a
  reference, so its mode no longer protects anything.

### Future-task notes

- `[acted]` The `file:` path is read on every key resolution, which is every
  tool call. That is a small read, but it is repeated work; caching would
  need an invalidation story and is not worth it at this size. Resolved
  2026-09-25: the extension was deprecated and moved to `deprecated/`
  (ADR-0016); the trade-off is retired with the module.
- `[acted]` Nothing verifies that the referenced file has restrictive
  permissions. A key file readable by other users is accepted silently.
  Resolved 2026-09-25: same deprecation (ADR-0016); the module is no
  longer loaded by the package.
- `[acted]` The environment variable takes no `file:` form. That is
  deliberate: `file:` is settings syntax. Worth revisiting only if someone
  asks for it. Resolved 2026-09-25: same deprecation (ADR-0016).

### Tooling/process

- `[acted]` Do not detect a feature by looking for a symbol in a directory
  tree. Checking whether pi supports `!command` took a bounded read of its
  docs and package exports; the earlier attempt to answer a similar
  question with a recursive search over everything was the command that had
  to be killed.
- `[open]` Editing an extension does not affect a running pi session: the
  module is loaded at startup. This was observed directly, when the
  in-session tool still behaved like the previous revision while a fresh
  process behaved like the new one. Use `/reload`, or verify from a fresh
  process, before trusting in-session behaviour after an edit. That
  observation also explains an earlier anomaly that is now moot, since the
  two-option design it involved has been removed.
