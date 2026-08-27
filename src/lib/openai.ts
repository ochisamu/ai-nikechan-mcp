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

export function resolveEmbeddingProviders(
  env: Readonly<Record<string, string | undefined>> = process.env,
): EmbeddingProvider[] {
  const providers: EmbeddingProvider[] = [];
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    providers.push({
      apiKey: gatewayKey,
      baseURL: gatewayBaseURL,
      model: gatewayModel,
      kind: "gateway",
    });
  }

  const openAIKey = env.OPENAI_API_KEY?.trim();
  if (openAIKey) {
    providers.push({
      apiKey: openAIKey,
      model: openAIModel,
      kind: "openai",
    });
  }

  return providers;
}

export function resolveEmbeddingProvider(
  env: Readonly<Record<string, string | undefined>> = process.env,
): EmbeddingProvider | null {
  return resolveEmbeddingProviders(env)[0] ?? null;
}

export async function embedQuery(query: string) {
  const providers = resolveEmbeddingProviders();
  if (!providers.length) {
    throw new Error("AI_GATEWAY_API_KEY または OPENAI_API_KEY が設定されていません。");
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const client = new OpenAI({
        apiKey: provider.apiKey,
        ...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
      });
      const response = await client.embeddings.create({ input: query, model: provider.model, dimensions });
      return response.data[0].embedding;
    } catch (error) {
      lastError = error;
      console.error(`embedding request failed (${provider.kind})`, error);
    }
  }

  throw lastError;
}

export const embeddingConfig = { model: gatewayModel, dimensions };
