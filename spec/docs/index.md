# Spec Index

Catalog of the documents under `spec/docs/`. `AGENTS.md` points here. Read
them in the order below before working on the repository.

## Reading order

1. `overview.md` — what pi-ext is, its scope, and the repository layout.
2. `conventions.md` — markdown, document, and TypeScript rules.
3. `architecture.md` — how the extensions are built and why.
4. `configuration.md` — how the z.ai API key is resolved.
5. `testing.md` — the checks that must pass before a task is finished.
6. `plan.md` — the open-task list.
7. `adr/0000-adr-format.md` — the decision-record format, then `adr/` for
   the decisions themselves.

## Documents

- `overview.md` — purpose, scope and content policy, file-by-file layout.
- `conventions.md` — markdown, naming, TypeScript, task-record, and ADR
  conventions.
- `architecture.md` — module boundaries, tool registration, HTTP transport,
  error behavior, and the plan-mode extension.
- `configuration.md` — key resolution order, the `zaiWebSearch` settings
  shape, and why it is safe to add to pi settings.
- `testing.md` — required checks, manual smoke test, and the intended unit
  test layout.
- `plan.md` — the open-task list (`Status:` / `Priority:` records).
- `adr/` — architecture decision records, one per decision.
