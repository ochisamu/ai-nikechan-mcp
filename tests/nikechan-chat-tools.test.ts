import assert from "node:assert/strict";
import test from "node:test";
import {
  executeNikechanChatTool,
  isNikechanChatToolName,
  nikechanChatToolNames,
  nikechanFunctionTools,
} from "../src/lib/nikechan-chat-tools";

test("exposes every chat knowledge tool as a function tool", () => {
  assert.deepEqual(nikechanFunctionTools.map(({ name }) => name), nikechanChatToolNames);
  assert.equal(nikechanFunctionTools.every(({ type }) => type === "function"), true);
  assert.equal(isNikechanChatToolName("search_nikechan_knowledge"), true);
  assert.equal(isNikechanChatToolName("unknown_tool"), false);
});

test("executes chat tools against the local index and returns app-compatible results", async () => {
  const results = await executeNikechanChatTool("search_timeline", { limit: 1 });
  assert.equal(results.length, 1);
  assert.equal(typeof results[0].post.url, "string");
  assert.equal(typeof results[0].post.text, "string");
  assert.equal("scoreLabel" in results[0] ? results[0].scoreLabel : undefined, "新しい順");
});
