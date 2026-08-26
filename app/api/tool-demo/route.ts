import { z } from "zod";
import toolTrialCacheJson from "@/src/generated/tool-trial-results.json";
import type { ToolTrialCache, TrialToolName } from "@/src/lib/mcp-tool-trial";

export const runtime = "nodejs";
const toolTrialCache = toolTrialCacheJson as unknown as ToolTrialCache;

const bodySchema = z.object({
  tool: z.enum([
    "search_nikechan_knowledge",
    "search_hybrid",
    "search_keywords",
    "search_x_posts",
    "get_popular_posts",
    "search_timeline",
    "get_x_post",
    "get_x_thread",
    "x_posts_dataset_info",
  ]),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "利用できるツールを選んでください。" }, { status: 400 });
  }

  const tool = parsed.data.tool as TrialToolName;
  const response = toolTrialCache.responses[tool];
  if (!response) {
    return Response.json({ error: "このツールの事前取得結果がありません。" }, { status: 404 });
  }
  return Response.json(response, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
