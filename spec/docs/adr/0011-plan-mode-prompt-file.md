# ADR-0011: Plan-mode instruction in a sibling text file

Date: 2026-09-14
Status: accepted

## Context

Plan mode injects an instruction into the conversation; ADR-0009 records
the injection mechanism. The text of that instruction is long, is prose
for the model rather than logic, and is edited on its own. Kept as a
TypeScript constant it embeds a large string literal in the module, forces
the source line limit onto prose, and makes every wording change a code
change.

## Decision

The instruction lives in `extensions/plan-mode-prompt.txt`, a plain text
file beside the module. `plan-mode.ts` reads it at load through the
exported `loadPlanInstruction(path)` helper and injects the trimmed
contents. A missing or blank file throws at load, so the mode cannot
silently run without guidance. Plain `.txt` keeps the prompt out of the
markdown checker and free of the 88-character line rule.

## Alternatives rejected

- Keeping the string in the module. Compact and needs no file handling,
  but puts long prose inside the source, wraps it to the code line limit,
  and turns a text edit into a code edit.
- A markdown file. It would be checked by `check-md.mjs`, whose line cap,
  table ban, and language-tag rules are wrong for a verbatim prompt, and
  would need an exemption.
- A settings value such as `planMode.instruction`. It would move the
  default text out of the repository and make the mode's behavior depend
  on user configuration.
- Failing soft on a missing file, by injecting nothing or a short
  fallback. The mode would appear on while telling the model nothing,
  which is harder to notice than a load error.

## Consequences

- The instruction is edited as text, without touching TypeScript, and its
  wording is not subject to the code line limit.
- The package must ship the `.txt` file beside the module; a distribution
  that copies only `.ts` files breaks the extension at load.
- The prompt is read once at load, so an edit needs a reload, like any
  other extension change.
