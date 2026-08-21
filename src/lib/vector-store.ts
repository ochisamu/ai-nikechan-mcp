import { readFile } from "node:fs/promises";
import path from "node:path";
import type { IndexMetadata, PostRecord } from "./types";

type VectorIndex = IndexMetadata & { vectors: Float32Array };

let indexPromise: Promise<VectorIndex> | undefined;

function indexFiles() {
  const directory = path.join(process.cwd(), "src", "data");
  return {
    metadata: path.join(directory, "metadata.json"),
    vectors: path.join(directory, "embeddings.f32"),
  };
}

async function loadIndex(): Promise<VectorIndex> {
  const files = indexFiles();
  let metadataText: string;
  let vectorBytes: Buffer;

  try {
    [metadataText, vectorBytes] = await Promise.all([
      readFile(files.metadata, "utf8"),
      readFile(files.vectors),
    ]);
  } catch {
    throw new Error(
      "検索インデックスがありません。OPENAI_API_KEY を設定して npm run build:index を実行してからデプロイしてください。",
    );
  }

  const metadata = JSON.parse(metadataText) as IndexMetadata;
  const expectedBytes = metadata.records.length * metadata.dimensions * Float32Array.BYTES_PER_ELEMENT;
  if (metadata.schemaVersion !== 1 || vectorBytes.byteLength !== expectedBytes) {
    throw new Error("検索インデックスの形式が不正です。npm run build:index を再実行してください。");
  }

  return {
    ...metadata,
    vectors: new Float32Array(vectorBytes.buffer, vectorBytes.byteOffset, vectorBytes.byteLength / 4),
  };
}

export function getIndex() {
  indexPromise ??= loadIndex();
  return indexPromise;
}

export async function datasetInfo() {
  const index = await getIndex();
  const collections = Object.entries(
    index.records.reduce<Record<string, number>>((counts, record) => {
      counts[record.collection] = (counts[record.collection] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([collection, count]) => ({ collection, count }));

  return {
    records: index.records.length,
    model: index.model,
    dimensions: index.dimensions,
    generatedAt: index.generatedAt,
    collections,
    sources: Object.entries(index.records.reduce<Record<string, number>>((counts, record) => {
      counts[record.source] = (counts[record.source] ?? 0) + 1;
      return counts;
    }, {})).map(([source, count]) => ({ source, count })),
  };
}

export async function postById(id: string): Promise<PostRecord | undefined> {
  return (await getIndex()).records.find((record) => record.id === id);
}

export async function threadByPostId(id: string) {
  const index = await getIndex();
  const post = index.records.find((record) => record.id === id && record.source === "x");
  if (!post) return undefined;
  return index.records.filter((record) => record.source === "x" && record.conversationId === post.conversationId).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function cosineSimilarity(query: number[], vectors: Float32Array, offset: number, dimensions: number) {
  let dot = 0;
  let queryNorm = 0;
  let vectorNorm = 0;
  for (let i = 0; i < dimensions; i += 1) {
    const value = vectors[offset + i];
    dot += query[i] * value;
    queryNorm += query[i] * query[i];
    vectorNorm += value * value;
  }
  return dot / (Math.sqrt(queryNorm) * Math.sqrt(vectorNorm));
}

export async function searchPosts(options: {
  embedding: number[];
  limit: number;
  collection?: string;
  source?: PostRecord["source"];
  from?: string;
  to?: string;
}) {
  const index = await getIndex();
  if (options.embedding.length !== index.dimensions) {
    throw new Error("クエリ埋め込みの次元数がインデックスと一致しません。インデックスを再作成してください。");
  }

  const matches = index.records
    .map((post, position) => ({ post, position }))
    .filter(({ post }) => {
      return (!options.collection || post.collection === options.collection)
        && (!options.source || post.source === options.source)
        && (!options.from || post.createdAt >= options.from)
        && (!options.to || post.createdAt <= options.to);
    })
    .map(({ post, position }) => ({
      post,
      score: cosineSimilarity(options.embedding, index.vectors, position * index.dimensions, index.dimensions),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, options.limit);

  return matches;
}

export async function searchTimeline(options: { year?: number; month?: number; from?: string; to?: string; limit: number; source?: PostRecord["source"] }) {
  const index = await getIndex();
  return index.records
    .filter((post) => (!options.source || post.source === options.source) && (!options.year || post.createdAt.startsWith(`${options.year}-`)) && (!options.month || post.createdAt.slice(5, 7) === String(options.month).padStart(2, "0")) && (!options.from || post.createdAt >= options.from) && (!options.to || post.createdAt <= options.to))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, options.limit);
}

export async function getPopularPosts(options: { limit: number; collection?: string; from?: string; to?: string; metric?: "engagement" | "likes" | "reposts" | "replies" | "impressions" }) {
  const metric = options.metric ?? "engagement";
  const value = (post: PostRecord) => {
    const metrics = post.metrics ?? {};
    if (metric === "likes") return metrics.like_count ?? 0;
    if (metric === "reposts") return metrics.retweet_count ?? 0;
    if (metric === "replies") return metrics.reply_count ?? 0;
    if (metric === "impressions") return metrics.impression_count ?? 0;
    return (metrics.like_count ?? 0) + (metrics.retweet_count ?? 0) + (metrics.reply_count ?? 0) + (metrics.quote_count ?? 0);
  };
  const index = await getIndex();
  return index.records.filter((post) => post.source === "x" && (!options.collection || post.collection === options.collection) && (!options.from || post.createdAt >= options.from) && (!options.to || post.createdAt <= options.to)).map((post) => ({ post, metric, value: value(post) })).sort((left, right) => right.value - left.value).slice(0, options.limit);
}

export async function searchKeywords(options: { query: string; limit: number; collection?: string; source?: PostRecord["source"] }) {
  const index = await getIndex();
  const terms = options.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return index.records.map((post) => ({ post, score: terms.reduce((total, term) => total + post.text.toLocaleLowerCase().split(term).length - 1, 0) })).filter(({ post, score }) => score > 0 && (!options.collection || post.collection === options.collection) && (!options.source || post.source === options.source)).sort((left, right) => right.score - left.score).slice(0, options.limit);
}

export async function searchHybrid(options: { query: string; embedding: number[]; limit: number; collection?: string; source?: PostRecord["source"] }) {
  const semantic = await searchPosts(options);
  const keyword = await searchKeywords(options);
  const scores = new Map<string, { post: PostRecord; semanticScore: number; keywordScore: number }>();
  for (const { post, score } of semantic) scores.set(post.id, { post, semanticScore: score, keywordScore: 0 });
  for (const { post, score } of keyword) { const current = scores.get(post.id) ?? { post, semanticScore: 0, keywordScore: 0 }; current.keywordScore = score; scores.set(post.id, current); }
  return [...scores.values()].map((item) => ({ ...item, score: item.semanticScore + Math.min(item.keywordScore, 3) * 0.15 })).sort((left, right) => right.score - left.score).slice(0, options.limit);
}
