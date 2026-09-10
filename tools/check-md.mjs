import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const LINE_LIMIT = 88;
const ROOT = ".";
const SKIP_DIRS = new Set([".git", "node_modules"]);

// Files whose structure is fixed upstream rather than by our conventions: the
// workflow files are copied verbatim, and a report's first line is mandated by
// report_tracking.md. The title rule does not apply to them.
const NO_TITLE_RULE = [/^spec\/skills\//, /^spec\/report\//];

const hasTitleRule = (file) => !NO_TITLE_RULE.some((pattern) => pattern.test(file));

let failures = 0;

function report(file, message) {
  failures++;
  console.error(`[${file}] ${message}`);
}

function markdownFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      found.push(...markdownFiles(join(dir, entry.name)));
    } else if (entry.name.endsWith(".md")) {
      found.push(join(dir, entry.name));
    }
  }
  return found.sort();
}

function check(file, source) {
  const lines = source.split("\n");
  const tree = unified().use(remarkParse).use(remarkGfm).parse(source);

  const headings = [];
  let hasTable = false;

  const walk = (node) => {
    if (node.type === "table") hasTable = true;
    if (node.type === "heading") headings.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree);

  if (hasTable) {
    report(file, "table detected; tables are banned");
  }

  if (hasTitleRule(file)) {
    const titles = headings.filter((heading) => heading.depth === 1);
    if (titles.length !== 1) {
      report(file, `expected exactly one level-1 heading, found ${titles.length}`);
    } else if (headings[0] !== titles[0]) {
      const line = titles[0].position.start.line;
      report(file, `line ${line}: the level-1 heading is not the first heading`);
    }
  }

  let insideFence = false;
  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (insideFence) {
        insideFence = false;
      } else {
        insideFence = true;
        if (!/^```\S+/.test(line)) {
          report(file, `line ${index + 1}: fenced block without a language tag`);
        }
      }
    }
    if (line.length > LINE_LIMIT) {
      report(file, `line ${index + 1}: ${line.length} chars > ${LINE_LIMIT}`);
    }
  });
}

for (const file of markdownFiles(ROOT)) {
  check(relative(ROOT, file), readFileSync(file, "utf8"));
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("check-md: OK");
