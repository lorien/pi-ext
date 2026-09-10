# Plan

The open-task list. The record format and selection rules are
authoritative in `spec/skills/task_tracking.md`; the summary is: pick the
highest-priority `new` record, and `Priority: -1` records are deferred and
never auto-picked.

## Add a unit test runner and cover key resolution

Status: new
Priority: 5

`resolveZaiKey()` precedence is verified by hand but has no automated
test. Add a test runner to `package.json`, then cover the cases listed in
`spec/docs/testing.md`: environment over both settings files, project over
global, absent and malformed files, and non-string or whitespace-only
values. Tests must not touch the network and must redirect the agent
directory with `$PI_CODING_AGENT_DIR` to a temporary path.

## Bring README.md onto the documentation conventions

Status: new
Priority: 0

`README.md` predates `spec/docs/conventions.md`: it uses tables and lines
longer than the 88-character cap. Rewrite the resource list and the
tool-parameter list as bulleted lists wrapped at the cap, keeping the
content unchanged.
