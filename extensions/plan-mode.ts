/**
 * Plan mode — a togglable read-only mode.
 *
 * `/plan` toggles plan mode. The toggle records the *desired* mode and
 * updates the footer; it never touches the tool set or the conversation.
 * The change is applied at the next `before_agent_start`, so a run always
 * executes under the mode it started with and a mid-run toggle cannot
 * change tools or instructions for the running agent. A toggle reversed
 * before the next prompt collapses to no transition at all.
 *
 * Applying a transition swaps the active tool set — recording the previous
 * list and removing `edit` and `write` to enable the mode, restoring the
 * recorded list to disable it — and injects exactly one hidden message:
 * the read-only instruction when the mode turns on, a short notice that
 * the mode is off when it turns off. One message per mode change, never
 * one per prompt, so the instruction does not pile up in the session.
 *
 * The `context` hook is keyed on the *applied* mode and drops the message
 * type that contradicts it: while the mode is off, the read-only
 * instruction is filtered out of every request; while it is on, the
 * off-notice is. A mode message therefore never outlives its mode.
 *
 * Both message texts live in sibling files read at load; a missing or
 * blank file fails the extension load rather than injecting nothing.
 *
 * The footer always names the desired mode and marks it `~` until the
 * next prompt applies it: `[PLAN]` and `[~PLAN]` toward plan mode,
 * `[NORMAL]` and `[~NORMAL]` toward normal mode.
 *
 * The toggle is also a keyboard shortcut, configurable through a
 * `planMode.shortcut` setting because extension shortcuts cannot be
 * remapped through `keybindings.json`. The default is `alt+space`.
 *
 * State is in memory only: a restart or session resume starts in normal
 * mode.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONFIG_DIR_NAME,
  type ExtensionAPI,
  type ExtensionContext,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";

/** The key type `pi.registerShortcut()` accepts. */
type ShortcutKey = Parameters<ExtensionAPI["registerShortcut"]>[0];

/** customType identifying this extension's on-instruction message. */
export const PLAN_CONTEXT_TYPE = "plan-mode-context";

/** customType identifying this extension's off-notice message. */
export const PLAN_OFF_TYPE = "plan-mode-off";

/** Shortcut used when no `planMode.shortcut` is configured. */
export const DEFAULT_SHORTCUT = "alt+space";

/** Settings section and key that hold the configured shortcut. */
const CONFIG_KEY = "planMode";
const SHORTCUT_KEY = "shortcut";

/** Tools removed from the active set while plan mode is on. */
const WRITE_TOOLS = ["edit", "write"];

/** File holding the instruction injected when plan mode turns on. */
const PLAN_PROMPT_FILE = fileURLToPath(
  new URL("./plan-mode-prompt.txt", import.meta.url),
);

/** File holding the notice injected when plan mode turns off. */
const PLAN_OFF_PROMPT_FILE = fileURLToPath(
  new URL("./plan-mode-off-prompt.txt", import.meta.url),
);

/** Instruction injected as a hidden message when plan mode turns on. */
const PLAN_INSTRUCTION = loadPlanInstruction(PLAN_PROMPT_FILE);

/** Notice injected as a hidden message when plan mode turns off. */
const PLAN_OFF_INSTRUCTION = loadPlanInstruction(PLAN_OFF_PROMPT_FILE);

/**
 * Read a plan-mode prompt from `path`, trimmed. Throws when the file
 * cannot be read or holds only whitespace: an injection with no text
 * would leave the mode without guidance.
 */
