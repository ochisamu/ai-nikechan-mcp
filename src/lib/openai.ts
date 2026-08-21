import OpenAI from "openai";

const model = "text-embedding-3-small";
const dimensions = 512;

export async function embedQuery(query: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY が設定されていません。");
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.embeddings.create({ input: query, model, dimensions });
  return response.data[0].embedding;
}

export const embeddingConfig = { model, dimensions };
