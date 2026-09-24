# ADR-0007: End-to-end check against the live API

Date: 2026-09-10
Status: accepted (component deprecated by ADR-0016)

## Context

The unit suite covers `resolveZaiKey()` only. Everything that talks to the
service was unverified: the request body, the engine selection, the timeout
and abort wiring, the response parsing, the error mapping, and the
formatting of real result payloads. The one integration path a user
actually exercises had no test.

The testing rules forbid network calls in the unit suite, for good reasons:
a suite that needs a key, a network, and quota cannot run for a
contributor, an agent, or continuous integration, and a flaky remote
service turns a green build into noise.

## Decision

Add a separate, opt-in end-to-end check: `npm run test:e2e`, running
`e2e/*.e2e.ts`.

- It is excluded from `npm test` and from `npm run check`.
- The live suite skips with a visible reason when no key can be resolved.
  It does not fail, so the command is safe to run anywhere. The gate is
  `resolveZaiKey()` itself, so the sources that enable the tool are the
  same sources that enable the check.
- When a key is available it makes exactly one real search with
  `count: 3`, then asserts that results arrive with links, that the count
  is honoured, and that `formatSearchResults()` renders numbered entries
  with indented links.
- A second check sends an invalid key and asserts the live service rejects
  it. That case needs no configured key, so it runs unconditionally, and
  it proves the harness is really reaching the API rather than
  silently short-circuiting.
- The files live in `e2e/`, not under `test/`. Node treats every file
  under a `test/` directory as a test file, so placing them there would
  make a bare `node --test` fire real requests. This was verified: with
  the files in `e2e/`, a bare `node --test` collects only the unit suite.

## Alternatives rejected

- Put the live calls in the unit suite. It would either fail everywhere a
  key or network is missing, or be skipped everywhere, and it would spend
  quota on every run including continuous integration.
- Mock the HTTP layer with `nock`, `msw`, or a stub server. No real
  network, so it runs everywhere. Rejected for now because the endpoint is
  a module constant, so it cannot be redirected without exporting it and
  threading it through, which is a production change made for testing
  only. It is also the weaker check: it confirms the code matches the
  mock, not that it matches the service. See the notes below.
- Do nothing, leaving the contract unverified. This is the state being
  replaced.
- Make it a continuous-integration-only job. There is no continuous
  integration in this repository, and a secret would have to be stored
  for one search.
- A shell script calling `curl` instead of the Node test runner. It would
  not exercise the extension's own code, which is the point.

## Consequences

- The positive path is manual: it needs a key and cannot run in a fresh
  checkout. It is the one part of the repository verified by hand, and
  `testing.md` says so.
- Each run spends one search request.
- Because the endpoint cannot be redirected, the request body has no
  offline coverage. If that becomes a real gap, the fix is to make the
  endpoint and the transport injectable, and then cover the body with a
  stub, keeping the live check for the contract.
- A skipped live suite is reported as a visible skip with its reason, so
  a green run is not mistaken for a passing live check.
