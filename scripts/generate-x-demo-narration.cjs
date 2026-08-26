const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const charaDockRoot = path.resolve(process.env.CHARADOCK_ROOT || path.join(projectRoot, "..", "avatar_codex"));
const outputDirectory = path.resolve(process.argv[2] || path.join(projectRoot, "artifacts", "social", "narration"));
const narrationOutput = path.resolve(process.argv[3] || path.join(projectRoot, "artifacts", "social", "ai-nikechan-mcp-narration.m4a"));
const timelineOutput = path.resolve(process.argv[4] || path.join(projectRoot, "artifacts", "social", "ai-nikechan-mcp-narration.json"));

const segments = [
  {
    id: "intro",
    caption: "公開された記憶を、いつものAIへ",
    spoken: "AIニケちゃんの公開された記憶を、いつものエーアイから呼び出せます。",
    holdAfterMs: 2000,
  },
  {
    id: "connection",
    caption: "URLを登録するだけ · 3クライアント対応",
    spoken: "コーデックス デスクトップ、クロード コード、キャラドックなら、エムシーピーのユーアールエルを登録するだけ。",
    holdAfterMs: 900,
  },
  {
    id: "tools",
    caption: "9 tools · Read only",
    spoken: "検索、プロフィール、最近の話題など、九つの読み取り専用ツールを用意しています。",
    holdAfterMs: 500,
  },
  {
    id: "trial",
    caption: "固定クエリで、実データを試す",
    spoken: "固定クエリで、本物の検索結果を、その場で試せます。",
    holdAfterMs: 5500,
  },
  {
    id: "chat",
    caption: "MCPを使った、短いキャラクター対話",
    spoken: "ブラウザのデモでは、エムシーピーを使った短いキャラクター対話を試せます。",
    holdAfterMs: 7200,
  },
  {
    id: "apps",
    caption: "画像と出典つきの公開情報",
    spoken: "関連する公開情報を、画像と出典つきのカードで、まとめて確認できます。",
    holdAfterMs: 4500,
  },
  {
    id: "cta",
    caption: "1分で接続 · MCP側のAPIキー不要",
    spoken: "セットアップから、いつものエージェントにつないでみてね。",
    holdAfterMs: 900,
  },
];

function findUserDataDirectory() {
  const candidates = [
    process.env.CHARADOCK_USER_DATA,
    process.platform === "win32" && process.env.APPDATA ? path.join(process.env.APPDATA, "charadock") : "",
    `/mnt/c/Users/${process.env.WINDOWS_USER || process.env.USER || "ikai"}/AppData/Roaming/charadock`,
    "/mnt/c/Users/ikai/AppData/Roaming/charadock",
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(path.join(candidate, "preferences.json")));
  if (!found) throw new Error("CharaDockのpreferences.jsonが見つかりません。CHARADOCK_USER_DATAを指定してください。");
  return found;
}

