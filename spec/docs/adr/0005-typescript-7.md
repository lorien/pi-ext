# ADR-0005: TypeScript 7 for type checking

Date: 2026-09-10
Status: accepted

## Context

`package.json` pinned TypeScript to `^5.6.0`, which resolved to 5.9.3.
TypeScript 7 was released in July 2026: the compiler ported to Go, with
structurally identical type-checking logic, roughly ten times faster
type-checks, and the same emitted JavaScript. The published package still
provides a `tsc` binary, so the existing `tsc --noEmit` invocation does
not change.

The check on this repository takes about a second, so speed alone is not
a reason to move. The reasons to move are that every release train after
this one builds on it, and that staying on a version two majors behind
means the eventual jump is larger and less well tested.

## Decision

Raise the development dependency to `typescript@^7.0.2`, and keep the
check exactly as it is: `tsc --noEmit` in the `typecheck` script.

The existing `tsconfig.json` needed no changes. `strict`,
`verbatimModuleSyntax`, `allowImportingTsExtensions`,
`moduleResolution: Bundler`, and `noEmit` are all supported, and the
suite plus the type check pass unchanged on 7.0.2.

## Alternatives rejected

- Stay on `^5.6.0`. No functional gain, and it defers an upgrade that only
  gets larger. The only argument for it was stability, and the repository
  has a test suite and a type check to detect a regression.
- Move to the `6.0.0-beta` line first, as a stepping stone. TypeScript 6
  is the JavaScript-based bridge release that points at 7; adopting it
  would mean two migrations, and the beta is not a stable target for a
  repository that does not need a transition period.
- Move to the `@typescript/native-preview` package instead. The compiler
  has shipped as `typescript@7`, so the preview package would pin the
  project to a preview channel for no benefit.
- Adopt the editor and language-server improvements without changing the
  checked version. The language server ships with the compiler, so there
  is nothing to adopt separately.

## Consequences

- The type check runs on the native compiler; the measured run on this
  repository is about one second, which is not meaningfully different at
  this size.
- Node 16.20 or newer is required by the package, which is below the
  Node 22.18 that the test suite already requires.
- 5.x-specific behavior is no longer available. Nothing in this
  repository relied on it, and the compatibility risk is accepted with
  the test suite and the type check as the guard.
