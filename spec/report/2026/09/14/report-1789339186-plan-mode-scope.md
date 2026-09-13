## Report on task: Scope the plan-mode instruction to the request

### Done

- Rewrote `PLAN_INSTRUCTION` in `extensions/plan-mode.ts`. It no longer
  tells the model to "propose the changes you would make to fulfill it"
  unconditionally. It now matches the scope of the request: an
  explanation, analysis, list, or comparison is answered as asked, and a
  change proposal, implementation plan, task record, or design decision
  is appended only when the user asked for changes or for a plan.
- When a change seems warranted but was not requested, the instruction
  asks the model to say so in one sentence and ask whether a proposal is
  wanted, instead of producing one.
- Updated the plan-mode bullet in `README.md` to describe the
  conditional behavior.
- Verified `npm run check`: 36 tests pass, and typecheck, lint, and the
  markdown checker report nothing wrong.
- Landed the previously uncommitted plan-mode extension work as its own
  commit before this fix, so the history separates the feature from the
  correction.
- Corrected the source file-header comment: the instruction is injected
  before each agent run (once per user prompt), not before each turn.
  This matches pi's definition of a turn as one LLM response plus its
  tool calls, so a single run can contain many turns that are not
  re-injected.

### Spec/ADR amendments

- `[acted]` No new ADR. The unconditional "propose the changes" wording
  was a defect in the instruction, not an accepted decision, and
  `conventions.md` says a known defect must not be recorded as a design
  decision. ADR-0009 records the injection mechanism, which is unchanged.
- `[open]` `spec/docs/architecture.md` and `spec/docs/testing.md`
  describe plan mode but do not quote the instruction, so they stayed
  accurate. If the instruction's contract grows (for example, named
  request types), record that in `architecture.md`.

### Future-task notes

- `[open]` The request-type distinction lives only in prose. The
  instruction is a module constant that is not exported, and a unit test
  would assert exact wording, which is brittle. The behavior is therefore
  verified by reading and by use, not by the suite. An analysis/plan
  sub-mode would give it a testable seam.
- `[open]` The wording constrains the model but cannot guarantee it. The
  read-only tool set is the hard enforcement; the instruction is guidance
  and can still be ignored.

### Tooling/process

- `[acted]` Editing an extension does not affect a running pi session: the
  module is loaded at startup. This fix was verified against the source
  and the offline checks, not by reloading plan mode in the session that
  made it. Use `/reload` or a fresh process to observe it live.
- `[acted]` The working tree held a completed but uncommitted task (the
  plan-mode extension) with its report already written. Since the fix
  touched a file that task introduced, this session reverted the two
  edited files, committed the prior work on its own, then re-applied the
  fix. Both the revert and the re-apply were confirmed by `grep` before
  moving on, so the split could not silently drop either change.
