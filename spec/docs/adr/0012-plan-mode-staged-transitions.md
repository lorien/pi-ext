# ADR-0012: Plan mode staged transitions and off notice

Date: 2026-09-19
Status: accepted

## Context

Disabling plan mode was signalled only by absence: the `context` filter
removed the read-only instruction and the write tools returned, but
nothing told the model the mode had been lifted. In a long session the
model kept proposing plans after the lift until the user forced it with
an explicit "go". The session's usage records showed why — a dozen
stacked copies of the instruction had over-reinforced the read-only
behavior, so the model re-derived its stance from the user's wording
instead of the mode.

The same session exposed two more defects. The instruction was injected
once per user prompt, so copies accumulated through the session (34 by
its end). And the toggle applied immediately, so a mid-run toggle changed
the tool set and the filtered context under the running agent.

## Decision

The mode is staged into a *desired* value, set by the toggle, and an
*applied* value, set when a run starts. The toggle only flips the desired
mode and updates the footer. `before_agent_start` applies a transition
atomically: it swaps the active tool set, injects exactly one hidden
message, and sets the applied mode. A run always executes under the mode
it started with.

- Enabling injects the read-only instruction with
  `customType: "plan-mode-context"`; disabling injects an off-notice with
  `customType: "plan-mode-off"` saying the mode is off, the write tools
  are back, and an instruction to act should be executed. One message per
  mode change, never one per prompt.
- The off-notice text lives in `extensions/plan-mode-off-prompt.txt`,
  loaded by the same `loadPlanInstruction(path)` helper as the
  on-instruction, with the same fail-on-missing-or-blank behavior
  (ADR-0011).
- The `context` filter is keyed on the applied mode and drops the message
  type that contradicts it: the read-only instruction while the mode is
  off, the off-notice while it is on. Stale mode messages are removed
  rather than superseded by a later message.
- The footer names the desired mode and marks it pending with `~` until
  the next prompt applies it: `[PLAN]`, `[~PLAN]`, and `[~NORMAL]` while
  a lift is pending. (Revised the same day from a pending label that
  always read `[~PLAN]`, which read as plan-pending even while lifting
  the mode.)

## Alternatives rejected

- Applying the toggle immediately (the previous behavior). Tools and
  context changed mid-run, under the running agent's feet, and the
  per-prompt injection stacked copies of the instruction.
- Append-only supersession: keep the read-only instruction and append a
  revoking notice, never removing anything. The prompt cache survives
  every toggle, but the absolutist read-only wording stays in context and
  correctness leans on recency — the observed failure mode.
- Deduplicating to the latest copy. The previous prompt's copy would be
  dropped on every turn, diverging the cached prefix each turn; worse for
  the cache than an occasional toggle.
- Delivering the notice as a steering message at toggle time, so it lands
  mid-run. It contradicts the run-boundary semantics, and the tool set is
  the enforcement, so nothing needs to interrupt a running agent.

## Consequences

- A run always executes under one mode; a mid-run toggle leaves the
  running agent's tools and instructions untouched. A toggle reversed
  before the next prompt collapses to no transition and no message.
- Toggling plan mode on mid-run leaves the running agent with the write
  tools until the next prompt; the owner accepted this.
- Removing a mode message on a toggle invalidates the provider's cached
  prefix from the earliest stored mode message. The first switch to a
  given form pays it; switching back to a previously cached form is
  cheap, as the session's usage records showed (a first disable
  reprocessed the whole context, a later one reprocessed only the
  interleaved period).
- A compaction or branch summary can still bake the read-only wording
  into a summary message the filter cannot drop; that is a pi-side gap,
  recorded as a future task, not a decision of this extension.
- `/reload` or a restart resets both modes to normal.
