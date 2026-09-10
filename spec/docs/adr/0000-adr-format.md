# ADR-0000: Decision record format

Date: 2026-09-10
Status: accepted

## Context

Design decisions with real alternatives need a durable record: what was
decided, why, and what was rejected. Without one, later work re-opens
settled questions or reverses a decision by accident. The repository needs
a single canonical format so records stay comparable and reviewable.

This document is both the format definition and its own example.

## Decision

A record is one markdown file in `spec/docs/adr/`, named
`NNNN-short-title.md`, numbered sequentially from `0001`. `0000` is
reserved for this format document.

Each record contains, in order:

- A `# ADR-NNNN: Title` heading.
- A `Date: YYYY-MM-DD` line.
- A `Status:` line. New records use `accepted`.
- A `## Context` section: the forces at play, and why a decision was
  needed.
- A `## Decision` section: what was decided, in the present tense.
- A `## Alternatives rejected` section: each alternative and the reason it
  was not chosen.

Records are short. The current design lives in the topical documents under
`spec/docs/`, which carry the current truth; a record captures the moment
of decision and its reasoning. Records follow the markdown conventions in
`spec/docs/conventions.md`.

Records are never deleted and never renumbered. A superseded record keeps
its number and notes the successor on its `Status:` line, for example
`accepted (superseded by ADR-0003)`. A record revised in place notes the
revision date on the same line.

## Alternatives rejected

- Chronological changelog entries. They record what changed, not why, and
  they do not preserve the alternatives that were considered.
- A single growing decisions file. Concurrent edits conflict, individual
  decisions become hard to reference, and supersession cannot be expressed
  per decision.
- Free-form notes in the topical documents. The reasoning is lost as soon
  as the topical document is updated to the new design.
