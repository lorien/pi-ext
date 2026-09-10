# Configuration

The `zai_web_search` tool needs a z.ai API key. No key is stored in this
repository; one is resolved at call time, and the first source that yields
a non-empty value wins.

## Resolution order

1. `$ZAI_API_KEY` — the environment variable.
2. `<project>/.pi/settings.json` — the project-scoped pi settings file.
3. `<agent-dir>/settings.json` — the global pi settings file. The agent
   directory is pi's own, defaulting to `~/.pi/agent` and honoring
   `$PI_CODING_AGENT_DIR`; it is resolved with pi's exported
   `getAgentDir()` so the behavior cannot drift.

The project directory is the session working directory, and the project
file name is built with pi's exported `CONFIG_DIR_NAME`. An unset
variable and a whitespace-only value are both treated as absent, and keys
are trimmed before use.

## Settings shape

Add a `zaiWebSearch` section to either settings file. `apiKey` accepts
one option, whose value is either the key itself or a `file:` reference
to a file holding it:

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

The `file:` form keeps the secret out of the settings file, which matters
when settings are synced, backed up, or shared. The prefix is only
treated as a reference at the start of the value; anything else is the
key itself, so a literal key containing `file:` elsewhere still works.

Paths follow pi's rule for settings paths: `~` and absolute paths are
supported, and a relative path resolves against the directory holding the
settings file. A `file:` reference that cannot be read, names an empty
file, or carries no path is an error rather than a silent fall-through,
because an explicitly configured path that does not work is a mistake
worth reporting.

Project settings override global settings, so a key can be scoped to one
repository. A project that keeps a key in `.pi/settings.json` should list
`.pi/` in `.gitignore` if the key must not be committed.

## Why adding an unknown key is safe

`zaiWebSearch` is this package's own settings key; pi has no schema for
extension settings and no API through which an extension can read them.
The extension therefore reads the settings files directly. This is
tolerated by pi in the current release:

- pi parses `settings.json` without schema validation, so an unknown key
  is accepted silently.
- pi's settings write path merges into the file's existing contents and
  overwrites only the fields it modified, so unknown keys survive pi's own
  writes. This is verified by test, not assumed.
- Unknown keys produce no warning; settings diagnostics cover only lock
  and parse failures.

The reliance is undocumented behavior, so it is an accepted coupling
rather than a guarantee. `$ZAI_API_KEY` remains the source that depends on
no pi behavior at all.

## Absent mechanisms

These were considered and deliberately not implemented; see
`adr/0001-configuration-source.md`:

- No CLI flag. The extension registers no flags.
- No key-file path variable, and no default path to a key file. A path
  invented by the package would be a guess presented as a convention.
- No entry in pi's `auth.json`. That file holds credentials for pi's own
  providers, and the extension does not participate in provider auth.

## Failure mode

When no source yields a key, the tool throws with a message naming
`$ZAI_API_KEY` and both settings file paths that were checked. When a
settings file exists but cannot be parsed, the tool throws with the file
path and the parse error; a malformed file is a real error and is not
skipped silently.
