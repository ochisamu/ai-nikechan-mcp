import assert from "node:assert/strict";
import test from "node:test";
import { resolveEmbeddingProvider } from "../src/lib/openai";

test("prefers AI Gateway for embeddings when both keys are configured", () => {
  assert.deepEqual(resolveEmbeddingProvider({
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
  }), {
    apiKey: "gateway-key",
    baseURL: "https://ai-gateway.vercel.sh/v1",
    model: "openai/text-embedding-3-small",
    kind: "gateway",
  });
});

test("uses OpenAI directly for embeddings when the gateway key is absent", () => {
  assert.deepEqual(resolveEmbeddingProvider({
    OPENAI_API_KEY: "openai-key",
  }), {
    apiKey: "openai-key",
    model: "text-embedding-3-small",
    kind: "openai",
  });
});

test("returns null when no embedding provider key is configured", () => {
  assert.equal(resolveEmbeddingProvider({}), null);
});
