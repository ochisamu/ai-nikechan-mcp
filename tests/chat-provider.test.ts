import assert from "node:assert/strict";
import test from "node:test";
import { resolveChatProvider, resolveChatProviders } from "../src/lib/chat-provider";

test("prefers direct OpenAI and uses GPT-5.6 Luna when both keys are configured", () => {
  assert.deepEqual(resolveChatProvider({
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
    AI_CHAT_MODEL: "zai/glm-5.3-flash",
  }), {
    apiKey: "openai-key",
    model: "gpt-5.6-luna",
    kind: "openai",
  });
});

test("allows an explicit direct OpenAI chat model override", () => {
  assert.deepEqual(resolveChatProvider({
    OPENAI_API_KEY: "openai-key",
    OPENAI_CHAT_MODEL: "openai/gpt-5.6-luna",
  }), {
    apiKey: "openai-key",
    model: "gpt-5.6-luna",
    kind: "openai",
  });
});

test("uses Gateway when the OpenAI key is absent", () => {
  assert.deepEqual(resolveChatProvider({
    AI_GATEWAY_API_KEY: "gateway-key",
    AI_CHAT_MODEL: "gpt-5.6-luna",
  }), {
    apiKey: "gateway-key",
    baseURL: "https://ai-gateway.vercel.sh/v1",
    model: "openai/gpt-5.6-luna",
    kind: "gateway",
  });
});

test("returns null when neither runtime key is configured", () => {
  assert.equal(resolveChatProvider({}), null);
});

test("orders Gateway after direct OpenAI as a runtime fallback", () => {
  assert.deepEqual(resolveChatProviders({
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
    AI_CHAT_MODEL: "zai/glm-5.3-flash",
  }).map(({ kind, model }) => ({ kind, model })), [
    { kind: "openai", model: "gpt-5.6-luna" },
    { kind: "gateway", model: "zai/glm-5.3-flash" },
  ]);
});

test("uses independent defaults for OpenAI and Gateway", () => {
  assert.deepEqual(resolveChatProviders({
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
  }).map(({ kind, model }) => ({ kind, model })), [
    { kind: "openai", model: "gpt-5.6-luna" },
    { kind: "gateway", model: "zai/glm-5.3-flash" },
  ]);
});