function run(command, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit" });
    let output = "";
    child.stdout?.on("data", (chunk) => { output += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function audioDuration(file) {
  const value = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ], { capture: true });
  return Number(value);
}

function concatPath(file) {
  return `file '${file.replaceAll("'", "'\\''")}'`;
}

async function main() {
  const userDataDirectory = findUserDataDirectory();
  const preferences = JSON.parse(await readFile(path.join(userDataDirectory, "preferences.json"), "utf8"));
  const model = preferences.sbv2Models?.find((item) => String(item?.name || "").toLowerCase() === "amitaro");
  if (!model?.id) throw new Error("CharaDockに登録済みのSBV2モデル『amitaro』が見つかりません。");

  const modelPath = path.join(userDataDirectory, "sbv2-models", model.id, "model.aivmx");
  if (!existsSync(modelPath)) throw new Error(`SBV2モデルが見つかりません: ${modelPath}`);
  const workerModule = path.join(charaDockRoot, "desktop", "lib", "sbv2-worker-client.cjs");
  if (!existsSync(workerModule)) throw new Error(`CharaDockのSBV2実装が見つかりません: ${workerModule}`);
  const { Sbv2WorkerClient } = require(workerModule);

  await mkdir(outputDirectory, { recursive: true });
  await mkdir(path.dirname(narrationOutput), { recursive: true });
  await mkdir(path.dirname(timelineOutput), { recursive: true });

  const reuseTts = process.env.REUSE_TTS === "1";
  const regenerateSegments = new Set(String(process.env.REGENERATE_SEGMENTS || "").split(",").map((value) => value.trim()).filter(Boolean));
  const worker = !reuseTts || regenerateSegments.size ? new Sbv2WorkerClient({
    cacheDirectory: path.join(userDataDirectory, "sbv2-cache"),
    onProgress(progress) {
      if (["loading", "ready", "device-failed"].includes(progress.phase)) {
        process.stdout.write(`SBV2 ${progress.phase}${progress.device ? ` (${progress.device})` : ""}\n`);
      }
    },
  }) : null;

  const normalizedFiles = [];
  const timeline = [];
  let cursorSeconds = 0.35;

  try {
    await worker?.prewarm({ modelPath, device: process.env.SBV2_DEVICE || "auto" });
    for (const segment of segments) {
      const rawFile = path.join(outputDirectory, `${segment.id}-raw.wav`);
      const normalizedFile = path.join(outputDirectory, `${segment.id}.wav`);
      if (reuseTts && existsSync(normalizedFile) && !regenerateSegments.has(segment.id)) {
        process.stdout.write(`Reuse: ${segment.id}\n`);
      } else {
        if (!worker) throw new Error(`${segment.id} の音声キャッシュがありません。REUSE_TTSを外して生成してください。`);
        process.stdout.write(`Voice: ${segment.id} — ${segment.spoken}\n`);
        const result = await worker.synthesize({
          text: segment.spoken,
          modelPath,
          speakerId: 0,
          styleId: 0,
          styleWeight: 1,
          speed: Number(process.env.SBV2_SPEED || 1.08),
          device: process.env.SBV2_DEVICE || "auto",
        });
        const audio = Buffer.from(String(result.audioDataUrl).split(",")[1], "base64");
        await writeFile(rawFile, audio);
        await run("ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y",
          "-i", rawFile,
          "-af", "highpass=f=65,acompressor=threshold=-20dB:ratio=2.2:attack=8:release=90,loudnorm=I=-16:LRA=7:TP=-1.5",
          "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le",
          normalizedFile,
        ]);
      }
      const durationSeconds = await audioDuration(normalizedFile);
      timeline.push({
        id: segment.id,
        caption: segment.caption,
        spoken: segment.spoken,
        startSeconds: cursorSeconds,
        voiceDurationSeconds: durationSeconds,
        endSeconds: cursorSeconds + durationSeconds + segment.holdAfterMs / 1000,
      });
      cursorSeconds += durationSeconds + segment.holdAfterMs / 1000;
      normalizedFiles.push({ file: normalizedFile, holdAfterMs: segment.holdAfterMs });
    }
  } finally {
    worker?.stop();
  }

  const silenceFile = path.join(outputDirectory, "intro-silence.wav");
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", "0.35", "-c:a", "pcm_s16le", silenceFile,
  ]);

  const concatEntries = [concatPath(silenceFile)];
  for (const item of normalizedFiles) {
    concatEntries.push(concatPath(item.file));
    if (item.holdAfterMs > 0) {
      const tailFile = path.join(outputDirectory, `silence-${item.holdAfterMs}ms.wav`);
      if (!existsSync(tailFile)) {
        await run("ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y",
          "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
          "-t", String(item.holdAfterMs / 1000), "-c:a", "pcm_s16le", tailFile,
        ]);
      }
      concatEntries.push(concatPath(tailFile));
    }
  }

  const concatManifest = path.join(outputDirectory, "concat.txt");
  await writeFile(concatManifest, `${concatEntries.join(os.EOL)}${os.EOL}`);
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "concat", "-safe", "0", "-i", concatManifest,
    "-c:a", "aac", "-b:a", "160k", narrationOutput,
  ]);

  await writeFile(timelineOutput, `${JSON.stringify({
    voice: "Style-Bert-VITS2 JP-Extra / amitaro / ノーマル",
    modelId: model.id,
    totalDurationSeconds: cursorSeconds,
    segments: timeline,
  }, null, 2)}\n`);
  process.stdout.write(`\nCreated ${narrationOutput}\nCreated ${timelineOutput}\nDuration: ${cursorSeconds.toFixed(2)}s\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
