# ADR-0001: Key configuration source

Date: 2026-09-10
Status: accepted

## Context

The `zai_web_search` tool needs a z.ai API key. Early versions of the
extension accepted a key file whose path came from a CLI flag
(`--zai-key-file`) or an environment variable (`$ZAI_KEY_FILE`), and
defaulted to a path under the user's home directory when neither was set.

Three problems surfaced:

- The default path was invented by the package: a specific directory and
  file name presented as though it were an established convention. It was
  not, and it leaked one developer's local layout into the repository.
- A dedicated path variable plus a CLI flag plus an environment variable
  is three mechanisms for one value, and the flag only exists while the
  extension is loaded.
- pi has no API for extension settings, and no documented convention for a
  package to claim a path. Any path choice would be a guess.

## Decision

The key is resolved at call time from, in order:

1. `$ZAI_API_KEY`.
2. The `zaiWebSearch.apiKey` value in the project's `.pi/settings.json`.
3. The same value in the global settings file in pi's agent directory.

There is no CLI flag, no key-file path variable, and no default path to a
key file. A key is a value, not a location.

The settings source depends on pi tolerating unknown keys in
`settings.json`. That is verified against the current release: no schema
validation on read, unknown keys preserved on write, no unknown-key
warning. It is undocumented behavior, so the environment variable remains
the source that depends on no pi behavior; see
`spec/docs/configuration.md`.

## Alternatives rejected

- A key-file path from the environment or a CLI flag. It moves the problem
  rather than solving it: the user still needs a file, and the package
  still has to document a path or a flag. Dropped entirely, including the
  legacy `$ZAI_KEY_FILE` variable.
- A dedicated settings file owned by the package, for example
  `zai-web-search.json` in the agent directory. It adds a second settings
  mechanism next to pi's own file, and the path and name are still
  invented by the package, with the same defect as the original default.
- An entry in pi's `auth.json`. It is the natural home for a credential,
  but it is pi's provider credential store: the extension would depend on
  another component's file format and could collide with provider names.
- Adding the key to `models.json` or registering a pi provider. The search
  tool is not a model provider, so this would abuse the provider
  machinery for an unrelated concern.
