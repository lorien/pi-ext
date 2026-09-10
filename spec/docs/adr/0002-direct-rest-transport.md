# ADR-0002: Direct REST transport

Date: 2026-09-10
Status: accepted

## Context

z.ai exposes web search both as an MCP server and as a REST endpoint. The
extension needs to call search repeatedly during a session, with a small
number of typed parameters, and return results as text for the model.

The MCP route requires a client, a server process or connection, a session
handshake, and a tool-discovery step, all of which must be kept alive
across calls. pi already has an MCP gateway, so the alternative is
reachable; the question is whether the indirection earns its keep.

## Decision

Call the z.ai REST web search endpoint directly over HTTPS, using the
`search-prime` engine by default, from a single TypeScript module with no
runtime dependency beyond the platform `fetch`.

Consequences:

- No MCP handshake or session layer, and no server process to supervise.
- The request and response shapes are an external contract held in the
  extension itself; there is no intermediate schema to keep in sync.
- Engine selection is a per-call parameter.
- A tool call is one HTTP request with a fixed timeout, combined with the
  caller's abort signal, so cancellation is predictable.

## Alternatives rejected

- The z.ai MCP server through pi's gateway. It adds a process and a
  session for a single stateless request, and the tool parameters and
  result shape would still have to be mapped to the tool's schema.
- A vendor SDK or a generic HTTP client dependency. The request is one
  `POST` with a bearer token and a JSON body; `fetch` already covers it,
  and the package stays dependency-free at runtime by keeping pi and
  typebox as peer dependencies.
- Shelling out to a CLI. It would add an installation prerequisite, a
  subprocess per call, and a text-parsing step in place of structured
  data.
