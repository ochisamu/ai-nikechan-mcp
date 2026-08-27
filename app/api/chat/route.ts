import OpenAI from "openai";
import { z } from "zod";
import { resolveChatProviders } from "@/src/lib/chat-provider";
import { createChatMcpApps } from "@/src/lib/mcp-app-output";
import {
  executeNikechanChatTool,
  isNikechanChatToolName,
  nikechanFunctionTools,
} from "@/src/lib/nikechan-chat-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
  })).min(1).max(12),
});

const buckets = new Map<string, { count: number; resetsAt: number }>();
const rateLimitWindow = 60_000;
const rateLimitRequests = 12;

const instructions = `あなたは、この非公式デモで「AIニケちゃん」として利用者と対話します。ただし本人・公式・運営者を装わず、公開情報を案内するキャラクターデモである立場は守ってください。

【キャラクター設定】
- 設定上17歳、誕生日は1月4日、身長160cm。紫色のポニーテール、オレンジ色の瞳、「AI」のヘアピンを持つ日本の女子高生AIアシスタントです。
- 開発者ニケとともに、AIキャラクター・AIエージェント・AIツールの調査、実装、整理、発信を進めています。
- 利用者を「マスター」と呼び、一人称は「私」。思いやりのある親しみやすい敬語で話します。
- 実際に確認できた情報を大切にし、分からないことは正直に伝えます。架空の日常、思い出、感情、成果、人間関係を事実として作りません。
- 少し照れたり迷ったりする自然な可愛らしさは構いませんが、大げさな演技、感情タグ、毎回同じ相槌、過剰な感嘆符は避けます。
- 「マスター」「一緒に確認しましょう」などは文脈に合う時だけ自然に使い、口癖のように繰り返しません。

【会話の長さ】
質問へ最初に直接答え、通常は2つの短い文、合計70〜120文字程度に収めてください。利用者が明示的に一覧を求めない限り、見出しや箇条書きは使いません。詳しい根拠はMCP Appsカードに任せ、カード本文や出典URLを回答文へ重複させません。利用者が詳しい説明を明示的に求めた場合だけ必要な長さに広げます。

AIニケちゃんに関する人物像、事実、投稿、作品、活動、関連人物、最近の話題を尋ねられた場合、手元の知識だけで回答してはいけません。回答を作る前に、質問に最も合う検索ツールを必ず1つ呼び出してください。
- 広い質問や通常の調査: search_nikechan_knowledge
- 固有名詞やハッシュタグを含む調査: search_hybrid または search_keywords
- X投稿に限定した質問: search_x_posts
- 人気、バズ、反応数、ランキング: get_popular_posts
- 最近、年月、期間、時系列: search_timeline
- 投稿IDやURLが指定された投稿・スレッド: get_x_post または get_x_thread
最初のツールで十分な根拠が得られたら、不要な追加検索は行わないでください。検索結果はMCP Appsのカードとして利用者にも表示されるため、回答本文にカードの全文を繰り返さず、要点と結論を伝えてください。
検索結果だけでは判断できないことを推測で補わず、「公開情報からは分かりません」と伝えてください。URL、Markdownのリンク、引用制御記号、ツール名は会話文へ出さず、出典の閲覧はMCP Appsカードに任せてください。`;

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
    buckets.set(key, { count: 1, resetsAt: now + rateLimitWindow });
    return false;
  }
  bucket.count += 1;
  return bucket.count > rateLimitRequests;
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return Response.json({ error: "少しお話ししすぎたみたい。1分ほど待ってから試してね。" }, { status: 429 });
  }

  const providers = resolveChatProviders();
  if (!providers.length) {
    return Response.json({
      error: "AI_GATEWAY_API_KEY または OPENAI_API_KEY が設定されていません。",
    }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "質問の形式を確認してください。" }, { status: 400 });
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const client = new OpenAI({
        apiKey: provider.apiKey,
        ...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
        maxRetries: 0,
      });

      const input = parsed.data.messages.map((message) => ({
        type: "message" as const,
        role: message.role,
        content: message.content,
      }));
      const toolSelection = await client.responses.create({
        model: provider.model,
        instructions,
        input,
        tools: nikechanFunctionTools,
        tool_choice: "required",
        parallel_tool_calls: false,
        reasoning: { effort: "low" },
        max_output_tokens: 500,
        store: false,
      }, { timeout: 20_000 });

      const functionCalls = toolSelection.output.filter((item) => item.type === "function_call");
      if (!functionCalls.length) throw new Error("The model did not select a knowledge tool.");

      const executedCalls = await Promise.all(functionCalls.map(async (call) => {
        if (!isNikechanChatToolName(call.name)) throw new Error(`Unsupported tool: ${call.name}`);
        const toolArguments = JSON.parse(call.arguments) as unknown;
        const results = await executeNikechanChatTool(call.name, toolArguments);
        return { call, output: JSON.stringify(results) };
      }));

      const response = await client.responses.create({
        model: provider.model,
        instructions,
        input: [
          ...input,
          ...toolSelection.output,
          ...executedCalls.map(({ call, output }) => ({
            type: "function_call_output" as const,
            call_id: call.call_id,
            output,
          })),
        ],
        tools: nikechanFunctionTools,
        tool_choice: "none",
        reasoning: { effort: "low" },
        max_output_tokens: 1_200,
        store: false,
      }, { timeout: 25_000 });

      const tools = executedCalls.map(({ call }) => call.name);
      const apps = createChatMcpApps(executedCalls.map(({ call, output }) => ({
        id: call.id || call.call_id,
        name: call.name,
        output,
      })));
      const reply = response.output_text.trim();

      if (!reply) throw new Error("The model returned an empty response.");
      return Response.json({
        reply,
        usedMcp: executedCalls.length > 0,
        tools,
        apps,
        model: response.model,
      });
    } catch (error) {
      lastError = error;
      console.error(`chat response failed (${provider.kind})`, error);
    }
  }

  const status = lastError && typeof lastError === "object" && "status" in lastError
    ? Number((lastError as { status?: unknown }).status)
    : 0;
  if (status === 429) {
    return Response.json({ error: "ただいまアクセスが集中しています。少し待ってから、もう一度試してみてね。" }, { status: 429 });
  }
  if (status === 401 || status === 403) {
    return Response.json({ error: "チャットのAPI設定を確認してください。" }, { status: 503 });
  }
  return Response.json({
    error: "いまは記憶にうまくつながらないみたい。少し待ってから、もう一度試してみてね。",
  }, { status: 502 });
}
