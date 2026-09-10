# ADR-0003: Test runner

Date: 2026-09-10
Status: accepted

## Context

`resolveZaiKey()` has branching behavior — two settings files, an
environment variable, and several fall-through cases — that was verified
only by hand. The package needs an automated test suite before that
behavior can be changed safely.

The package has no runtime dependencies; pi supplies its peer
dependencies. Whatever runner is chosen becomes the first real
development dependency, and it has to run TypeScript sources that pi loads
without a build step.

## Decision

Use the test runner built into Node: `node:test` for structure and
`node:assert/strict` for assertions, run through an `npm test` script.
Tests are TypeScript files under `test/`, executed directly by Node's
native type stripping.

Consequences:

- No new dependency. The development dependencies stay `typescript` and
  `@types/node`, and the tests use the same runtime that executes the
  extension.
- Tests live outside `extensions/`, because the `pi` manifest declares
  that directory as an extension directory and a `*.test.ts` file inside
  it could be loaded as an extension.
- Type stripping means the sources are executed as written: no transform,
  no bundler, and no configuration file for the runner.
- Type-stripping syntax limits apply. The tests must avoid TypeScript
  features that require transformation, such as enums and parameter
  properties.
- Node 22.18 or newer is required, because flagless type stripping is not
  available before it.

The decision is recorded here rather than inferred from the scripts,
because the alternatives were real and the reason for rejecting them is
not obvious from the result.

## Alternatives rejected

- `vitest`. It handles TypeScript and is pleasant to use, but it brings a
  large dependency tree for a suite whose subject is a single pure
  function. It would also be the only dependency of a package that
  otherwise has none.
- `jest` with a TypeScript transform. It needs a transform configuration
  and several packages, and its module resolution differs from the Node
  runtime that actually executes the extension.
- `mocha` with `ts-node` or `tsx`. Two dependencies to gain what the
  runtime already provides, plus a loader configured in a way that can
  drift from how pi loads the same file.
- No test runner, with hand verification. That is the state being
  replaced: the checks are not repeatable and cannot be run by a
  contributor or by an agent before a commit.