export function loadPlanInstruction(path: string): string {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Plan mode instruction unreadable: ${path} (${reason})`);
  }

  const instruction = raw.replace(/^\uFEFF/, "").trim();
  if (!instruction) {
    throw new Error(`Plan mode instruction is empty: ${path}`);
  }
  return instruction;
}

/** `active` without the write tools, preserving order. */
export function withoutWriteTools(active: string[]): string[] {
  return active.filter((name) => !WRITE_TOOLS.includes(name));
}

/** A mode transition to apply at the next run boundary. */
export type ModeTransition = "enable" | "disable" | "none";

/**
 * The transition implied by the desired and applied modes, plus the
 * applied mode afterwards. A toggle reversed before the next run
 * collapses to `"none"`, so the model is only ever told about the net
 * change.
 */
export function resolveTransition(
  desiredOn: boolean,
  appliedOn: boolean,
): { transition: ModeTransition; appliedOn: boolean } {
  if (desiredOn === appliedOn) {
    return { transition: "none", appliedOn };
  }
  return {
    transition: desiredOn ? "enable" : "disable",
    appliedOn: desiredOn,
  };
}

/**
 * The footer label for the mode. It always names the desired mode and
 * marks it pending with `~` until the next prompt applies it: `[PLAN]`
 * and `[~PLAN]` toward plan mode, `[NORMAL]` and `[~NORMAL]` toward
 * normal mode. A `~` label means the mode still in effect is the other
 * one.
 */
export function statusLabel(desiredOn: boolean, appliedOn: boolean): string {
  const name = desiredOn ? "PLAN" : "NORMAL";
  return desiredOn === appliedOn ? `[${name}]` : `[~${name}]`;
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
  let desiredOn = false;
  let appliedOn = false;
  let toolsBeforePlan: string[] | undefined;
  let shortcutRegistered = false;

  /** The footer markup for the current desired/applied pair. */
  function statusMarkup(ctx: ExtensionContext): string {
    return ctx.ui.theme.fg("mdHeading", statusLabel(desiredOn, appliedOn));
  }

  function refreshStatus(ctx: ExtensionContext): void {
    ctx.ui.setStatus("plan-mode", statusMarkup(ctx));
  }

  /** Record a toggle. The next prompt applies it; nothing else changes. */
  function toggle(ctx: ExtensionContext): void {
    desiredOn = !desiredOn;
    refreshStatus(ctx);
    ctx.ui.notify(
      desiredOn
        ? "Plan mode enabled. Takes effect on your next prompt."
        : "Plan mode disabled. Takes effect on your next prompt.",
      "info",
    );
  }

  pi.on("session_start", (_event, ctx) => {
    // A fresh extension state is normal mode; clear any stale status.
    refreshStatus(ctx);
    if (shortcutRegistered) return;
    shortcutRegistered = true;
    pi.registerShortcut(resolveShortcut(ctx.cwd) as ShortcutKey, {
      description: "Toggle plan mode (read-only)",
      handler: async (shortcutCtx) => toggle(shortcutCtx),
    });
  });

  pi.registerCommand("plan", {
    description: "Toggle plan mode (read-only)",
    handler: async (_args, ctx) => toggle(ctx),
  });

  pi.on("before_agent_start", (_event, ctx) => {
    const { transition, appliedOn: nextAppliedOn } = resolveTransition(
      desiredOn,
      appliedOn,
    );
    if (transition === "none") return;

    appliedOn = nextAppliedOn;
    if (transition === "enable") {
      toolsBeforePlan = pi.getActiveTools();
      pi.setActiveTools(withoutWriteTools(toolsBeforePlan));
    } else if (toolsBeforePlan !== undefined) {
      pi.setActiveTools(toolsBeforePlan);
      toolsBeforePlan = undefined;
    }
    refreshStatus(ctx);

    const enabling = transition === "enable";
    return {
      message: {
        customType: enabling ? PLAN_CONTEXT_TYPE : PLAN_OFF_TYPE,
        content: enabling ? PLAN_INSTRUCTION : PLAN_OFF_INSTRUCTION,
        display: false,
      },
    };
  });

  pi.on("context", (event) => {
    const dropped = appliedOn ? PLAN_OFF_TYPE : PLAN_CONTEXT_TYPE;
    return {
      messages: event.messages.filter(
        (message) => (message as { customType?: string }).customType !== dropped,
      ),
    };
  });
}
