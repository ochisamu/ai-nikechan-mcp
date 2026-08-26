import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

const baseUrl = process.env.DEMO_BASE_URL || "http://localhost:3000";
const output = resolve(process.argv[2] || "artifacts/social/ai-nikechan-mcp-x-demo.mp4");
const poster = resolve(process.argv[3] || "artifacts/social/ai-nikechan-mcp-ogp.png");
const narration = resolve(process.env.NARRATION_PATH || "artifacts/social/ai-nikechan-mcp-narration.m4a");
const narrationTimelinePath = resolve(process.env.NARRATION_TIMELINE_PATH || "artifacts/social/ai-nikechan-mcp-narration.json");
const chromePath = process.env.CHROME_PATH || "google-chrome";
const devtoolsPort = Number(process.env.CHROME_DEBUG_PORT || 9338);
const captureFps = 20;
const frameInterval = 1000 / captureFps;

if (!existsSync(narration) || !existsSync(narrationTimelinePath)) {
  throw new Error("ナレーションがありません。先に npm run narrate:x-demo を実行してください。");
}
const narrationTimeline = JSON.parse(await readFile(narrationTimelinePath, "utf8"));
const narrationSegments = new Map(narrationTimeline.segments.map((segment) => [segment.id, segment]));

const workingDirectory = await mkdtemp(`${tmpdir()}/ai-nikechan-x-video-`);
const framesDirectory = resolve(workingDirectory, "frames");
await mkdir(framesDirectory, { recursive: true });
await mkdir(dirname(output), { recursive: true });
await mkdir(dirname(poster), { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--hide-scrollbars",
  "--autoplay-policy=no-user-gesture-required",
  `--remote-debugging-port=${devtoolsPort}`,
  `--user-data-dir=${resolve(workingDirectory, "chrome")}`,
  "--window-size=1280,720",
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

async function devtoolsPage() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`).then((response) => response.json());
      const page = pages.find((item) => item.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("Chrome DevToolsへ接続できませんでした。");
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
  }

  async open() {
    await new Promise((resolveOpen, reject) => {
      this.socket.addEventListener("open", resolveOpen, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolveSend, reject) => {
      this.pending.set(id, { resolve: resolveSend, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
let client;
let recording = true;
let frameNumber = 0;
let captureStartedAt = 0;
let captureStoppedAt = 0;

async function evaluate(expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  return response.result.value;
}

async function navigate(path) {
  await client.send("Page.navigate", { url: new URL(path, baseUrl).toString() });
  await delay(1600);
  await evaluate("document.fonts.ready.then(()=>true)");
  await injectCaptureUi();
}

async function injectCaptureUi() {
  const captureCss = `
#capture-ui{position:fixed;z-index:2147483647;inset:0;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans",sans-serif}
#capture-label{position:absolute;max-width:620px;padding:13px 19px 13px 43px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(16,14,25,.76);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:0 16px 42px rgba(0,0,0,.28);color:#fff;font-size:18px;font-weight:720;letter-spacing:.005em;opacity:0;transform:translateY(-8px) scale(.985);transition:opacity .3s ease,transform .42s cubic-bezier(.2,.8,.2,1)}
#capture-label:before{position:absolute;left:15px;top:50%;width:17px;height:17px;border-radius:50%;background:linear-gradient(145deg,#a47aff,#5fcbd2);box-shadow:0 0 0 5px rgba(152,116,244,.14);content:"";transform:translateY(-50%)}
#capture-label.top-left{left:28px;top:88px}.top-right{right:28px;top:88px}.bottom-left{left:28px;bottom:28px}.bottom-right{right:28px;bottom:28px}
#capture-label.show{opacity:1;transform:translateY(0) scale(1)}
#capture-cursor{position:absolute;left:50%;top:50%;width:28px;height:28px;border:2px solid rgba(255,255,255,.94);border-radius:50%;background:rgba(142,104,235,.34);box-shadow:0 5px 20px rgba(0,0,0,.35),0 0 0 7px rgba(143,105,235,.13);transform:translate(-50%,-50%);transition:left .55s cubic-bezier(.2,.8,.2,1),top .55s cubic-bezier(.2,.8,.2,1),transform .16s ease}
#capture-cursor.tap{transform:translate(-50%,-50%) scale(.68)}
#capture-cursor span{position:absolute;inset:-14px;border:1px solid rgba(160,125,255,.55);border-radius:50%;opacity:0}
#capture-cursor.tap span{animation:capture-pulse .55s ease-out}
@keyframes capture-pulse{from{opacity:1;transform:scale(.45)}to{opacity:0;transform:scale(1.2)}}`;
  await evaluate(`(()=>{
    document.getElementById('capture-ui')?.remove();
    const root=document.createElement('div');
    root.id='capture-ui';
    root.innerHTML='<div id="capture-label"></div><div id="capture-cursor"><span></span></div>';
    const style=document.createElement('style');
    style.textContent=${JSON.stringify(captureCss)};
    root.appendChild(style);document.body.appendChild(root);return true;
  })()`);
}

async function showLabel(text, placement = "top-left") {
  await evaluate(`(()=>{const label=document.getElementById('capture-label');label.textContent=${JSON.stringify(text)};label.className=${JSON.stringify(placement)};requestAnimationFrame(()=>label.classList.add('show'));return true})()`);
}

async function hideLabel() {
  await evaluate("(()=>{document.getElementById('capture-label')?.classList.remove('show');return true})()");
}

async function moveAndClick(expression) {
  const point = await evaluate(`(()=>{const element=${expression};if(!element)return null;const rect=element.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2}})()`);
  if (!point) return false;
  await evaluate(`(()=>{const cursor=document.getElementById('capture-cursor');cursor.style.left='${point.x}px';cursor.style.top='${point.y}px';return true})()`);
  await delay(650);
  await evaluate(`(()=>{const cursor=document.getElementById('capture-cursor');cursor.classList.add('tap');const element=${expression};element?.click();setTimeout(()=>cursor.classList.remove('tap'),300);return Boolean(element)})()`);
  await delay(500);
  return true;
}

async function scrollElement(expression, deltaY) {
  const point = await evaluate(`(()=>{const element=${expression};if(!element)return null;const rect=element.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+Math.min(rect.height/2,260)}})()`);
  if (!point) return false;
  await evaluate(`(()=>{const cursor=document.getElementById('capture-cursor');cursor.style.left='${point.x}px';cursor.style.top='${point.y}px';return true})()`);
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
  });
  await delay(450);
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x: point.x,
    y: point.y,
    deltaX: 0,
    deltaY,
  });
  await delay(650);
  return true;
}

async function waitFor(expression, timeout = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return true;
    await delay(250);
  }
  return false;
}

async function waitUntilTimeline(seconds) {
  const remaining = captureStartedAt + seconds * 1000 - Date.now();
  if (remaining > 0) await delay(remaining);
}

async function playScene(id, placement, action) {
  const segment = narrationSegments.get(id);
  if (!segment) throw new Error(`ナレーション区間がありません: ${id}`);
  await waitUntilTimeline(segment.startSeconds);
  await showLabel(segment.caption, placement);
  await action(segment);
  await waitUntilTimeline(segment.endSeconds);
  await hideLabel();
}

async function captureFrames() {
  captureStartedAt = Date.now();
  while (recording) {
    const startedAt = Date.now();
    let capture = null;
    try {
      capture = await Promise.race([
        client.send("Page.captureScreenshot", {
          format: "jpeg",
          quality: 84,
          fromSurface: true,
          captureBeyondViewport: false,
        }),
        delay(1500).then(() => null),
      ]);
    } catch (error) {
      if (recording && /Not attached to an active page|Execution context was destroyed/i.test(String(error?.message || error))) {
        await delay(120);
        continue;
      }
      throw error;
    }
    if (!capture) continue;
    const jpeg = Buffer.from(capture.data, "base64");
    const targetFrame = Math.max(frameNumber, Math.round((Date.now() - captureStartedAt) / frameInterval));
    const writes = [];
    while (frameNumber <= targetFrame) {
      const filename = `frame-${String(frameNumber).padStart(6, "0")}.jpg`;
      writes.push(writeFile(resolve(framesDirectory, filename), jpeg));
      frameNumber += 1;
    }
    await Promise.all(writes);
    await delay(Math.max(0, frameInterval - (Date.now() - startedAt)));
  }
}

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const process = spawn(command, args, { stdio: "inherit" });
    process.once("error", reject);
    process.once("exit", (code) => code === 0 ? resolveRun() : reject(new Error(`${command} exited with ${code}`)));
  });
}

try {
  const health = await fetch(baseUrl);
  if (!health.ok) throw new Error(`${baseUrl} が応答していません。先に本番ビルドのサーバーを起動してください。`);

  const page = await devtoolsPage();
  client = new CdpClient(page.webSocketDebuggerUrl);
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

  await navigate("/demo");
  const frameCapture = captureFrames();
  await playScene("intro", "top-left", async () => {
    await delay(3600);
    await navigate("/setup");
  });

  await playScene("connection", "top-right", async () => {
    await delay(400);
    await moveAndClick("document.querySelector('[aria-label=\"MCP接続先\"] button')");
    await delay(500);
    await evaluate("document.querySelector('#clients').scrollIntoView({behavior:'smooth',block:'start'});true");
    await delay(900);
    await moveAndClick("[...document.querySelectorAll('[role=\"tab\"]')].find(button=>button.textContent.includes('Claude Code'))");
    await moveAndClick("[...document.querySelectorAll('[role=\"tab\"]')].find(button=>button.textContent.includes('CharaDock'))");
    await moveAndClick("[...document.querySelectorAll('[role=\"tab\"]')].find(button=>button.textContent.includes('Codex Desktop'))");
  });

  await playScene("tools", "top-right", async () => {
    await evaluate("document.querySelector('#tools').scrollIntoView({behavior:'smooth',block:'start'});true");
    await delay(1100);
    await moveAndClick("document.querySelectorAll('[role=\"list\"] button')[0]");
  });

  await playScene("trial", "top-right", async () => {
    await moveAndClick("[...document.querySelectorAll('button')].find(button=>button.textContent.includes('このツールを試す'))");
    const completed = await waitFor("document.querySelector('[class*=\"trialReceipt\"]')", 20_000);
    if (completed) {
      await evaluate("document.querySelector('[class*=\"trialReceipt\"]')?.scrollIntoView({behavior:'smooth',block:'center'});true");
      await delay(600);
      await moveAndClick("document.querySelector('[class*=\"trialReceipt\"] button')");
      await waitFor("document.querySelector('[class*=\"trialResults\"]')", 5_000);
      await evaluate("document.querySelector('[class*=\"trialResults\"]')?.scrollIntoView({behavior:'smooth',block:'center'});true");
      await delay(2100);
    }
    await navigate("/demo");
  });

  await playScene("chat", "top-left", async () => {
    await delay(500);
    await moveAndClick("[...document.querySelectorAll('.suggestions button')].find(button=>button.textContent.includes('最近のテーマ'))");
    const answered = await waitFor("!document.querySelector('.loading-message')&&document.querySelectorAll('.message-row').length>=3", 45_000);
    if (!answered) await showLabel("回答を取得しています…", "top-left");
    await delay(800);
  });

  await playScene("apps", "top-left", async () => {
    const hasApp = await evaluate("Boolean(document.querySelector('.mcp-app-launch'))");
    if (hasApp) {
      await evaluate("document.querySelector('.mcp-app-launch')?.scrollIntoView({behavior:'smooth',block:'center'});true");
      await delay(650);
      await moveAndClick("document.querySelector('.mcp-app-launch')");
      await waitFor("document.querySelector('.mcp-app-frame')", 5_000);
      await delay(850);
      await scrollElement("document.querySelector('.mcp-app-frame')", 680);
      await delay(700);
      await scrollElement("document.querySelector('.mcp-app-frame')", 680);
      await delay(700);
      await scrollElement("document.querySelector('.mcp-app-frame')", 680);
    }
    const segment = narrationSegments.get("apps");
    if (segment) await waitUntilTimeline(Math.max(segment.startSeconds, segment.endSeconds - 1.7));
    await navigate("/setup");
  });

  await playScene("cta", "bottom-left", async () => {
    await delay(700);
    const point = await evaluate(`(()=>{const element=document.querySelector('a[href="#clients"]');if(!element)return null;const rect=element.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2}})()`);
    if (point) await evaluate(`(()=>{const cursor=document.getElementById('capture-cursor');cursor.style.left='${point.x}px';cursor.style.top='${point.y}px';return true})()`);
  });

  await waitUntilTimeline(narrationTimeline.totalDurationSeconds);

  captureStoppedAt = Date.now();
  recording = false;
  await frameCapture;

  const posterResponse = await fetch(new URL("/opengraph-image", baseUrl));
  if (!posterResponse.ok) throw new Error("OGP画像を保存できませんでした。");
  await writeFile(poster, Buffer.from(await posterResponse.arrayBuffer()));

  await run("ffmpeg", [
    "-y",
    "-framerate", String(captureFps),
    "-i", resolve(framesDirectory, "frame-%06d.jpg"),
    "-i", narration,
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-shortest",
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level", "4.0",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-crf", "19",
    "-maxrate", "8M",
    "-bufsize", "16M",
    "-movflags", "+faststart",
    "-c:a", "aac",
    "-b:a", "128k",
    output,
  ]);

  process.stdout.write(`\nCreated ${output}\nCreated ${poster}\nNarration: ${narrationTimeline.voice}\nFrames: ${frameNumber}\n`);
} finally {
  recording = false;
  client?.close();
  chrome.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => chrome.once("exit", resolveExit)),
    delay(1500),
  ]);
  await rm(workingDirectory, { recursive: true, force: true }).catch(() => {});
}
