## Report on task: Stage plan-mode transitions and add an off notice

### Done

- Split plan mode into a desired mode (set by the toggle) and an applied
  mode (set when a run starts). The toggle only flips the desired mode,
  refreshes the footer, and notifies; tools and instructions never change
  mid-run.
- `before_agent_start` now applies a transition atomically: it swaps the
  active tool set, injects exactly one hidden message, and settles the
  applied mode and the footer. One message per mode change replaces the
  per-prompt injection that stacked copies of the instruction.
- Added the off-notice (`customType: "plan-mode-off"`, owner-approved
  text in `extensions/plan-mode-off-prompt.txt`), so leaving plan mode
  positively tells the model the mode is lifted and it may act.
- The `context` filter is keyed on the applied mode: the read-only
  instruction is dropped while the mode is off, the off-notice while the
  mode is on.
- Footer states: `[PLAN]` once a mode is applied, `[~PLAN]` while a
  toggle waits for the next prompt, none in normal mode.
- Added the pure helpers `resolveTransition(desired, applied)` and
  `statusLabel(desired, applied)` with tests, plus explicit load tests
  for both shipped prompt files.
- Recorded ADR-0012; appended a dated correction and cross-reference to
  ADR-0009's incomplete cache claim.
- Updated `spec/docs/architecture.md`, `spec/docs/overview.md`,
  `README.md` (layout tree and plan-mode section), and
  `spec/docs/testing.md` (suite description and manual smoke test).
- `npm run check` passes: 51 tests, and typecheck, lint, and the markdown
  checker report nothing wrong. The local-content checks are clean.
- Refined the pending footer label after live use: it now names the
  desired mode (`[~PLAN]` while enabling, `[~NORMAL]` while lifting)
  instead of always `[~PLAN]`, which read as plan-pending even during a
  lift.
- Refined it once more after live use: normal mode now shows `[NORMAL]`
  instead of no status, so the footer names the desired mode in every
  state and `~` is the only pending marker.
- Colored the labels per state after live use, through the new
  `statusToken()` helper: plan labels keep `mdHeading`, `[NORMAL]` is
  `dim` like the footer's own text, and `[~NORMAL]` uses `text`.

### Spec/ADR amendments

- `[acted]` Added `adr/0012-plan-mode-staged-transitions.md`: the
  desired/applied split, run-boundary application, one message per
  transition, the two-way filter, and the rejected alternatives
  (immediate application, append-only supersession, dedup, steer
  delivery).
- `[acted]` ADR-0009 carries a dated note correcting its cache claim (the
  prefix survives the enable-time append, not the disable-time removal)
  and pointing to ADR-0012.
- `[acted]` `spec/report/2026/09/14/report-1789428553-plan-mode-prompt-file.md`
  marked its shipped-prompt-file coverage item as designed coverage now
  that both files have explicit load tests.

### Future-task notes

- `[open]` The command/shortcut toggle, the `before_agent_start`
  application, and the `context` filter remain wired to pi state and
  untested; only the pure helpers are covered.
- `[open]` Compaction and branch summaries can bake the read-only wording
  into summary messages the `context` filter cannot drop. The fix belongs
  in pi (excluding extension `custom_message` entries from the
  summarization input), not in this extension.
- `[open]` Toggling plan mode on mid-run leaves the running agent with
  the write tools until the next prompt; the owner accepted this.
- `[open]` Restoring the recorded tool list on disable still overwrites
  any active-tool change another extension made during the on period.
- `[open]` Both prompt files are read once at load; an edit needs a pi
  reload.

### Tooling/process

- `[acted]` Verified against pi's runtime source that `setActiveTools`
  called inside `before_agent_start` takes effect for the same run (the
  tool schema and the rebuilt system prompt), which is what makes
  run-boundary staging possible without pi changes.
- `[acted]` The off-notice wording lives in a sibling `.txt` file like
  the on-instruction, so wording changes stay out of TypeScript
  (ADR-0011 pattern).
