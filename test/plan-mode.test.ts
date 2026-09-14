import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
  DEFAULT_SHORTCUT,
  loadPlanInstruction,
  resolveShortcut,
  withoutWriteTools,
} from "../extensions/plan-mode.ts";

const ENV_AGENT_DIR = "PI_CODING_AGENT_DIR";
const originalAgentDir = process.env[ENV_AGENT_DIR];

let tempDirs: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
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

function shortcutSettings(shortcut: unknown): string {
  return JSON.stringify({ planMode: { shortcut } });
}

beforeEach(() => {
  agentDir();
});

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
  if (originalAgentDir === undefined) delete process.env[ENV_AGENT_DIR];
  else process.env[ENV_AGENT_DIR] = originalAgentDir;
});

describe("withoutWriteTools", () => {
  test("removes edit and write while preserving the other tools' order", () => {
    assert.deepEqual(withoutWriteTools(["read", "bash", "edit", "grep", "write"]), [
      "read",
      "bash",
      "grep",
    ]);
  });

  test("is a no-op when neither write tool is active", () => {
    assert.deepEqual(withoutWriteTools(["read", "bash"]), ["read", "bash"]);
  });

  test("matches exact names only", () => {
    assert.deepEqual(withoutWriteTools(["read", "editor", "overwrite"]), [
      "read",
      "editor",
      "overwrite",
    ]);
  });

  test("returns an empty list unchanged", () => {
    assert.deepEqual(withoutWriteTools([]), []);
  });
});

describe("loadPlanInstruction", () => {
  function promptFile(content: string): string {
    const path = join(tempDir("pi-ext-prompt-"), "plan-mode-prompt.txt");
    writeFileSync(path, content);
    return path;
  }

  test("returns the file content with surrounding whitespace trimmed", () => {
    const path = promptFile("\n  be careful  \n");
    assert.equal(loadPlanInstruction(path), "be careful");
  });

  test("strips a byte-order mark", () => {
    assert.equal(loadPlanInstruction(promptFile("\uFEFFbe careful")), "be careful");
  });

  test("throws naming the path when the file is missing", () => {
    const path = join(tempDir("pi-ext-missing-"), "plan-mode-prompt.txt");
    assert.throws(
      () => loadPlanInstruction(path),
      (error: unknown) => {
        return error instanceof Error && error.message.includes(path);
      },
    );
  });

  test("throws naming the path when the file is blank", () => {
    const path = promptFile("   \n\t\n");
    assert.throws(
      () => loadPlanInstruction(path),
      (error: unknown) => {
        return error instanceof Error && error.message.includes(path);
      },
    );
  });
});

describe("resolveShortcut", () => {
  test("defaults to alt+space when nothing is configured", () => {
    assert.equal(resolveShortcut(project()), DEFAULT_SHORTCUT);
    assert.equal(DEFAULT_SHORTCUT, "alt+space");
  });

  test("uses the project setting", () => {
    const cwd = project(shortcutSettings("ctrl+shift+m"));
    assert.equal(resolveShortcut(cwd), "ctrl+shift+m");
  });

  test("project setting wins over the global setting", () => {
    agentDir(shortcutSettings("ctrl+shift+g"));
    const cwd = project(shortcutSettings("ctrl+shift+p"));
    assert.equal(resolveShortcut(cwd), "ctrl+shift+p");
  });

  test("falls back to the global setting", () => {
    agentDir(shortcutSettings("ctrl+shift+g"));
    assert.equal(resolveShortcut(project()), "ctrl+shift+g");
  });

  test("trims the configured value", () => {
    const cwd = project(shortcutSettings("  alt+m  "));
    assert.equal(resolveShortcut(cwd), "alt+m");
  });

  test("falls through a non-string shortcut", () => {
    const cwd = project(shortcutSettings(42));
    assert.equal(resolveShortcut(cwd), DEFAULT_SHORTCUT);
  });

  test("falls through a whitespace-only shortcut", () => {
    const cwd = project(shortcutSettings("   "));
    assert.equal(resolveShortcut(cwd), DEFAULT_SHORTCUT);
  });

  test("falls through a settings file with no planMode section", () => {
    const cwd = project(JSON.stringify({ theme: "dark" }));
    assert.equal(resolveShortcut(cwd), DEFAULT_SHORTCUT);
  });

  test("reads planMode alongside other settings", () => {
    const cwd = project(
      JSON.stringify({ theme: "dark", planMode: { shortcut: "alt+m" } }),
    );
    assert.equal(resolveShortcut(cwd), "alt+m");
  });

  test("defaults when the settings file cannot be parsed", () => {
    const cwd = project("{ not json");
    assert.equal(resolveShortcut(cwd), DEFAULT_SHORTCUT);
  });

  test("defaults when the planMode section is not an object", () => {
    const cwd = project(JSON.stringify({ planMode: "alt+m" }));
    assert.equal(resolveShortcut(cwd), DEFAULT_SHORTCUT);
  });
});
