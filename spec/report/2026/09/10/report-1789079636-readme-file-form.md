## Report on task: Document the `file:` key form in README, fix the doc audiences

### Done

- Documented the `file:` form of `zaiWebSearch.apiKey` in `README.md`:
  both JSON examples, why the form exists, the leading-only prefix rule,
  pi's settings-path rules, the per-call read with trimming, the loud
  failure without fall-through, and that `$ZAI_API_KEY` takes no `file:`
  form. The README does not point at `spec/` for details, per the
  audience decision below.
- Recorded the documentation audiences in `spec/`:
  `spec/docs/conventions.md` now states that `README.md` is the only
  end-user documentation and that everything under `spec/` is internal;
  `spec/docs/overview.md` marks the `spec/docs/` entries internal and
  rewrites the `README.md` layout bullet to match.
- Marked the README-sync `[open]` item in
  `report-1789070513-readme-conventions.md` `[acted]`: resolved by owner
  decision the other way — end-user behavior is restated in `README.md`
  rather than deferred to `spec/docs/`.

### Spec/ADR amendments

- `[acted]` `conventions.md` gained the audience rule. No ADR: this is a
  documentation-scope clarification directed by the owner, not an
  architecture decision with alternatives worth a record.

### Future-task notes

- `[open]` `spec/docs/configuration.md:38` and `adr/0008` prose use
  `~/.keys/zai.key` as the example path. That is a private dot-directory,
  which `conventions.md` forbids committing; the README example uses the
  `file:<path>` placeholder instead. Normalizing the spec examples to the
  same placeholder would remove the ambiguity.

### Tooling/process

- The owner ruling came from a presented plan with a decision point; the
  terse complaint ("README does not explain file: nuance") hid a real
  fork: restate in README vs. defer to spec. Presenting both with the
  cost of each got the ruling in one round trip.
