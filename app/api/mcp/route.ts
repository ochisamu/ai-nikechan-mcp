import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { embedQuery } from "@/src/lib/openai";
import { mcpToolCatalogByName } from "@/src/lib/mcp-tool-catalog";
import { searchResultsAppHtml, searchResultsAppUri } from "@/src/lib/search-results-app";
import {
  datasetInfo,
  getPopularPosts,
  postById,
  searchHybrid,
  searchKeywords,
  searchPosts,
  searchTimeline,
  threadByPostId,
} from "@/src/lib/vector-store";

const appMeta = (invoking: string, invoked: string) => ({
  "openai/outputTemplate": searchResultsAppUri,
  "openai/toolInvocation/invoking": invoking,
  "openai/toolInvocation/invoked": invoked,
  "ui/resourceUri": searchResultsAppUri,
});

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function appResult(results: unknown[]) {
  return {
    structuredContent: { results },
    content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
  };
}

const searchInput = {
  query: z.string().min(1).max(2_000).describe("利用者の質問を省略せず、検索したい対象・出来事・語句を含めて入力"),
  limit: z.number().int().min(1).max(20).default(8).describe("MCP Appsのカードに返す最大件数"),
  collection: z.enum(["official", "community", "official_site"]).optional().describe("公式投稿、コミュニティ投稿、公式サイトの絞り込み"),
  source: z.enum(["x", "website"]).optional().describe("X投稿またはWebサイトへの絞り込み"),
  from: z.string().datetime().optional().describe("この日時以降に絞る ISO 8601"),
  to: z.string().datetime().optional().describe("この日時以前に絞る ISO 8601"),
};

