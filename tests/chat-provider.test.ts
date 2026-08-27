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

test("uses an OpenAI model when a non-OpenAI Gateway model needs a fallback", () => {
  assert.deepEqual(resolveChatProviders({
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
    AI_CHAT_MODEL: "zai/glm-5.3-flash",
  }).map(({ kind, model }) => ({ kind, model })), [
    { kind: "gateway", model: "zai/glm-5.3-flash" },
    { kind: "openai", model: "gpt-5.4-nano" },
  ]);
});

test("allows an explicit OpenAI fallback model for a non-OpenAI Gateway model", () => {
  assert.deepEqual(resolveChatProviders({
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
    AI_CHAT_MODEL: "zai/glm-5.3-flash",
    OPENAI_FALLBACK_CHAT_MODEL: "openai/gpt-5.6-luna",
  }).map(({ kind, model }) => ({ kind, model })), [
    { kind: "gateway", model: "zai/glm-5.3-flash" },
    { kind: "openai", model: "gpt-5.6-luna" },
  ]);
});

test("defaults Gateway chat to GLM and direct OpenAI chat to the OpenAI fallback", () => {
  assert.deepEqual(resolveChatProviders({
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
  }).map(({ kind, model }) => ({ kind, model })), [
    { kind: "gateway", model: "zai/glm-5.3-flash" },
    { kind: "openai", model: "gpt-5.4-nano" },
  ]);
});
