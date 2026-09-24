## Report on task: Verify the live end-to-end path

### Done

- Configured `zaiWebSearch.apiKey` in the global pi settings file
  (`~/.pi/agent/settings.json`), so the key resolves through the source
  documented in `configuration.md` and ADR-0001, rather than through an
  environment variable.
- Preserved the 12 existing top-level settings keys; the file was edited
  with a read, set one nested key, write round trip.
- Set the file mode to `0600`. pi does not restrict the mode of
  `settings.json`, and the file now holds a credential.
- Ran `npm run test:e2e`: both checks pass, no skips.
- Called the tool from a live pi session and received three formatted
  results with links. This is the strongest available check: the
  extension as pi actually loads it, reading the key from the settings
  file.

### Observations

- The live search takes roughly 2.4 seconds for `count: 3`; the
  invalid-key check returns in roughly 0.24 seconds.
- `count: 3` was honoured in both runs: exactly three results, each with a
  link.
- The settings source takes effect with no reload. `resolveZaiKey()` reads
  the file per call, so a session that started before the key existed
  still resolves it. That is a property of reading configuration at call
  time rather than at load time, and it is worth knowing for any other
  extension that reads settings.
- The unit suite is unaffected: `npm test` still runs 14 offline tests.

### Spec/ADR amendments

- `[acted]` Marked the positive-path item `[acted]` in
  `report-1789071803-e2e-check.md`, in this commit, per
  `report_tracking.md`.
- No document changes were needed: `configuration.md` and ADR-0001 already
  describe the settings source that this run exercised.

### Future-task notes

- `[acted]` The credential lived in plaintext in a pi settings file. No
  longer: ADR-0008 puts `file:<path>` in `apiKey`, so the settings file
  holds a reference and the secret stays in a single file. The mode of the
  settings file no longer matters for this credential.
- `[acted]` The live check still spends one search request per run, and
  nothing runs it on a schedule or in automation. Resolved 2026-09-25:
  the extension was deprecated and moved to `deprecated/` (ADR-0016), so
  the check is no longer part of the regular workflow.
- `[acted]` `runZaiWebSearch()` remains untestable offline because its
  endpoint is a module constant; see
  `report-1789071803-e2e-check.md`. Resolved 2026-09-25: the extension
  was deprecated and moved to `deprecated/` (ADR-0016); the coverage gap
  is retired with the module.

### Tooling/process

- `[acted]` A missing key is now distinguishable from a rejected key by
  behavior alone: with no key the live suite skips loudly, and with a
  wrong key it fails. Both were observed in this work.
- `[acted]` Editing pi's settings file while pi is running is safe in this
  case: the extension reads it per call, and pi's own write path merges
  into the file's current contents, so the added section survives.
