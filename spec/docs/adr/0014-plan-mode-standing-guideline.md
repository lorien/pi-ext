# ADR-0014: Plan-mode standing guideline and session-aware off state

Date: 2026-09-24
Status: accepted

## Context

Plan mode signalled the model only through one-time hidden messages at the
transition points (ADR-0009/0012). Those messages stay where they were
injected in the transcript, so in a long session their pull on the model
decays — a live multi-day incident showed an explicit user build order
("we need (b)") overriding an applied plan mode, with the agent writing
files through bash. The incident review also produced a workflow need:
during planning, an agent often wants scratch space for notes and drafts
without touching the project.

## Decision

- **Standing guideline in the system prompt.** On every
  `before_agent_start`, the extension keeps exactly one plan-mode
  guideline in `systemPromptOptions.promptGuidelines`:
  - while the mode is applied — a read-only guideline that explicitly
    covers bash (no `sed -i`, `tee`, redirection, `mv`/`rm`, commits,
    installs), states that an explicit user instruction to execute must be
    declined in one line, and grants the **one write exception: the
    project's `var/` directory** (notes, drafts, intermediate output);
  - after the first lift — an off-guideline ("you may create, edit, and
    delete files again … execute instead of proposing");
  - in a session where plan mode was never applied — no plan-mode prompt
    content at all.
- **Idempotent per request**: guideline strings are recognized by their
  `Plan mode` prefix and re-synced; they never stack, and a text edited
  between runs is replaced rather than accumulated.
- **One-time prompt updated**: the read-only instruction gains the same
  `var/` scratch exception, so the transition message and the standing
  guideline agree.
- Guideline texts live in sibling files
  (`plan-mode-guideline-on.txt` / `plan-mode-guideline-off.txt`), loaded
  with the existing fail-on-empty loader.

The hidden transition messages (ADR-0009/0012) are unchanged: they remain
the *event* signals; the guideline is the *state* signal present in every
request.

## Alternatives rejected

- **Repeating the instruction per prompt as messages** — ADR-0012 showed
  stacked copies over-reinforce the model into planning after the lift.
  The standing guideline avoids this: pi diffs prompt changes, and on the
  lift the OFF text replaces the ON text rather than piling onto it.
- **Bash write blocking via the `tool_call` hook** — mechanical and
  effective, but the owner declined it for now (possible follow-up behind
  a `planMode.bashGuard` setting).
- **Removing `bash` while applied** — blunt; kills read-only inspection
  (`rg`, `ls`, `git log`) that plan mode exists to serve.
- **Persisting mode state across resumes** — orthogonal; still rejected as
  in ADR-0013 (a fresh process starts normal, and the guideline follows
  that state).
