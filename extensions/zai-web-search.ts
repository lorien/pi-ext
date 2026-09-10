/**
 * z.ai Web Search — direct REST tool for pi (no MCP).
 *
 * Calls https://api.z.ai/api/paas/v4/web_search with the `search-prime`
 * engine — the same engine behind the z.ai web_search MCP server, but without
 * the MCP handshake/session layer.
 *
 * Key resolution order:
 *   1. $ZAI_API_KEY
 *   2. <cwd>/.pi/settings.json       -> { "zaiWebSearch": { "apiKey": "..." } }
 *   3. <agent-dir>/settings.json     -> same shape
 *
 * "zaiWebSearch" is this extension's own settings key; pi parses settings.json
 * without schema validation and preserves unknown keys on write, so a custom
 * section survives normal pi usage. The agent dir is resolved with pi's own
 * getAgentDir(), so $PI_CODING_AGENT_DIR is honored.
 */
import { CONFIG_DIR_NAME, getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ENDPOINT = "https://api.z.ai/api/paas/v4/web_search";
const REQUEST_TIMEOUT_MS = 30_000;
const TOOL_NAME = "zai_web_search";
const CONFIG_KEY = "zaiWebSearch";

const RECENCY = ["oneDay", "oneWeek", "oneMonth", "oneYear", "noLimit"] as const;
const ENGINES = ["search-prime", "search_pro_jina", "search_pro", "search_std"] as const;

type SearchResult = {
  title?: string;
  link?: string;
  content?: string;
  publish_date?: string;
  refer?: string;
  media?: string;
  icon?: string;
};

type SearchResponse = {
  search_result?: SearchResult[];
  search_intent?: Array<{ intent?: string; keywords?: string; query?: string }>;
  error?: { code?: string | number; message?: string };
};

export type ZaiWebSearchParams = {
  query: string;
  count?: number;
  recency?: (typeof RECENCY)[number];
  domain?: string;
  engine?: (typeof ENGINES)[number];
};

/**
 * Read `zaiWebSearch.apiKey` from a pi settings file.
 * Returns undefined when the file is absent or has no key configured; throws
 * only when the file exists but cannot be parsed, since that is a real error.
 */
function readKeyFromSettingsFile(path: string): string | undefined {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${path}: ${reason}`);
  }

  if (typeof parsed !== "object" || parsed === null) return undefined;
  const section = (parsed as Record<string, unknown>)[CONFIG_KEY];
  if (typeof section !== "object" || section === null) return undefined;
  const apiKey = (section as Record<string, unknown>).apiKey;
  return typeof apiKey === "string" && apiKey.trim() ? apiKey.trim() : undefined;
}

/**
 * Resolve the z.ai API key. Precedence:
 * $ZAI_API_KEY > project .pi/settings.json > <agent-dir>/settings.json.
 */
export function resolveZaiKey(cwd?: string): string {
  const fromEnv = process.env.ZAI_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const projectSettings = cwd ? join(cwd, CONFIG_DIR_NAME, "settings.json") : undefined;
  if (projectSettings) {
    const fromProject = readKeyFromSettingsFile(projectSettings);
    if (fromProject) return fromProject;
  }

  const globalSettings = join(getAgentDir(), "settings.json");
  const fromGlobal = readKeyFromSettingsFile(globalSettings);
  if (fromGlobal) return fromGlobal;

  const where = [projectSettings, globalSettings].filter(Boolean).join(" or ");
  throw new Error(
    `z.ai API key not found. Set $ZAI_API_KEY, or add ` +
      `{ "${CONFIG_KEY}": { "apiKey": "..." } } to ${where}.`,
  );
}

export async function runZaiWebSearch(
  params: ZaiWebSearchParams,
  apiKey: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const body: Record<string, unknown> = {
    search_engine: params.engine ?? "search-prime",
    search_query: params.query,
    count: params.count ?? 10,
  };
  if (params.recency && params.recency !== "noLimit") {
    body.search_recency_filter = params.recency;
  }
  if (params.domain) body.search_domain_filter = params.domain;

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  const text = await res.text();
  let json: SearchResponse;
  try {
    json = JSON.parse(text) as SearchResponse;
  } catch {
    throw new Error(`z.ai web_search returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || json.error) {
    const code = json.error?.code ?? res.status;
    const message = json.error?.message ?? res.statusText;
    throw new Error(`z.ai web_search failed (${code}): ${message}`);
  }
  return json;
}

export function formatSearchResults(json: SearchResponse): string {
  const results = json.search_result ?? [];
  if (results.length === 0) return "No results.";
  return results
    .map((r, i) => {
      const meta = [r.publish_date, r.media].filter(Boolean).join(" · ");
      const head = `[${i + 1}] ${r.title ?? "(untitled)"}${meta ? ` — ${meta}` : ""}`;
      const link = r.link ? `\n    ${r.link}` : "";
      const content = r.content ? `\n    ${r.content.replace(/\s+/g, " ").trim()}` : "";
      return head + link + content;
    })
    .join("\n\n");
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: TOOL_NAME,
    label: "Zai Web Search",
    description:
      "Search the live web through the z.ai search-prime engine. Returns result titles, URLs, publish dates, and content snippets. Use for current events, versions, prices, docs, or any fact that may have changed.",
    promptSnippet: "Search the web for current information (z.ai)",
    promptGuidelines: [
      `Use ${TOOL_NAME} whenever the answer depends on current events, latest versions, prices, or facts you are not certain about.`,
    ],
    parameters: Type.Object({
      query: Type.String({ description: "The search query" }),
      count: Type.Optional(
        Type.Integer({ minimum: 1, maximum: 50, description: "Number of results to return (default 10)" }),
      ),
      recency: Type.Optional(
        StringEnum(RECENCY, { description: "Only return results from this time range (default noLimit)" }),
      ),
      domain: Type.Optional(
        Type.String({ description: "Restrict results to this domain, e.g. doc.rust-lang.org (best effort)" }),
      ),
      engine: Type.Optional(
        StringEnum(ENGINES, { description: "Search engine backend (default search-prime)" }),
      ),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const key = resolveZaiKey(ctx?.cwd);
      const json = await runZaiWebSearch(params as ZaiWebSearchParams, key, signal);
      return {
        content: [{ type: "text" as const, text: formatSearchResults(json) }],
        details: { count: json.search_result?.length ?? 0, intent: json.search_intent, raw: json },
      };
    },
  });
}
