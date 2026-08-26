import OpenAI from "openai";

const gatewayBaseURL = "https://ai-gateway.vercel.sh/v1";
const openAIModel = "text-embedding-3-small";
const gatewayModel = `openai/${openAIModel}`;
const dimensions = 512;

export type EmbeddingProvider = {
  apiKey: string;
  baseURL?: string;
  model: string;
  kind: "gateway" | "openai";
};

export function resolveEmbeddingProvider(
  env: Readonly<Record<string, string | undefined>> = process.env,
): EmbeddingProvider | null {
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    return {
      apiKey: gatewayKey,
      baseURL: gatewayBaseURL,
      model: gatewayModel,
      kind: "gateway",
    };
  }

  const openAIKey = env.OPENAI_API_KEY?.trim();
  if (openAIKey) {
    return {
      apiKey: openAIKey,
      model: openAIModel,
      kind: "openai",
    };
  }

  return null;
}

export async function embedQuery(query: string) {
  const provider = resolveEmbeddingProvider();
  if (!provider) {
    throw new Error("AI_GATEWAY_API_KEY または OPENAI_API_KEY が設定されていません。");
  }
  const client = new OpenAI({
    apiKey: provider.apiKey,
    ...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
  });
  const response = await client.embeddings.create({ input: query, model: provider.model, dimensions });
  return response.data[0].embedding;
}

export const embeddingConfig = { model: gatewayModel, dimensions };
