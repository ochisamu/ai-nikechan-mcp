import { z } from "zod";
import { embedQuery } from "./openai";
import { mcpToolCatalogByName } from "./mcp-tool-catalog";
import {
  getPopularPosts,
  postById,
  searchHybrid,
  searchKeywords,
  searchPosts,
  searchTimeline,
  threadByPostId,
} from "./vector-store";

export const nikechanChatToolNames = [
  "search_nikechan_knowledge",
  "search_hybrid",
  "search_keywords",
  "search_x_posts",
  "get_popular_posts",
  "search_timeline",
  "get_x_post",
  "get_x_thread",
] as const;

export type NikechanChatToolName = (typeof nikechanChatToolNames)[number];

const collectionSchema = z.enum(["official", "community", "official_site"]);
const sourceSchema = z.enum(["x", "website"]);
const dateSchema = z.string().datetime();
const searchArgsSchema = z.object({
  query: z.string().trim().min(1).max(2_000),
  limit: z.coerce.number().int().min(1).max(8).default(6),
  collection: collectionSchema.optional(),
  source: sourceSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});
const xSearchArgsSchema = searchArgsSchema.omit({ source: true }).extend({
  collection: z.enum(["official", "community"]).optional(),
});
const popularArgsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(5),
  collection: z.enum(["official", "community"]).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  metric: z.enum(["engagement", "likes", "reposts", "replies", "impressions"]).default("engagement"),
});
const timelineArgsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(8).default(6),
  source: sourceSchema.optional(),
});
const postArgsSchema = z.object({ id: z.string().trim().min(1).max(100) });

const searchParameters = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: { type: "string", description: "利用者の質問を省略せず、検索対象や語句を含めた検索文" },
    limit: { type: "integer", minimum: 1, maximum: 8, description: "返す最大件数。通常は5件" },
    collection: { type: "string", enum: ["official", "community", "official_site"] },
    source: { type: "string", enum: ["x", "website"] },
    from: { type: "string", description: "この日時以降。ISO 8601形式" },
    to: { type: "string", description: "この日時以前。ISO 8601形式" },
  },
  required: ["query"],
};

const xSearchParameters = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: searchParameters.properties.query,
    limit: searchParameters.properties.limit,
    collection: { type: "string", enum: ["official", "community"] },
    from: searchParameters.properties.from,
    to: searchParameters.properties.to,
  },
  required: ["query"],
};

export const nikechanFunctionTools = [
  {
    type: "function",
    name: "search_nikechan_knowledge",
    description: mcpToolCatalogByName.search_nikechan_knowledge.description,
    parameters: searchParameters,
    strict: false,
  },
  {
    type: "function",
    name: "search_hybrid",
    description: mcpToolCatalogByName.search_hybrid.description,
    parameters: searchParameters,
    strict: false,
  },
  {
    type: "function",
    name: "search_keywords",
    description: mcpToolCatalogByName.search_keywords.description,
    parameters: searchParameters,
    strict: false,
  },
  {
    type: "function",
    name: "search_x_posts",
    description: mcpToolCatalogByName.search_x_posts.description,
    parameters: xSearchParameters,
    strict: false,
  },
  {
    type: "function",
    name: "get_popular_posts",
    description: mcpToolCatalogByName.get_popular_posts.description,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 8 },
        collection: { type: "string", enum: ["official", "community"] },
        from: { type: "string", description: "この日時以降。ISO 8601形式" },
        to: { type: "string", description: "この日時以前。ISO 8601形式" },
        metric: { type: "string", enum: ["engagement", "likes", "reposts", "replies", "impressions"] },
      },
    },
    strict: false,
  },
  {
    type: "function",
    name: "search_timeline",
    description: mcpToolCatalogByName.search_timeline.description,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        year: { type: "integer", minimum: 2000, maximum: 2100 },
        month: { type: "integer", minimum: 1, maximum: 12 },
        from: { type: "string", description: "この日時以降。ISO 8601形式" },
        to: { type: "string", description: "この日時以前。ISO 8601形式" },
        limit: { type: "integer", minimum: 1, maximum: 8 },
        source: { type: "string", enum: ["x", "website"] },
      },
    },
    strict: false,
  },
  {
    type: "function",
    name: "get_x_post",
    description: mcpToolCatalogByName.get_x_post.description,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { id: { type: "string", description: "X投稿URL末尾の数値ID" } },
      required: ["id"],
    },
    strict: false,
  },
  {
    type: "function",
    name: "get_x_thread",
    description: mcpToolCatalogByName.get_x_thread.description,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { id: { type: "string", description: "スレッド内にあるX投稿の数値ID" } },
      required: ["id"],
    },
    strict: false,
  },
] satisfies Array<{
  type: "function";
  name: NikechanChatToolName;
  description: string;
  parameters: Record<string, unknown>;
  strict: boolean;
}>;

export function isNikechanChatToolName(value: string): value is NikechanChatToolName {
  return (nikechanChatToolNames as readonly string[]).includes(value);
}

function inDateRange<T extends { post: { createdAt: string } }>(results: T[], from?: string, to?: string) {
  return results.filter(({ post }) => (!from || post.createdAt >= from) && (!to || post.createdAt <= to));
}

export async function executeNikechanChatTool(name: NikechanChatToolName, rawArguments: unknown) {
  if (name === "get_popular_posts") {
    const args = popularArgsSchema.parse(rawArguments);
    const labels = { engagement: "総反応", likes: "いいね", reposts: "リポスト", replies: "返信", impressions: "表示" };
    return (await getPopularPosts(args)).map(({ post, metric, value }) => ({
      post,
      scoreLabel: `${labels[metric]} ${value.toLocaleString("ja-JP")}`,
    }));
  }

  if (name === "search_timeline") {
    const args = timelineArgsSchema.parse(rawArguments);
    return (await searchTimeline(args)).map((post) => ({ post, scoreLabel: "新しい順" }));
  }

  if (name === "get_x_post" || name === "get_x_thread") {
    const { id } = postArgsSchema.parse(rawArguments);
    if (name === "get_x_post") {
      const post = await postById(id);
      return post ? [{ post, scoreLabel: "指定した投稿" }] : [];
    }
    const thread = await threadByPostId(id);
    return (thread ?? []).slice(0, 8).map((post) => ({ post, scoreLabel: "スレッド" }));
  }

  if (name === "search_x_posts") {
    const args = xSearchArgsSchema.parse(rawArguments);
    const embedding = await embedQuery(args.query);
    return searchPosts({
      embedding,
      limit: args.limit,
      collection: args.collection,
      source: "x",
      from: args.from,
      to: args.to,
    });
  }

  const args = searchArgsSchema.parse(rawArguments);
  if (name === "search_keywords") {
    return inDateRange(await searchKeywords(args), args.from, args.to);
  }

  const embedding = await embedQuery(args.query);
  if (name === "search_hybrid") {
    return inDateRange(await searchHybrid({
      query: args.query,
      embedding,
      limit: args.limit,
      collection: args.collection,
      source: args.source,
    }), args.from, args.to);
  }

  return searchPosts({
    embedding,
    limit: args.limit,
    collection: args.collection,
    source: args.source,
    from: args.from,
    to: args.to,
  });
}
