import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import { resolveZaiKey } from "../extensions/zai-web-search.ts";

const ENV_KEY = "ZAI_API_KEY";
const ENV_AGENT_DIR = "PI_CODING_AGENT_DIR";

const originalKey = process.env[ENV_KEY];
const originalAgentDir = process.env[ENV_AGENT_DIR];

let tempDirs: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function keySettings(key: string): string {
  return JSON.stringify({ zaiWebSearch: { apiKey: key } });
}

/** A project directory. Writes `.pi/settings.json` when given content. */
function project(settings?: string): string {
  const dir = tempDir("pi-ext-project-");
  if (settings !== undefined) {
    mkdirSync(join(dir, ".pi"), { recursive: true });
    writeFileSync(join(dir, ".pi", "settings.json"), settings);
  }
  return dir;
}

/** An agent directory, installed as `$PI_CODING_AGENT_DIR`. */
function agentDir(settings?: string): string {
  const dir = tempDir("pi-ext-agent-");
  if (settings !== undefined) {
    writeFileSync(join(dir, "settings.json"), settings);
  }
  process.env[ENV_AGENT_DIR] = dir;
  return dir;
}

function projectSettingsPath(dir: string): string {
  return join(dir, ".pi", "settings.json");
}

beforeEach(() => {
  delete process.env[ENV_KEY];
});

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
  if (originalKey === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = originalKey;
  if (originalAgentDir === undefined) delete process.env[ENV_AGENT_DIR];
  else process.env[ENV_AGENT_DIR] = originalAgentDir;
});

describe("resolveZaiKey", () => {
  test("returns the key from the environment", () => {
    agentDir(keySettings("global-key"));
    const dir = project(keySettings("project-key"));
    process.env[ENV_KEY] = "env-key";
    assert.equal(resolveZaiKey(dir), "env-key");
  });

  test("trims the key", () => {
    process.env[ENV_KEY] = "  padded  ";
    assert.equal(resolveZaiKey(), "padded");
  });

  test("prefers project settings over global settings", () => {
    agentDir(keySettings("global-key"));
    assert.equal(resolveZaiKey(project(keySettings("project-key"))), "project-key");
  });

  test("reads the global settings file when the project has none", () => {
    agentDir(keySettings("global-key"));
    assert.equal(resolveZaiKey(project()), "global-key");
  });

  test("reads the global settings file when no cwd is given", () => {
    agentDir(keySettings("global-key"));
    assert.equal(resolveZaiKey(), "global-key");
  });

  test("reads the key from a file that holds other settings", () => {
    agentDir(JSON.stringify({ defaultModel: "m", zaiWebSearch: { apiKey: "k" } }));
    assert.equal(resolveZaiKey(), "k");
  });

  test("accepts a settings file with a byte-order mark", () => {
    agentDir(`\uFEFF${keySettings("bom-key")}`);
    assert.equal(resolveZaiKey(), "bom-key");
  });

  test("falls through a file with no zaiWebSearch section", () => {
    agentDir(keySettings("global-key"));
    const dir = project(JSON.stringify({ defaultModel: "m" }));
    assert.equal(resolveZaiKey(dir), "global-key");
  });

  test("falls through a non-string apiKey", () => {
    agentDir(keySettings("global-key"));
    const dir = project(JSON.stringify({ zaiWebSearch: { apiKey: 123 } }));
    assert.equal(resolveZaiKey(dir), "global-key");
  });

  test("falls through a whitespace-only apiKey", () => {
    agentDir(keySettings("global-key"));
    assert.equal(resolveZaiKey(project(keySettings("   "))), "global-key");
  });

  test("falls through a zaiWebSearch section that is not an object", () => {
    agentDir(keySettings("global-key"));
    const dir = project(JSON.stringify({ zaiWebSearch: "oops" }));
    assert.equal(resolveZaiKey(dir), "global-key");
  });

  test("ignores a whitespace-only environment variable", () => {
    agentDir(keySettings("global-key"));
    process.env[ENV_KEY] = "   ";
    assert.equal(resolveZaiKey(), "global-key");
  });

  test("throws naming every source when no key is configured", () => {
    const agent = agentDir();
    const dir = project();
    assert.throws(
      () => resolveZaiKey(dir),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /\$ZAI_API_KEY/);
        assert.ok(error.message.includes(projectSettingsPath(dir)));
        assert.ok(error.message.includes(join(agent, "settings.json")));
        return true;
      },
    );
  });

  test("throws naming the file when a settings file is malformed", () => {
    agentDir(keySettings("global-key"));
    const dir = project("{ not json");
    assert.throws(
      () => resolveZaiKey(dir),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(projectSettingsPath(dir)));
        return true;
      },
    );
  });
});
