import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  formatSearchResults,
  resolveZaiKey,
  runZaiWebSearch,
} from "./zai-web-search.ts";

/**
 * Live end-to-end check for the deprecated `zai_web_search` extension. It calls
 * the z.ai API and spends quota, so it is not part of `npm test`; run it with
 * `npm run test:e2e`.
 *
 * The file lives in `deprecated/` (the extension it exercises moved here), not
 * under `test/`. Node treats every file under a `test/` directory as a test
 * file, so a bare `node --test` would run this one and make real requests.
 */

const REQUEST_TIMEOUT_MS = 60_000;

/** Reason to skip the live checks, or false when a key is configured. */
function missingKeyReason(): string | false {
  try {
    resolveZaiKey(process.cwd());
    return false;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return `no usable z.ai API key: ${reason}`;
  }
}

describe("live z.ai web search", { skip: missingKeyReason() }, () => {
  test("returns results for a query and formats them", {
    timeout: REQUEST_TIMEOUT_MS,
  }, async () => {
    const key = resolveZaiKey(process.cwd());
    const response = await runZaiWebSearch({ query: "pi coding agent", count: 3 }, key);

    const results = response.search_result ?? [];
    assert.ok(results.length > 0, "expected at least one result");
    assert.ok(
      results.length <= 3,
      `expected at most 3 results for count=3, got ${results.length}`,
    );
    for (const [index, result] of results.entries()) {
      assert.equal(typeof result.link, "string", `result ${index + 1} has no link`);
      assert.match(result.link ?? "", /^https?:\/\//);
    }

    const text = formatSearchResults(response);
    assert.match(text, /^\[1\] /, "formatted output starts with the first entry");
    assert.match(text, /\n {4}https?:\/\//, "entries carry an indented link");
  });
});

describe("live z.ai web search error handling", () => {
  test("rejects an invalid key", { timeout: REQUEST_TIMEOUT_MS }, async () => {
    await assert.rejects(
      () => runZaiWebSearch({ query: "test" }, "invalid-key-for-e2e"),
      (error: unknown) => {
        assert.ok(error instanceof Error, "expected an Error");
        assert.match(
          error.message,
          /z\.ai web_search failed|returned non-JSON/,
          `unexpected message: ${error.message}`,
        );
        return true;
      },
    );
  });
});
