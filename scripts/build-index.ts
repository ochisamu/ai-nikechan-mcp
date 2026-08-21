import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import OpenAI from "openai";
import { embeddingConfig } from "../src/lib/openai";
import type { IndexMetadata, PostRecord } from "../src/lib/types";

const root = process.cwd();
config({ path: path.join(root, ".env") });
config({ path: path.join(root, ".env.local") });
const input = path.join(root, "x-public-memory-merged", "raw", "all.jsonl");
const outputDirectory = path.join(root, "src", "data");
const batchSize = 96;

const websitePages = [
  { url: "https://nikechan.com/?lang=ja", label: "トップページ" },
  { url: "https://nikechan.com/about?lang=ja", label: "AIニケちゃんについて" },
  { url: "https://nikechan.com/developer?lang=ja", label: "開発者情報" },
  { url: "https://nikechan.com/tutorials?lang=ja", label: "チュートリアル" },
  { url: "https://nikechan.com/guidelines?lang=ja", label: "ガイドライン" },
  { url: "https://nikechan.com/updates?lang=ja", label: "更新情報" },
  { url: "https://nikechan.com/activities?lang=ja", label: "イベント・登壇記録" },
];

function parseRecords(inputText: string): PostRecord[] {
  return inputText.trim().split("\n").map((line) => {
    const value = JSON.parse(line) as {
      source: "x"; collection: string; authority: string; dataset_tier: string; canonical_url: string;
      post: { id: string; conversation_id: string; author_id: string; created_at: string; lang?: string; text: string; public_metrics?: Record<string, number> };
    };
    return {
      source: value.source,
      collection: value.collection,
      authority: value.authority,
      datasetTier: value.dataset_tier,
      url: value.canonical_url,
      id: value.post.id,
      conversationId: value.post.conversation_id,
      authorId: value.post.author_id,
      createdAt: value.post.created_at,
      occurredAt: value.post.created_at,
      lang: value.post.lang,
      text: value.post.text,
      metrics: value.post.public_metrics,
    };
  });
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => String.fromCodePoint(code.startsWith("x") || code.startsWith("X") ? parseInt(code.slice(1), 16) : parseInt(code, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function textFromHtml(html: string) {
  const content = html
    .replace(/<(header|nav|footer)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const main = content.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? content;
  return decodeHtml(
    main
      .replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/?(p|h[1-6]|li|section|article|div|br)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim(),
  );
}

function titleFromHtml(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? textFromHtml(title) : "AIニケちゃん公式サイト";
}

function splitWebsiteText(text: string, maxCharacters = 6_000) {
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of text.split("\n")) {
    const sentences = paragraph.split(/(?<=[。！？.!?])\s*/);
    for (const sentence of sentences) {
      if (!sentence) continue;
      if (current && current.length + sentence.length + 1 > maxCharacters) {
        chunks.push(current);
        current = "";
      }
      if (sentence.length > maxCharacters) {
        for (let start = 0; start < sentence.length; start += maxCharacters) {
          if (current) chunks.push(current);
          chunks.push(sentence.slice(start, start + maxCharacters));
          current = "";
        }
        continue;
      }
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function fetchWebsiteRecords() {
  const fetchedAt = new Date().toISOString();
  const pages = await Promise.all(websitePages.map(async ({ url, label }) => {
    const response = await fetch(url, { headers: { Accept: "text/html" } });
    if (!response.ok) throw new Error(`公式サイトを取得できませんでした: ${response.status} ${url}`);
    const html = await response.text();
    const text = textFromHtml(html);
    if (!text) throw new Error(`公式サイト本文を抽出できませんでした: ${url}`);
    return splitWebsiteText(text).map((chunk, index) => ({
      source: "website" as const,
      collection: "official_site",
      authority: "official",
      datasetTier: "official_website",
      url,
      id: `website:${new URL(url).pathname || "/"}#part-${index + 1}`,
      conversationId: "official-website",
      authorId: "nikechan.com",
      createdAt: fetchedAt,
      lang: "ja",
      text: `【公式サイト・${label}】\n${titleFromHtml(html)}\n${chunk}`,
    } satisfies PostRecord));
  }));
  return pages.flat();
}

async function createEmbeddings(records: PostRecord[]) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY を設定してください。");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const vectors = new Float32Array(records.length * embeddingConfig.dimensions);

  for (let start = 0; start < records.length; start += batchSize) {
    const batch = records.slice(start, start + batchSize);
    const response = await client.embeddings.create({
      model: embeddingConfig.model,
      dimensions: embeddingConfig.dimensions,
      input: batch.map((record) => record.text),
    });
    for (const item of response.data) vectors.set(item.embedding, (start + item.index) * embeddingConfig.dimensions);
    console.log(`Embedded ${Math.min(start + batch.length, records.length)}/${records.length} posts`);
  }
  return vectors;
}

async function main() {
  const xRecords = parseRecords(await readFile(input, "utf8"));
  const websiteRecords = await fetchWebsiteRecords();
  const records = [...xRecords, ...websiteRecords];
  const vectors = await createEmbeddings(records);
  const metadata: IndexMetadata = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceFile: path.relative(root, input),
    model: embeddingConfig.model,
    dimensions: embeddingConfig.dimensions,
    records,
  };
  await mkdir(outputDirectory, { recursive: true });
  const metadataTmp = path.join(outputDirectory, "metadata.json.tmp");
  const vectorsTmp = path.join(outputDirectory, "embeddings.f32.tmp");
  await writeFile(metadataTmp, JSON.stringify(metadata));
  await writeFile(vectorsTmp, Buffer.from(vectors.buffer));
  await Promise.all([
    rename(metadataTmp, path.join(outputDirectory, "metadata.json")),
    rename(vectorsTmp, path.join(outputDirectory, "embeddings.f32")),
  ]);
  console.log(`Created an index for ${xRecords.length} X posts and ${websiteRecords.length} official website pages.`);
}

main().catch(async (error) => {
  await Promise.all(["metadata.json.tmp", "embeddings.f32.tmp"].map((file) => unlink(path.join(outputDirectory, file)).catch(() => undefined)));
  console.error(error);
  process.exitCode = 1;
});
