# ADR-0008: A `file:` reference inside `apiKey`

Date: 2026-09-10
Status: accepted

## Context

ADR-0001 settled that the key is a value: `$ZAI_API_KEY`, or an `apiKey` in
a pi settings file, with no CLI flag and no key-file path variable. It
rejected a package-invented default path, which is a different thing from a
path the user names.

A key stored inline in `settings.json` is copied wherever that file goes.
Settings files get synced between machines, backed up, pasted into issues,
and read by anything that can read the user's home directory. The key ends
up in more places than the user intended, and rotation means editing every
copy.

pi itself has a mechanism for exactly this: provider `apiKey` values in
`models.json` support `!command` execution and `$ENV_VAR` interpolation.
That was investigated first. It applies only to provider credentials, and
the resolver is not exported and cannot be imported (the package exports
map blocks the path), so it is unavailable to an extension. Reimplementing
`!command` in this extension was considered and rejected: it means running
arbitrary shell commands from a config value, which is a much larger
security surface than reading a named file.

## Decision

`zaiWebSearch.apiKey` remains the only configuration option. Its value is
either the key itself, or `file:<path>` to read the key from the file at
that path.

- The prefix is only meaningful at the start of the value. A literal key
  that contains `file:` elsewhere is still a literal key.
- Paths follow pi's rule for settings paths: `~` and absolute paths work,
  and a relative path resolves against the directory holding the settings
  file.
- A `file:` reference that cannot be read, names an empty file, or carries
  no path throws. It does not fall through to the next source: an
  explicitly configured path that does not work is a mistake that should be
  reported, not silently ignored.
- No default path is introduced. The package never invents a location; it
  reads the one the user wrote.
- The environment variable stays a literal value. `file:` is a settings
  syntax, not an environment convention.

## Alternatives rejected

- A separate `apiKeyFile` option. It was implemented first, then dropped.
  Two options that must not be combined mean a conflict check, an error
  path, and documentation explaining which wins; one option whose value has
  two forms carries the same capability with less to explain.
- A `!command` value, matching pi's provider syntax. Rejected above: it
  runs shell commands from a config value to read a secret, when reading a
  named file does the job.
- `$ENV_VAR` interpolation inside the settings value. It solves a different
  problem (indirection through the environment) and the environment is
  already a separate, higher-priority source.
- A package-invented default key path. Still rejected, as in ADR-0001. This
  ADR reverses nothing about that: the user names the path, the package
  does not guess it.
- Doing nothing, keeping the key inline. Accepts the copying problem.

## Consequences

- The secret can stay in one file with one copy, readable only by the user.
- A typo in the path fails loudly at the first tool call, with the path in
  the message.
- The extension reads an arbitrary file named in configuration. That is a
  smaller surface than executing commands, but it is still a file read
  steered by configuration, and the named path is only as protected as the
  settings file itself.
- The `file:` prefix is one more thing for a user to know about. It is
  documented in `configuration.md` and covered by unit tests, including
  that a non-leading `file:` stays literal.
