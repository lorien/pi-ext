## Report on task: Bring README.md onto the documentation conventions

### Task (archived from plan.md)

## Bring README.md onto the documentation conventions

Status: done

`README.md` predates `spec/docs/conventions.md`: it uses tables and lines
longer than the 88-character cap. Rewrite the resource list and the
tool-parameter list as bulleted lists wrapped at the cap, keeping the
content unchanged.

### Done

- Replaced the `## Contents` table with a bulleted list.
- Replaced the `### Tool parameters` table with a bulleted list that keeps
  the parameter name, type, default, and notes.
- Wrapped the four over-length lines (the contents row, the settings
  precedence item, and two paragraphs about `zaiWebSearch`).
- Restricted the markdown rule in `conventions.md` to any markdown file in
  the repository, including `README.md`, instead of only the spec
  documents.

### Spec/ADR amendments

- `[acted]` `conventions.md` now states the no-tables rule for every
  markdown file, not just `spec/docs/`.

### Future-task notes

- `[acted]` `README.md` is still outside the documentation sync guarantee:
  `work.md` points at `spec/docs/`, so a change to the extension's
  parameters or configuration must be mirrored in `README.md` by hand. If
  this drifts, consider having `README.md` defer to `configuration.md` for
  the details instead of restating them.
  Resolved the other way (owner ruling, see
  `report-1789079636-readme-file-form.md`): `README.md` is the only
  end-user doc and `spec/` is internal-only, so end-user behavior is
  restated in `README.md`; the defer-to-spec idea is dropped. The sync
  rule now extends to `README.md` via `conventions.md`.

### Tooling/process

- `[acted]` The table check is mechanical:
  `grep -rn "^|" --include="*.md" .` must print nothing, and
  `awk 'length > 88'` over the same files must print nothing.
