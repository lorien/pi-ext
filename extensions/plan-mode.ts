/**
 * Plan mode — a togglable read-only mode.
 *
 * `/plan` toggles plan mode. While it is on:
 *   - the `edit` and `write` tools are removed from the active tool set,
 *   - a hidden instruction is injected into the conversation before each
 *     turn,
 *   - the footer shows a `[PLAN]` status.
 *
 * The instruction is injected as a conversation message, not as a
 * system-prompt change, so it sits at the point in history where plan mode
 * began instead of floating above the turns it is meant to constrain. While
 * plan mode is off, the `context` hook drops that message again so a stale
 * instruction cannot steer later turns.
 *
 * The toggle is also a keyboard shortcut, configurable through a
 * `planMode.shortcut` setting because extension shortcuts cannot be remapped
 * through `keybindings.json`. The default is `alt+space`.
 *
 * State is in memory only: a restart or session resume starts in normal mode.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONFIG_DIR_NAME,
  type ExtensionAPI,
  type ExtensionContext,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";

/** The key type `pi.registerShortcut()` accepts. */
type ShortcutKey = Parameters<ExtensionAPI["registerShortcut"]>[0];

/** customType identifying this extension's injected context message. */
export const PLAN_CONTEXT_TYPE = "plan-mode-context";

/** Shortcut used when no `planMode.shortcut` is configured. */
export const DEFAULT_SHORTCUT = "alt+space";

/** Settings section and key that hold the configured shortcut. */
const CONFIG_KEY = "planMode";
const SHORTCUT_KEY = "shortcut";

/** Tools removed from the active set while plan mode is on. */
const WRITE_TOOLS = ["edit", "write"];

/** Instruction injected as a hidden message while plan mode is on. */
const PLAN_INSTRUCTION = [
  "You are in plan mode, a read-only mode for exploring and analysis.",
  "Do not modify any file in the project; the edit and write tools are",
  "disabled. This restriction applies to all following turns; changes made",
  "earlier in the conversation are already done. Read and search the code as",
  "needed, then answer the user's request.",
  "Match the scope of the request. If it asks for an explanation, analysis,",
  "a list, or a comparison, give only that and stop. Do not append a change",
  "proposal, implementation plan, task record, or design decision unless the",
  "user asked for changes or for a plan. If you believe a change is warranted",
  "but none was requested, say so in one sentence and ask whether the user",
  "wants a proposal. If something is unclear, ask the user clarifying",
  "questions before proposing.",
].join(" ");

/** `active` without the write tools, preserving order. */
export function withoutWriteTools(active: string[]): string[] {
  return active.filter((name) => !WRITE_TOOLS.includes(name));
}

/** The `planMode.shortcut` value in one settings file, or undefined. */
function readShortcutFromSettings(path: string): string | undefined {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return undefined;
  }

  if (typeof parsed !== "object" || parsed === null) return undefined;
  const section = (parsed as Record<string, unknown>)[CONFIG_KEY];
  if (typeof section !== "object" || section === null) return undefined;

  const value = (section as Record<string, unknown>)[SHORTCUT_KEY];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Resolve the plan-mode shortcut. Precedence: project `.pi/settings.json` >
 * `<agent-dir>/settings.json` > `alt+space`. An absent, unreadable, or
 * unusable setting falls back to the default rather than failing.
 */
export function resolveShortcut(cwd: string): string {
  const projectSettings = join(cwd, CONFIG_DIR_NAME, "settings.json");
  const fromProject = readShortcutFromSettings(projectSettings);
  if (fromProject) return fromProject;

  const globalSettings = join(getAgentDir(), "settings.json");
  return readShortcutFromSettings(globalSettings) ?? DEFAULT_SHORTCUT;
}

export default function planModeExtension(pi: ExtensionAPI): void {
  let enabled = false;
  let toolsBeforePlan: string[] | undefined;
  let shortcutRegistered = false;

  function setEnabled(next: boolean, ctx: ExtensionContext): void {
    if (next === enabled) return;
    enabled = next;

    if (enabled) {
      toolsBeforePlan = pi.getActiveTools();
      pi.setActiveTools(withoutWriteTools(toolsBeforePlan));
    } else if (toolsBeforePlan !== undefined) {
      pi.setActiveTools(toolsBeforePlan);
      toolsBeforePlan = undefined;
    }

    ctx.ui.setStatus(
      "plan-mode",
      enabled ? ctx.ui.theme.fg("warning", "[PLAN]") : undefined,
    );
    ctx.ui.notify(enabled ? "Plan mode enabled." : "Plan mode disabled.", "info");
  }

  pi.on("session_start", (_event, ctx) => {
    if (shortcutRegistered) return;
    shortcutRegistered = true;
    pi.registerShortcut(resolveShortcut(ctx.cwd) as ShortcutKey, {
      description: "Toggle plan mode (read-only)",
      handler: async (shortcutCtx) => setEnabled(!enabled, shortcutCtx),
    });
  });

  pi.registerCommand("plan", {
    description: "Toggle plan mode (read-only)",
    handler: async (_args, ctx) => setEnabled(!enabled, ctx),
  });

  pi.on("before_agent_start", () => {
    if (!enabled) return;
    return {
      message: {
        customType: PLAN_CONTEXT_TYPE,
        content: PLAN_INSTRUCTION,
        display: false,
      },
    };
  });

  pi.on("context", (event) => {
    if (enabled) return;
    return {
      messages: event.messages.filter(
        (message) =>
          (message as { customType?: string }).customType !== PLAN_CONTEXT_TYPE,
      ),
    };
  });
}
