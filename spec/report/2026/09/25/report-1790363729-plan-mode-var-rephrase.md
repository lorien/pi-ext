# Report on task: Rephrase the plan-mode `var/` scratch section

Ad-hoc owner request (2026-09-25): the plan-mode prompt's `var/` section
read as an invitation to store the plan itself in `var/`, and an agent
did exactly that. Reword the section so `var/` is clearly throwaway
working space, not where the plan lives.

## Done

- `extensions/plan-mode-prompt.txt`: rewrote "Scratch exception — `var/`".
  It no longer lists "plans" among the things to keep there; it now states
  `var/` is the only writable path, meant for throwaway working files
  (captured output, intermediate data, quick notes), and that the plan is
  not a file — it stays in the reply. Writing the plan, a summary, or a
  task checklist into `var/` is named as the anti-pattern.
- `extensions/plan-mode-guideline-on.txt`: the standing guideline now says
  the `var/` allowance is only for temporary working files and that the
  plan itself stays in the reply.
- No other file changed: the reminder and off texts only name the scratch
  allowance without steering the plan into it.
- Checks: `npm run check` green (typecheck, lint, 55 tests, check:md);
  the local-content greps are clean.

## Spec/ADR amendments

- None needed. ADR-0014's decision still holds (one write exception,
  `var/`), and `architecture.md`/`testing.md` describe the allowance
  generically, so both remain accurate.

## Future-task notes

- `[open]` The prompt is still prose: nothing mechanically prevents an
  agent from writing a plan into `var/`; this change only removes the
  nudge. A real guard would have to live in the tool layer.
- `[open]` The wording change is only observable after a pi reload, since
  the prompt files are read once at load.

## Tooling/process

- The rephrase is wording-only, so the loader tests (which assert the
  files are non-empty) are the only automated coverage; behavior is
  verified by reading and use.
