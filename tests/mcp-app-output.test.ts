import assert from "node:assert/strict";
import test from "node:test";
import { createChatMcpApps, extractMcpAppResults } from "../src/lib/mcp-app-output";

const result = {
  post: {
    source: "x" as const,
    collection: "community",
    authority: "community",
    datasetTier: "historical_sample",
    url: "https://x.com/i/web/status/1",
    id: "1",
    conversationId: "1",
    authorId: "2",
    createdAt: "2026-01-01T00:00:00.000Z",
    text: "AIニケちゃんの投稿",
  },
  score: 0.9,
};

test("extracts the JSON array returned by a Responses API MCP call", () => {
  assert.deepEqual(extractMcpAppResults(JSON.stringify([result])), [result]);
});

test("accepts a full MCP result envelope and ignores non-card tool output", () => {
  const envelope = JSON.stringify({
    structuredContent: { results: [result] },
    content: [{ type: "text", text: JSON.stringify([result]) }],
  });
  assert.equal(createChatMcpApps([
    { id: "call-1", name: "search_nikechan_knowledge", output: envelope },
    { id: "call-2", name: "x_posts_dataset_info", output: "metadata only" },
  ]).length, 1);
});

test("accepts raw post arrays and single posts from earlier MCP deployments", () => {
  assert.equal(extractMcpAppResults(JSON.stringify([result.post])).length, 1);
  assert.equal(extractMcpAppResults(JSON.stringify(result.post)).length, 1);
});
