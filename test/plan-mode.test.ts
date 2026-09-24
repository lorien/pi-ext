import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import {
  DEFAULT_SHORTCUT,
  loadPlanInstruction,
  missingWriteTools,
  PLAN_GUIDELINE_OFF,
  PLAN_GUIDELINE_ON,
  planModeExtension,
  resolveShortcut,
  resolveTransition,
  statusLabel,
  statusToken,
  withConfiguredWriteTools,
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

describe("resolveTransition", () => {
  test("reports none while the modes agree (off)", () => {
    assert.deepEqual(resolveTransition(false, false), {
      transition: "none",
      appliedOn: false,
    });
  });

  test("reports none while the modes agree (on)", () => {
    assert.deepEqual(resolveTransition(true, true), {
      transition: "none",
      appliedOn: true,
    });
  });

  test("reports enable when the mode is desired but not applied", () => {
    assert.deepEqual(resolveTransition(true, false), {
      transition: "enable",
      appliedOn: true,
    });
  });

  test("reports disable when the mode is applied but no longer desired", () => {
    assert.deepEqual(resolveTransition(false, true), {
      transition: "disable",
      appliedOn: false,
    });
  });

  test("a toggle reversed before a run collapses to no transition", () => {
    // The enable is resolved but not applied; the second toggle lands
    // before any run starts, so the net change is none.
    assert.equal(resolveTransition(true, false).transition, "enable");
    assert.deepEqual(resolveTransition(false, false), {
      transition: "none",
      appliedOn: false,
    });
  });
});

describe("statusLabel", () => {
  test("is [NORMAL] in normal mode with nothing pending", () => {
    assert.equal(statusLabel(false, false), "[NORMAL]");
  });

  test("is [PLAN] once the mode is applied", () => {
    assert.equal(statusLabel(true, true), "[PLAN]");
  });

  test("is [~PLAN] while enabling is pending", () => {
    assert.equal(statusLabel(true, false), "[~PLAN]");
  });

  test("is [~NORMAL] while a lift is pending", () => {
    assert.equal(statusLabel(false, true), "[~NORMAL]");
  });
});

describe("statusToken", () => {
  test("colors [NORMAL] dim, matching the footer's own text", () => {
    assert.equal(statusToken("[NORMAL]"), "dim");
  });

  test("colors [~NORMAL] with the text token", () => {
    assert.equal(statusToken("[~NORMAL]"), "text");
  });

  test("colors the plan labels mdHeading", () => {
    assert.equal(statusToken("[PLAN]"), "mdHeading");
    assert.equal(statusToken("[~PLAN]"), "mdHeading");
  });
});

describe("shipped prompt files", () => {
  const onFile = fileURLToPath(
    new URL("../extensions/plan-mode-prompt.txt", import.meta.url),
  );
  const offFile = fileURLToPath(
    new URL("../extensions/plan-mode-off-prompt.txt", import.meta.url),
  );

  test("the on-instruction file loads with content", () => {
    assert.ok(loadPlanInstruction(onFile).length > 0);
  });

  test("the off-notice file loads with content", () => {
    assert.ok(loadPlanInstruction(offFile).length > 0);
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

/** A pi-like object recording handlers and notifications over a shared tool store. */
function makeMockPi(
  initialActive: string[],
  allTools: string[],
  options?: { refuseRestore?: () => boolean },
) {
  let active = [...initialActive];
  const handlers = new Map<string, (event: unknown, ctx: unknown) => unknown>();
  const commands: { handler: (args: unknown, ctx: unknown) => void }[] = [];
  const notifications: string[] = [];
  const ui = {
    notify: (message: string) => {
      notifications.push(message);
    },
    setStatus: () => {},
    theme: { fg: (_token: string, label: string) => label },
  };
  const ctx = { cwd: project(), ui };
  const api = {
    on: (event: string, handler: (event: unknown, ctx: unknown) => unknown) => {
      handlers.set(event, handler);
    },
    registerCommand: (
      _name: unknown,
      options: { handler: (args: unknown, ctx: unknown) => void },
    ) => {
      commands.push(options);
    },
    registerShortcut: () => {},
    getActiveTools: () => [...active],
    getAllTools: () =>
      allTools.map((name) => ({
        name,
        description: "",
        parameters: {},
        promptGuidelines: [],
      })),
    setActiveTools: (names: string[]) => {
      if (!options?.refuseRestore?.()) active = [...names];
    },
    ui,
  };
  const guidelines: string[] = [];
  return {
    api: api as unknown as ExtensionAPI,
    ctx,
    notifications,
    commands,
    activeTools: () => [...active],
    guidelines,
    fire: (event: string) =>
      handlers.get(event)?.({}, ctx) as
        | { message?: { customType?: string; content?: string } }
        | undefined,
    fireStart: () =>
      handlers.get("before_agent_start")?.(
        {
          type: "before_agent_start",
          prompt: "",
          systemPromptOptions: { promptGuidelines: guidelines },
        },
        ctx,
      ) as { message?: { customType?: string; content?: string } } | undefined,
    toggle: () => commands[0]?.handler({}, ctx),
  };
}

describe("missingWriteTools", () => {
  test("reports configured write tools absent from the active set", () => {
    assert.deepEqual(
      missingWriteTools(["read", "bash"], ["read", "bash", "edit", "write"]),
      ["edit", "write"],
    );
  });

  test("is empty when every configured write tool is active", () => {
    assert.deepEqual(
      missingWriteTools(
        ["read", "bash", "edit", "write"],
        ["read", "bash", "edit", "write"],
      ),
      [],
    );
  });

  test("ignores write tools that are not configured", () => {
    assert.deepEqual(missingWriteTools(["read", "bash"], ["read", "bash"]), []);
  });
});

describe("withConfiguredWriteTools", () => {
  test("unions a stale checkpoint with the configured write tools", () => {
    assert.deepEqual(
      withConfiguredWriteTools(["read", "bash"], ["read", "bash", "edit", "write"]),
      ["read", "bash", "edit", "write"],
    );
  });

  test("does not duplicate names and adds nothing unconfigured", () => {
    assert.deepEqual(
      withConfiguredWriteTools(["read", "edit", "write"], ["read", "edit", "write"]),
      ["read", "edit", "write"],
    );
  });
});

describe("resume healing (ADR-0013)", () => {
  test("a resume heals write tools lost to a stale transcript delta", async () => {
    const all = ["read", "bash", "edit", "write"];
    const first = makeMockPi(all, all);
    planModeExtension(first.api);
    await first.fire("session_start");
    assert.deepEqual(first.notifications, []);

    // plan mode on: write tools removed from the active set
    first.toggle();
    const enabled = await first.fireStart();
    assert.equal(enabled?.message?.customType, "plan-mode-context");
    assert.deepEqual(first.activeTools(), ["read", "bash"]);

    // simulate a resume: fresh extension state, gutted tool set replayed
    const resumed = makeMockPi(first.activeTools(), all);
    planModeExtension(resumed.api);
    await resumed.fire("session_start");
    assert.deepEqual(resumed.activeTools(), all);
    assert.equal(resumed.notifications.length, 1);
    assert.match(resumed.notifications[0] ?? "", /restored write tool/);
  });

  test("enable after healing checkpoints the healthy set; disable restores it", async () => {
    const all = ["read", "bash", "edit", "write"];
    const pi = makeMockPi(all, all);
    planModeExtension(pi.api);
    await pi.fire("session_start");

    pi.toggle();
    await pi.fireStart();
    assert.deepEqual(pi.activeTools(), ["read", "bash"]);

    pi.toggle(); // plan mode off
    const disabled = await pi.fireStart();
    assert.equal(disabled?.message?.customType, "plan-mode-off");
    assert.deepEqual(pi.activeTools(), all);
    assert.equal(disabled?.message?.content?.includes("Warning"), false);
  });

  test("the off-notice reports when a write tool could not be restored", async () => {
    const all = ["read", "bash", "edit", "write"];
    let refused = false;
    const pi = makeMockPi(all, all, { refuseRestore: () => refused });
    planModeExtension(pi.api);
    await pi.fire("session_start");
    pi.toggle();
    await pi.fireStart(); // enable applies: write tools removed
    refused = true; // the disable restore now fails (e.g. a broken tool store)
    pi.toggle();
    const disabled = await pi.fireStart();
    assert.match(String(disabled?.message?.content ?? ""), /Warning: edit, write/);
  });
});

describe("standing guideline (ADR-0014)", () => {
  test("no guideline before plan mode is ever applied", async () => {
    const all = ["read", "bash", "edit", "write"];
    const pi = makeMockPi(all, all);
    planModeExtension(pi.api);
    await pi.fire("session_start");
    await pi.fireStart();
    assert.equal(pi.guidelines.length, 0);
  });

  test("the ON guideline rides every prompt while applied, then OFF after the lift", async () => {
    const all = ["read", "bash", "edit", "write"];
    const pi = makeMockPi(all, all);
    planModeExtension(pi.api);
    await pi.fire("session_start");

    pi.toggle();
    await pi.fireStart();
    assert.deepEqual(pi.guidelines, [PLAN_GUIDELINE_ON]);
    assert.match(PLAN_GUIDELINE_ON, /var\//);

    // subsequent prompts keep exactly one guideline (no stacking)
    await pi.fireStart();
    await pi.fireStart();
    assert.deepEqual(pi.guidelines, [PLAN_GUIDELINE_ON]);

    pi.toggle();
    const disabled = await pi.fireStart();
    assert.equal(disabled?.message?.customType, "plan-mode-off");
    assert.deepEqual(pi.guidelines, [PLAN_GUIDELINE_OFF]);
    assert.match(PLAN_GUIDELINE_OFF, /may create, edit, and delete files again/);

    // further prompts keep the OFF guideline until the mode is used again
    await pi.fireStart();
    assert.deepEqual(pi.guidelines, [PLAN_GUIDELINE_OFF]);

    pi.toggle();
    await pi.fireStart();
    assert.deepEqual(pi.guidelines, [PLAN_GUIDELINE_ON]);
  });

  test("a fresh session (resume) that never applied the mode carries no guideline", async () => {
    const all = ["read", "bash", "edit", "write"];
    const resumed = makeMockPi(all, all);
    planModeExtension(resumed.api);
    await resumed.fire("session_start");
    await resumed.fireStart();
    assert.equal(resumed.guidelines.length, 0);
  });

  test("the guideline loader rejects an empty guideline file", () => {
    const dir = tempDir("pi-ext-empty-guideline-");
    const empty = join(dir, "empty.txt");
    writeFileSync(empty, "   \n");
    assert.throws(() => loadPlanInstruction(empty), /is empty/);
  });
});
