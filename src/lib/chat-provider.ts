export type ChatProvider = {
  apiKey: string;
  baseURL?: string;
  model: string;
  kind: "gateway" | "openai";
};

const gatewayBaseURL = "https://ai-gateway.vercel.sh/v1";
const defaultGatewayModel = "zai/glm-5.3-flash";
const defaultOpenAIModel = "gpt-5.4-nano";

function gatewayModel(model: string) {
  return model.includes("/") ? model : `openai/${model}`;
}

function directOpenAIModel(model: string) {
  return model.startsWith("openai/") ? model.slice("openai/".length) : model;
}

function openAIFallbackModel(gatewayModelName: string, configuredFallback?: string) {
  const fallback = configuredFallback?.trim();
  if (fallback) return directOpenAIModel(fallback);
  if (!gatewayModelName.includes("/") || gatewayModelName.startsWith("openai/")) {
    return directOpenAIModel(gatewayModelName);
  }
  return defaultOpenAIModel;
}

export function resolveChatProviders(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ChatProvider[] {
  const configuredModel = env.AI_CHAT_MODEL?.trim() || defaultGatewayModel;
  const providers: ChatProvider[] = [];
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    providers.push({
      apiKey: gatewayKey,
      baseURL: gatewayBaseURL,
      model: gatewayModel(configuredModel),
      kind: "gateway",
    });
  }

  const openAIKey = env.OPENAI_API_KEY?.trim();
  if (openAIKey) {
    providers.push({
      apiKey: openAIKey,
      model: openAIFallbackModel(configuredModel, env.OPENAI_FALLBACK_CHAT_MODEL),
      kind: "openai",
    });
  }

  return providers;
}

export function resolveChatProvider(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ChatProvider | null {
  return resolveChatProviders(env)[0] ?? null;
}
