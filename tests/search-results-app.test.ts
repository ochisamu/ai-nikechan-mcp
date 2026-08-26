import assert from "node:assert/strict";
import test from "node:test";
import { searchResultsAppHtml } from "../src/lib/search-results-app";

test("MCP Apps cards deduplicate preview text and preserve full thumbnails", () => {
  assert.match(searchResultsAppHtml, /const repeats=/);
  assert.match(searchResultsAppHtml, /object-fit:contain/);
  assert.doesNotMatch(searchResultsAppHtml, /object-fit:cover/);
  assert.match(searchResultsAppHtml, /loading="lazy"/);
});
