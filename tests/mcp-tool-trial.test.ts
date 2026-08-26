import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMcpToolResult, parseMcpWireResponse } from "../src/lib/mcp-tool-trial";

const result = {
  post: {
    source: "x",
    collection: "official",
    authority: "official",
    datasetTier: "curated",
    url: "https://x.com/i/web/status/1",
    id: "1",
    conversationId: "1",
    authorId: "2",
    createdAt: "2026-07-01T00:00:00.000Z",
    text: "AIニケちゃんの公開投稿",
  },
  scoreLabel: "新しい順",
};

test("parses the SSE envelope returned by the MCP endpoint", () => {
  const payload = parseMcpWireResponse(`event: message\ndata: ${JSON.stringify({
    jsonrpc: "2.0",
    id: "trial",
    result: { structuredContent: { results: [result] } },
  })}\n\n`);

  assert.equal((payload as { id: string }).id, "trial");
});

test("normalizes card results and plain dataset information", () => {
  const cards = normalizeMcpToolResult({
    result: { structuredContent: { results: [result] } },
  });
  assert.equal(cards.results.length, 1);
  assert.equal(cards.results[0].post.url, result.post.url);

  const info = normalizeMcpToolResult({
    result: { content: [{ type: "text", text: JSON.stringify({ records: 42 }) }] },
  });
  assert.deepEqual(info.info, { records: 42 });
});

test("normalizes raw post output from earlier MCP deployments", () => {
  const rawPost = normalizeMcpToolResult({
    result: { content: [{ type: "text", text: JSON.stringify(result.post) }] },
  });
  assert.equal(rawPost.results.length, 1);
  assert.equal(rawPost.info, undefined);

  const rawThread = normalizeMcpToolResult({
    result: { content: [{ type: "text", text: JSON.stringify([result.post]) }] },
  });
  assert.equal(rawThread.results.length, 1);
});
