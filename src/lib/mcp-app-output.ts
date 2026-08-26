import type { PostRecord } from "./types";

export type McpAppResult = {
  post: PostRecord;
  score?: number;
  scoreLabel?: string;
};

export type ChatMcpApp = {
  id: string;
  tool: string;
  results: McpAppResult[];
};

type McpCallLike = {
  id?: string;
  name: string;
  output?: string | null;
};

function isPostRecord(value: unknown): value is PostRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { url?: unknown; text?: unknown; source?: unknown; collection?: unknown; createdAt?: unknown };
  return typeof candidate.url === "string"
    && typeof candidate.text === "string"
    && (candidate.source === "x" || candidate.source === "website")
    && typeof candidate.collection === "string"
    && typeof candidate.createdAt === "string";
}

function parsedJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function resultArray(value: unknown, depth = 0): unknown[] {
  if (depth > 3 || value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return resultArray(parsedJson(value), depth + 1);
  if (typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  if (isPostRecord(record)) return [record];
  if (Array.isArray(record.results)) return record.results;
  if (record.structuredContent) return resultArray(record.structuredContent, depth + 1);
  if (Array.isArray(record.content)) {
    for (const item of record.content) {
      if (item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string") {
        const results = resultArray((item as { text: string }).text, depth + 1);
        if (results.length) return results;
      }
    }
  }
  return [];
}

function isMcpAppResult(value: unknown): value is McpAppResult {
  if (!value || typeof value !== "object") return false;
  const post = (value as { post?: unknown }).post;
  if (!post || typeof post !== "object") return false;
  const candidate = post as { url?: unknown; text?: unknown };
  return typeof candidate.url === "string" && typeof candidate.text === "string";
}

export function extractMcpAppResults(output: string | null | undefined) {
  return resultArray(output).flatMap((value) => {
    if (isMcpAppResult(value)) return [value];
    if (isPostRecord(value)) return [{ post: value }];
    return [];
  });
}

export function createChatMcpApps(calls: McpCallLike[]) {
  return calls.flatMap((call, index) => {
    const results = extractMcpAppResults(call.output);
    if (!results.length) return [];
    return [{
      id: call.id || `${call.name}-${index}`,
      tool: call.name,
      results,
    }];
  });
}
