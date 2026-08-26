import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  fixedToolTrials,
  normalizeMcpToolResult,
  parseMcpWireResponse,
  type ToolTrialCache,
  type ToolTrialResponse,
  type TrialToolName,
} from "../src/lib/mcp-tool-trial";

const root = process.cwd();
const sourceUrl = process.env.MCP_SERVER_URL?.trim() || "https://ai-nikechan-mcp.vercel.app/api/mcp";
const outputDirectory = path.join(root, "src", "generated");
const output = path.join(outputDirectory, "tool-trial-results.json");
const temporaryOutput = `${output}.tmp`;
const previewEndpoint = new URL("/api/preview", sourceUrl);

type Preview = { title?: string; description?: string; image?: string };
const previews = new Map<string, Promise<Preview>>();

function fetchPreview(url: string) {
  const existing = previews.get(url);
  if (existing) return existing;
  const request: Promise<Preview> = fetch(`${previewEndpoint}?url=${encodeURIComponent(url)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  }).then(async (response): Promise<Preview> => response.ok ? await response.json() as Preview : {}).catch(() => ({}));
  previews.set(url, request);
  return request;
}

async function includePreviews(response: ToolTrialResponse) {
  response.results = await Promise.all(response.results.map(async (result) => {
    if (result.post.previewImage && result.post.previewTitle) return result;
    const preview = await fetchPreview(result.post.url);
    return {
      ...result,
      post: {
        ...result.post,
        ...(result.post.previewTitle || !preview.title ? {} : { previewTitle: preview.title }),
        ...(result.post.previewDescription || !preview.description ? {} : { previewDescription: preview.description }),
        ...(result.post.previewImage || !preview.image ? {} : { previewImage: preview.image }),
      },
    };
  }));
  return response;
}

async function requestTrial(tool: TrialToolName): Promise<ToolTrialResponse> {
  const trial = fixedToolTrials[tool];
  const response = await fetch(sourceUrl, {
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
    signal: AbortSignal.timeout(45_000),
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`${tool}: MCPへの接続に失敗しました (${response.status})`);
  const normalized = normalizeMcpToolResult(parseMcpWireResponse(raw));
  return {
    tool,
    queryLabel: trial.queryLabel,
    arguments: trial.arguments,
    count: normalized.results.length || (normalized.info ? Object.keys(normalized.info).length : 0),
    ...normalized,
  };
}

async function runTrial(tool: TrialToolName) {
  let latest: ToolTrialResponse | null = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    latest = await requestTrial(tool);
    if (latest.results.length || latest.info) return latest;
    console.warn(`${tool}: empty result (${attempt}/5)`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 300));
  }
  return latest as ToolTrialResponse;
}

async function main() {
  if (!sourceUrl.startsWith("https://")) throw new Error("MCP_SERVER_URLにはHTTPS URLを指定してください。");
  const entries: [TrialToolName, ToolTrialResponse][] = [];

  for (const tool of Object.keys(fixedToolTrials) as TrialToolName[]) {
    const response = await includePreviews(await runTrial(tool));
    if (!response.results.length && !response.info) {
      throw new Error(`${tool}: 固定クエリの結果が空のためキャッシュを更新しませんでした。`);
    }
    entries.push([tool, response]);
    console.log(`Cached ${tool}: ${response.count}`);
  }

  const cache: ToolTrialCache = {
    generatedAt: new Date().toISOString(),
    sourceUrl,
    responses: Object.fromEntries(entries) as Record<TrialToolName, ToolTrialResponse>,
  };

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(temporaryOutput, `${JSON.stringify(cache, null, 2)}\n`);
  await rename(temporaryOutput, output);
  console.log(`Wrote ${path.relative(root, output)}`);
}

main().catch(async (error) => {
  await unlink(temporaryOutput).catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
});
