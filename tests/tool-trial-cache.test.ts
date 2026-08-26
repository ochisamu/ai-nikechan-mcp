import assert from "node:assert/strict";
import test from "node:test";
import toolTrialCacheJson from "../src/generated/tool-trial-results.json";
import { fixedToolTrials, type ToolTrialCache, type TrialToolName } from "../src/lib/mcp-tool-trial";

const cache = toolTrialCacheJson as unknown as ToolTrialCache;
const toolNames = Object.keys(fixedToolTrials) as TrialToolName[];

test("contains a precomputed response for every fixed tool trial", () => {
  assert.ok(Date.parse(cache.generatedAt));
  assert.deepEqual(Object.keys(cache.responses), toolNames);

  for (const tool of toolNames) {
    const response = cache.responses[tool];
    assert.equal(response.tool, tool);
    assert.equal(response.queryLabel, fixedToolTrials[tool].queryLabel);
    assert.deepEqual(response.arguments, fixedToolTrials[tool].arguments);
    assert.ok(response.results.length > 0 || response.info);
  }
});

test("cached MCP Apps results include previews without runtime preview requests", () => {
  const results = toolNames.flatMap((tool) => cache.responses[tool].results);
  assert.ok(results.length > 0);
  assert.ok(results.every(({ post }) => post.previewTitle || post.previewImage));
});
