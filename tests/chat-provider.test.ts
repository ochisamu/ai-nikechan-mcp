import assert from "node:assert/strict";
import test from "node:test";
import { resolveChatProvider, resolveChatProviders } from "../src/lib/chat-provider";

test("prefers AI Gateway and adds the OpenAI provider prefix", () => {
  assert.deepEqual(resolveChatProvider({
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
    AI_CHAT_MODEL: "gpt-5.4-nano",
  }), {
    apiKey: "gateway-key",
    baseURL: "https://ai-gateway.vercel.sh/v1",
    model: "openai/gpt-5.4-nano",
    kind: "gateway",
  });
});

test("uses OpenAI directly and removes the gateway provider prefix", () => {
  assert.deepEqual(resolveChatProvider({
    OPENAI_API_KEY: "openai-key",
    AI_CHAT_MODEL: "openai/gpt-5.4-nano",
  }), {
    apiKey: "openai-key",
    model: "gpt-5.4-nano",
    kind: "openai",
  });
});

test("returns null when neither runtime key is configured", () => {
  assert.equal(resolveChatProvider({}), null);
});

test("orders OpenAI after AI Gateway as a runtime fallback", () => {
  assert.deepEqual(resolveChatProviders({
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
    AI_CHAT_MODEL: "gpt-5.4-nano",
  }).map(({ kind, model }) => ({ kind, model })), [
    { kind: "gateway", model: "openai/gpt-5.4-nano" },
    { kind: "openai", model: "gpt-5.4-nano" },
  ]);
});
