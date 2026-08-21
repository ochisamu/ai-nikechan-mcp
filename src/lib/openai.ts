import OpenAI from "openai";

const model = "openai/text-embedding-3-small";
const dimensions = 512;

export async function embedQuery(query: string) {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY が設定されていません。");
  }
  const client = new OpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL: "https://ai-gateway.vercel.sh/v1",
  });
  const response = await client.embeddings.create({ input: query, model, dimensions });
  return response.data[0].embedding;
}

export const embeddingConfig = { model, dimensions };
