import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { embedQuery } from "@/src/lib/openai";
import { datasetInfo, getPopularPosts, postById, searchHybrid, searchKeywords, searchPosts, searchTimeline, threadByPostId } from "@/src/lib/vector-store";

const handler = createMcpHandler(
  (server) => {
    server.tool("get_popular_posts", "反応数でバズったX投稿を探す。意味検索ではなく人気順が必要なときに使い、期間・投稿区分・指標は必要な場合だけ指定する。", { limit: z.number().int().min(1).max(50).default(20), collection: z.enum(["official", "community"]).optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional(), metric: z.enum(["engagement", "likes", "reposts", "replies", "impressions"]).default("engagement") }, async (args) => ({ content: [{ type: "text", text: JSON.stringify(await getPopularPosts(args), null, 2) }] }));
    server.tool("search_timeline", "年・月・期間でAIニケちゃんの記録を絞り、新しい順に返します。", { year: z.number().int().min(2000).max(2100).optional(), month: z.number().int().min(1).max(12).optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional(), limit: z.number().int().min(1).max(50).default(20), source: z.enum(["x", "website"]).optional() }, async (args) => ({ content: [{ type: "text", text: JSON.stringify(await searchTimeline(args), null, 2) }] }));
    const searchInput = {
      query: z.string().min(1).max(2_000).describe("検索したい質問または語句"),
      limit: z.number().int().min(1).max(20).default(8).describe("返す最大件数"),
      collection: z.enum(["official", "community", "official_site"]).optional().describe("情報コレクションの絞り込み"),
      source: z.enum(["x", "website"]).optional().describe("情報源の絞り込み"),
      from: z.string().datetime().optional().describe("この日時以降に絞る ISO 8601"),
      to: z.string().datetime().optional().describe("この日時以前に絞る ISO 8601"),
    };
    server.tool("search_keywords", "固有名詞、ハッシュタグ、製品名を完全一致・部分一致で検索します。", searchInput, async ({ query, limit, collection, source }) => ({ content: [{ type: "text", text: JSON.stringify(await searchKeywords({ query, limit, collection, source }), null, 2) }] }));
    server.tool("search_hybrid", "通常はこちらを優先する。固有名詞・ハッシュタグの一致と、言い換えを含む意味の近さを組み合わせて検索する。返却されたURLと情報源を回答の根拠にする。", searchInput, async ({ query, limit, collection, source }) => { const embedding = await embedQuery(query); return { content: [{ type: "text", text: JSON.stringify(await searchHybrid({ query, embedding, limit, collection, source }), null, 2) }] }; });

    server.tool("search_nikechan_knowledge", "AIニケちゃんのX投稿と公式サイトを横断して意味検索します。回答の根拠には返された情報源とURLを使ってください。", searchInput, async ({ query, limit, collection, source, from, to }) => {
      const embedding = await embedQuery(query);
      const results = await searchPosts({ embedding, limit, collection, source, from, to });
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    });

    server.tool("search_x_posts", "X投稿だけを意味検索します。回答の根拠には返された投稿のURLと日時を使ってください。", {
      query: z.string().min(1).max(2_000).describe("検索したい質問または語句"),
      limit: z.number().int().min(1).max(20).default(8).describe("返す最大件数"),
      collection: z.enum(["official", "community"]).optional().describe("投稿コレクションの絞り込み"),
      from: z.string().datetime().optional().describe("この日時以降に絞る ISO 8601"),
      to: z.string().datetime().optional().describe("この日時以前に絞る ISO 8601"),
    }, async ({ query, limit, collection, from, to }) => {
      const embedding = await embedQuery(query);
      const results = await searchPosts({ embedding, limit, collection, source: "x", from, to });
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    });

    server.tool("get_x_post", "X投稿IDを指定して、検索結果の投稿本文とメタデータを取得します。", {
      id: z.string().min(1).describe("X投稿ID"),
    }, async ({ id }) => {
      const post = await postById(id);
      return { content: [{ type: "text", text: post ? JSON.stringify(post, null, 2) : "該当する投稿はありません。" }] };
    });
    server.tool("get_x_thread", "X投稿IDから同じ会話スレッドの投稿を時系列で取得します。", { id: z.string().min(1).describe("スレッド内のX投稿ID") }, async ({ id }) => {
      const thread = await threadByPostId(id);
      return { content: [{ type: "text", text: thread ? JSON.stringify(thread, null, 2) : "該当するX投稿またはスレッドがありません。" }] };
    });

    server.tool("x_posts_dataset_info", "検索インデックスに含まれる情報件数、作成日時、コレクション別件数を返します。", {}, async () => {
      return { content: [{ type: "text", text: JSON.stringify(await datasetInfo(), null, 2) }] };
    });
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
