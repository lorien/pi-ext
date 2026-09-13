# ADR-0010: Plan mode shortcut as a setting

Date: 2026-09-13
Status: accepted

## Context

Plan mode is toggled by the `/plan` command. A keyboard shortcut makes it
faster, but pi's `registerShortcut` takes a literal key, and
`keybindings.json` remaps only namespaced built-in action ids. An extension
shortcut therefore has no id a user can bind, and cannot be changed once
the package is installed. A default that is wrong for a terminal — for
example a key the window manager grabs — would be unfixable without
editing the extension source.

## Decision

The shortcut comes from a `planMode.shortcut` setting in `settings.json`,
resolved by the pure `resolveShortcut(cwd)` helper. Project
`.pi/settings.json` wins over `<agent-dir>/settings.json`; the default is
`alt+space`. An absent, unreadable, non-string, or whitespace-only value
falls back to the default. The shortcut is registered once at
`session_start`.

## Alternatives rejected

- A fixed shortcut registered at load. Simplest, but not overridable, and a
  poor default would be permanent.
- A CLI flag. Flags configure a single run; the shortcut is a durable
  preference.
- No shortcut at all. Defensible, but a mode toggle benefits from one.
- Relying on `keybindings.json`. Not possible: extension shortcuts are
  keyed by literal key, not by an action id, so there is nothing for a user
  to remap.

## Consequences

- The shortcut is user-changeable without touching the extension.
- Resolution mirrors the z.ai key setting: project over global over
  default. Unlike that key, an unusable value does not throw — a bad
  keybinding should not break the extension.
- The value is read once per session. Changing it needs a `/reload` or a
  new session, not just a settings edit.
