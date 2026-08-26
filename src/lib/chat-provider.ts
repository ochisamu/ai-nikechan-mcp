export type ChatProvider = {
  apiKey: string;
  baseURL?: string;
  model: string;
  kind: "gateway" | "openai";
};

const gatewayBaseURL = "https://ai-gateway.vercel.sh/v1";
const defaultOpenAIModel = "gpt-5.6-luna";

function gatewayModel(model: string) {
  return model.includes("/") ? model : `openai/${model}`;
}

function directOpenAIModel(model: string) {
  return model.startsWith("openai/") ? model.slice("openai/".length) : model;
}

export function resolveChatProvider(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ChatProvider | null {
  const configuredModel = env.AI_CHAT_MODEL?.trim() || defaultOpenAIModel;
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    return {
      apiKey: gatewayKey,
      baseURL: gatewayBaseURL,
      model: gatewayModel(configuredModel),
      kind: "gateway",
    };
  }

  const openAIKey = env.OPENAI_API_KEY?.trim();
  if (openAIKey) {
    return {
      apiKey: openAIKey,
      model: directOpenAIModel(configuredModel),
      kind: "openai",
    };
  }

  return null;
}
