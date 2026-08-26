import { z } from "zod";
import {
  fixedToolTrials,
  normalizeMcpToolResult,
  parseMcpWireResponse,
  type TrialToolName,
} from "@/src/lib/mcp-tool-trial";

export const runtime = "nodejs";
export const maxDuration = 60;

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

const buckets = new Map<string, { count: number; resetsAt: number }>();
const publicMcpServerUrl = "https://ai-nikechan-mcp.vercel.app/api/mcp";

function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
}

function isRateLimited(request: Request) {
  const key = clientAddress(request);
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + 60_000 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > 20;
}

function mcpServerUrl(request: Request) {
  const configured = process.env.MCP_SERVER_URL?.trim();
  if (configured) return configured;
  const requestUrl = new URL(request.url);
  if (requestUrl.protocol !== "https:") return publicMcpServerUrl;
  return new URL("/api/mcp", requestUrl).toString();
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return Response.json({ error: "試行回数が多いため、1分ほど待ってからもう一度お試しください。" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "利用できるツールを選んでください。" }, { status: 400 });
  }

  const tool = parsed.data.tool as TrialToolName;
  const trial = fixedToolTrials[tool];

  try {
    const response = await fetch(mcpServerUrl(request), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: { name: tool, arguments: trial.arguments },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });

    const raw = await response.text();
    if (!response.ok) throw new Error(`MCPへの接続に失敗しました (${response.status})`);
    const normalized = normalizeMcpToolResult(parseMcpWireResponse(raw));
    return Response.json({
      tool,
      queryLabel: trial.queryLabel,
      arguments: trial.arguments,
      count: normalized.results.length || (normalized.info ? Object.keys(normalized.info).length : 0),
      ...normalized,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "MCPツールを実行できませんでした。",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
