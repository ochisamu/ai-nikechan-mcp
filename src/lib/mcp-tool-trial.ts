import type { McpAppResult } from "./mcp-app-output";
import type { PostRecord } from "./types";

export const fixedToolTrials = {
  search_nikechan_knowledge: {
    queryLabel: "AIニケちゃんとはどんな存在？",
    arguments: { query: "AIニケちゃんとはどんな存在？ 公開情報から教えて。", limit: 4 },
  },
  search_hybrid: {
    queryLabel: "CharaDockに関する情報",
    arguments: { query: "CharaDock", limit: 4 },
  },
  search_keywords: {
    queryLabel: "#AIニケちゃん の投稿",
    arguments: { query: "#AIニケちゃん", limit: 4 },
  },
  search_x_posts: {
    queryLabel: "Xでの最近の活動",
    arguments: { query: "AIニケちゃんの最近の活動", limit: 4 },
  },
  get_popular_posts: {
    queryLabel: "反応が大きい投稿 上位4件",
    arguments: { limit: 4, metric: "engagement" },
  },
  search_timeline: {
    queryLabel: "2026年7月の記録",
    arguments: { year: 2026, month: 7, limit: 4 },
  },
  get_x_post: {
    queryLabel: "指定したX投稿を取得",
    arguments: { id: "2089268494848454992" },
  },
  get_x_thread: {
    queryLabel: "指定したX投稿のスレッド",
    arguments: { id: "2089268494848454992" },
  },
  x_posts_dataset_info: {
    queryLabel: "データセットの収録範囲",
    arguments: {},
  },
} as const;

export type TrialToolName = keyof typeof fixedToolTrials;

export type TrialPost = {
  post: Pick<PostRecord, "url" | "text" | "createdAt" | "collection" | "source" | "previewTitle" | "previewDescription" | "previewImage">;
  scoreLabel?: string;
};

export type ToolTrialResponse = {
  tool: TrialToolName;
  queryLabel: string;
  arguments: Record<string, unknown>;
  count: number;
  results: TrialPost[];
  info?: Record<string, unknown>;
};

export type ToolTrialCache = {
  generatedAt: string;
  sourceUrl: string;
  responses: Record<TrialToolName, ToolTrialResponse>;
};

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function parseMcpWireResponse(body: string) {
  const direct = parseJson(body);
  if (direct) return direct;

  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const parsed = parseJson(line.slice(5).trim());
    if (parsed) return parsed;
  }
  throw new Error("MCPから読める形式の応答がありませんでした。");
}

function contentJson(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const text = (item as { text?: unknown }).text;
    if (typeof text !== "string") continue;
    const parsed = parseJson(text);
    if (parsed) return parsed;
  }
  return null;
}

function isMcpAppResult(value: unknown): value is McpAppResult {
  if (!value || typeof value !== "object") return false;
  const post = (value as { post?: unknown }).post;
  if (!post || typeof post !== "object") return false;
  const record = post as { url?: unknown; text?: unknown; createdAt?: unknown };
  return typeof record.url === "string" && typeof record.text === "string" && typeof record.createdAt === "string";
}

function isPostRecord(value: unknown): value is PostRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as { url?: unknown; text?: unknown; createdAt?: unknown; collection?: unknown; source?: unknown };
  return typeof record.url === "string"
    && typeof record.text === "string"
    && typeof record.createdAt === "string"
    && typeof record.collection === "string"
    && (record.source === "x" || record.source === "website");
}

function compactResult(result: McpAppResult): TrialPost {
  const { post } = result;
  return {
    post: {
      url: post.url,
      text: post.text.slice(0, 700),
      createdAt: post.createdAt,
      collection: post.collection,
      source: post.source,
      ...(post.previewTitle ? { previewTitle: post.previewTitle } : {}),
      ...(post.previewDescription ? { previewDescription: post.previewDescription } : {}),
      ...(post.previewImage ? { previewImage: post.previewImage } : {}),
    },
    ...(result.scoreLabel ? { scoreLabel: result.scoreLabel } : {}),
  };
}

export function normalizeMcpToolResult(wirePayload: unknown) {
  if (!wirePayload || typeof wirePayload !== "object") throw new Error("MCPの応答が空でした。");
  const rpc = wirePayload as { error?: { message?: string }; result?: unknown };
  if (rpc.error) throw new Error(rpc.error.message || "MCPツールの実行に失敗しました。");
  if (!rpc.result || typeof rpc.result !== "object") throw new Error("MCPツールの結果がありませんでした。");

  const result = rpc.result as { isError?: boolean; content?: unknown; structuredContent?: { results?: unknown } };
  if (result.isError) {
    const message = Array.isArray(result.content)
      ? result.content.flatMap((item) => item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string" ? [(item as { text: string }).text] : []).join("\n")
      : "";
    throw new Error(message || "MCPツールの実行に失敗しました。");
  }
  const payload = result.structuredContent?.results ?? contentJson(result);
  if (Array.isArray(payload)) {
    const results = payload.flatMap((item) => {
      if (isMcpAppResult(item)) return [item];
      if (isPostRecord(item)) return [{ post: item }];
      return [];
    });
    return { results: results.slice(0, 4).map(compactResult) };
  }
  if (payload && typeof payload === "object") {
    if (isPostRecord(payload)) return { results: [compactResult({ post: payload })] };
    return { results: [] as TrialPost[], info: payload as Record<string, unknown> };
  }
  return { results: [] as TrialPost[] };
}
