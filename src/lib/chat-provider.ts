export type ChatProvider = {
  apiKey: string;
  baseURL?: string;
  model: string;
  kind: "gateway" | "openai";
};

const gatewayBaseURL = "https://ai-gateway.vercel.sh/v1";
const defaultGatewayModel = "zai/glm-5.3-flash";
const defaultOpenAIModel = "gpt-5.6-luna";

function gatewayModel(model: string) {
  return model.includes("/") ? model : `openai/${model}`;
}

function directOpenAIModel(model: string) {
  return model.startsWith("openai/") ? model.slice("openai/".length) : model;
}

export function resolveChatProviders(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ChatProvider[] {
  const configuredGatewayModel = env.AI_CHAT_MODEL?.trim() || defaultGatewayModel;
  const configuredOpenAIModel = env.OPENAI_CHAT_MODEL?.trim() || defaultOpenAIModel;
  const providers: ChatProvider[] = [];

  const openAIKey = env.OPENAI_API_KEY?.trim();
  if (openAIKey) {
    providers.push({
      apiKey: openAIKey,
      model: directOpenAIModel(configuredOpenAIModel),
      kind: "openai",
    });
  }

  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    providers.push({
      apiKey: gatewayKey,
      baseURL: gatewayBaseURL,
      model: gatewayModel(configuredGatewayModel),
      kind: "gateway",
    });
  }

  return providers;
}

export function resolveChatProvider(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ChatProvider | null {
  return resolveChatProviders(env)[0] ?? null;
}