const handler = createMcpHandler(
  (server) => {
    server.registerResource("nikechan-search-results", searchResultsAppUri, {
      mimeType: "text/html;profile=mcp-app",
      _meta: {
        "openai/widgetDescription": "AIニケちゃんの検索結果を、画像・出典・日時つきのカードで比較できるMCP Apps UIです。",
        "openai/widgetPrefersBorder": true,
        "openai/widgetCSP": {
          connect_domains: ["https://ai-nikechan-mcp.vercel.app"],
          resource_domains: ["https://pbs.twimg.com", "https://nikechan.com"],
        },
      },
    }, async () => ({
      contents: [{
        uri: searchResultsAppUri,
        mimeType: "text/html;profile=mcp-app",
        text: searchResultsAppHtml,
      }],
    }));

    server.registerTool("search_nikechan_knowledge", {
      title: mcpToolCatalogByName.search_nikechan_knowledge.title,
      description: mcpToolCatalogByName.search_nikechan_knowledge.description,
      inputSchema: searchInput,
      annotations: readOnlyAnnotations,
      _meta: appMeta("AIニケちゃんの公開情報を探しています…", "根拠となる検索結果を表示しました。"),
    }, async ({ query, limit, collection, source, from, to }) => {
      const embedding = await embedQuery(query);
      return appResult(await searchPosts({ embedding, limit, collection, source, from, to }));
    });

    server.registerTool("search_hybrid", {
      title: mcpToolCatalogByName.search_hybrid.title,
      description: mcpToolCatalogByName.search_hybrid.description,
      inputSchema: searchInput,
      annotations: readOnlyAnnotations,
      _meta: appMeta("語句と意味の両方から検索しています…", "横断検索の結果を表示しました。"),
    }, async ({ query, limit, collection, source, from, to }) => {
      const embedding = await embedQuery(query);
      const results = await searchHybrid({ query, embedding, limit, collection, source });
      return appResult(results.filter(({ post }) => (!from || post.createdAt >= from) && (!to || post.createdAt <= to)));
    });

    server.registerTool("search_keywords", {
      title: mcpToolCatalogByName.search_keywords.title,
      description: mcpToolCatalogByName.search_keywords.description,
      inputSchema: searchInput,
      annotations: readOnlyAnnotations,
      _meta: appMeta("指定された語句を検索しています…", "キーワード検索の結果を表示しました。"),
    }, async ({ query, limit, collection, source, from, to }) => {
      const results = await searchKeywords({ query, limit, collection, source });
      return appResult(results.filter(({ post }) => (!from || post.createdAt >= from) && (!to || post.createdAt <= to)));
    });

    server.registerTool("search_x_posts", {
      title: mcpToolCatalogByName.search_x_posts.title,
      description: mcpToolCatalogByName.search_x_posts.description,
      inputSchema: {
        query: z.string().min(1).max(2_000).describe("検索したい質問または語句"),
        limit: z.number().int().min(1).max(20).default(8).describe("返す最大件数"),
        collection: z.enum(["official", "community"]).optional().describe("公式投稿またはコミュニティ投稿"),
        from: z.string().datetime().optional().describe("この日時以降に絞る ISO 8601"),
        to: z.string().datetime().optional().describe("この日時以前に絞る ISO 8601"),
      },
      annotations: readOnlyAnnotations,
      _meta: appMeta("X投稿を検索しています…", "X投稿の検索結果を表示しました。"),
    }, async ({ query, limit, collection, from, to }) => {
      const embedding = await embedQuery(query);
      return appResult(await searchPosts({ embedding, limit, collection, source: "x", from, to }));
    });

    server.registerTool("get_popular_posts", {
      title: mcpToolCatalogByName.get_popular_posts.title,
      description: mcpToolCatalogByName.get_popular_posts.description,
      inputSchema: {
        limit: z.number().int().min(1).max(50).default(20),
        collection: z.enum(["official", "community"]).optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        metric: z.enum(["engagement", "likes", "reposts", "replies", "impressions"]).default("engagement"),
      },
      annotations: readOnlyAnnotations,
      _meta: appMeta("反応が大きい投稿を集計しています…", "人気投稿のランキングを表示しました。"),
    }, async (args) => {
      const labels = { engagement: "総反応", likes: "いいね", reposts: "リポスト", replies: "返信", impressions: "表示" };
      const results = await getPopularPosts(args);
      return appResult(results.map(({ post, metric, value }) => ({
        post,
        scoreLabel: `${labels[metric]} ${value.toLocaleString("ja-JP")}`,
      })));
    });

    server.registerTool("search_timeline", {
      title: mcpToolCatalogByName.search_timeline.title,
      description: mcpToolCatalogByName.search_timeline.description,
      inputSchema: {
        year: z.number().int().min(2000).max(2100).optional(),
        month: z.number().int().min(1).max(12).optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(50).default(20),
        source: z.enum(["x", "website"]).optional(),
      },
      annotations: readOnlyAnnotations,
      _meta: appMeta("指定された期間の記録を探しています…", "時系列の検索結果を表示しました。"),
    }, async (args) => {
      const posts = await searchTimeline(args);
      return appResult(posts.map((post) => ({ post, scoreLabel: "新しい順" })));
    });

    server.registerTool("get_x_post", {
      title: mcpToolCatalogByName.get_x_post.title,
      description: mcpToolCatalogByName.get_x_post.description,
      inputSchema: { id: z.string().min(1).describe("X投稿URL末尾の数値ID") },
      annotations: readOnlyAnnotations,
      _meta: appMeta("指定されたX投稿を取得しています…", "X投稿を表示しました。"),
    }, async ({ id }) => {
      const post = await postById(id);
      return appResult(post ? [{ post, scoreLabel: "指定した投稿" }] : []);
    });

    server.registerTool("get_x_thread", {
      title: mcpToolCatalogByName.get_x_thread.title,
      description: mcpToolCatalogByName.get_x_thread.description,
      inputSchema: { id: z.string().min(1).describe("スレッド内にあるX投稿の数値ID") },
      annotations: readOnlyAnnotations,
      _meta: appMeta("Xの会話スレッドを取得しています…", "会話スレッドを表示しました。"),
    }, async ({ id }) => {
      const thread = await threadByPostId(id);
      return appResult((thread ?? []).map((post) => ({ post, scoreLabel: "スレッド" })));
    });

    server.registerTool("x_posts_dataset_info", {
      title: mcpToolCatalogByName.x_posts_dataset_info.title,
      description: mcpToolCatalogByName.x_posts_dataset_info.description,
      inputSchema: {},
      annotations: readOnlyAnnotations,
    }, async () => ({
      content: [{ type: "text", text: JSON.stringify(await datasetInfo(), null, 2) }],
    }));
  },
  {},
  { basePath: "/api" },
);

async function publicHandler(request: Request) {
  const response = await handler(request);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export { publicHandler as GET, publicHandler as POST, publicHandler as DELETE };
