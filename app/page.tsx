"use client";

import { FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { searchResultsAppHtml } from "@/src/lib/search-results-app";
import type { ChatMcpApp } from "@/src/lib/mcp-app-output";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  apps?: ChatMcpApp[];
};

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "こんにちは。公開情報をMCPで探しながらお話しできるよ。下の質問か、好きなことを聞いてね。",
};

const sampleQuestions = [
  { label: "どんな存在？", prompt: "AIニケちゃんって、どんな存在なの？公開情報をもとに教えて。" },
  { label: "最近のテーマ", prompt: "AIニケちゃんが最近よく話しているテーマを教えて。" },
  { label: "人気の投稿", prompt: "AIニケちゃんに関する投稿で、特に反応が大きかったものを教えて。" },
  { label: "公式サイト", prompt: "AIニケちゃんの公式サイトから分かることを、出典つきで紹介して。" },
];

const avatarMouthFrames = ["closed", "half", "open"] as const;
const touchPhrases = [
  "はい、マスター。私はここにいますよ。",
  "マスター、どうされましたか？",
  "ふふ、ありがとうございます。",
  "次は何を一緒に確認しましょうか？",
];

const toolLabels: Record<string, string> = {
  search_nikechan_knowledge: "公開情報の検索結果",
  search_hybrid: "語句と意味の横断検索",
  search_keywords: "キーワード検索結果",
  search_x_posts: "X投稿の検索結果",
  get_popular_posts: "人気投稿ランキング",
  search_timeline: "タイムライン検索結果",
  get_x_post: "指定したX投稿",
  get_x_thread: "X会話スレッド",
};

function messageParts(text: string) {
  return text.split(/(https?:\/\/[^\s)\]}>、。]+)/g).map((part, index) => {
    if (!part.startsWith("http")) return part;
    return (
      <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer">
        出典を開く
      </a>
    );
  });
}

function McpAppFrame({ app }: { app: ChatMcpApp }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  function sendToolOutput() {
    frameRef.current?.contentWindow?.postMessage({
      params: { structuredContent: { results: app.results } },
    }, "*");
  }

  return (
    <iframe
      key={app.id}
      ref={frameRef}
      className="mcp-app-frame"
      srcDoc={searchResultsAppHtml}
      title={`${toolLabels[app.tool] ?? app.tool} MCP App`}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      onLoad={sendToolOutput}
    />
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthFrame, setMouthFrame] = useState(0);
  const [status, setStatus] = useState("お話しできます");
  const [activeApp, setActiveApp] = useState<ChatMcpApp | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const speechTimerRef = useRef<number | null>(null);
  const touchIndexRef = useRef(0);
  const chatDragStartRef = useRef<number | null>(null);
  const suppressChatToggleRef = useRef(false);

  const busy = isLoading || isSpeaking;
  const avatarSource = `/avatar/nikechan/eyes-${isBlinking ? "closed" : "open"}-mouth-${avatarMouthFrames[mouthFrame]}.png`;

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isLoading, isChatExpanded]);

  useEffect(() => {
    for (const eyes of ["open", "closed"]) {
      for (const mouth of avatarMouthFrames) {
        const image = new Image();
        image.src = `/avatar/nikechan/eyes-${eyes}-mouth-${mouth}.png`;
      }
    }

    let blinkTimer = 0;
    let reopenTimer = 0;
    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        setIsBlinking(true);
        reopenTimer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 135);
      }, 2800 + Math.random() * 2600);
    };

    scheduleBlink();
    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(reopenTimer);
    };
  }, []);

  useEffect(() => () => {
    requestRef.current?.abort();
    if (speechTimerRef.current) window.clearInterval(speechTimerRef.current);
  }, []);

  function finishSpeaking() {
    if (speechTimerRef.current) window.clearInterval(speechTimerRef.current);
    speechTimerRef.current = null;
    setIsSpeaking(false);
    setMouthFrame(0);
    setStatus("お話しできます");
  }

  function revealReply(reply: string, apps: ChatMcpApp[] = []) {
    const id = crypto.randomUUID();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMessages((current) => [...current, {
      id,
      role: "assistant",
      content: prefersReducedMotion ? reply : "",
      apps,
    }]);
    if (prefersReducedMotion) {
      setStatus("お話しできます");
      return;
    }

    let position = 0;
    setIsSpeaking(true);
    setStatus("AIニケちゃんがお話し中");
    speechTimerRef.current = window.setInterval(() => {
      const step = /[、。！？\n]/.test(reply[position] ?? "") ? 1 : 2;
      position = Math.min(reply.length, position + step);
      setMessages((current) => current.map((message) => (
        message.id === id ? { ...message, content: reply.slice(0, position) } : message
      )));
      setMouthFrame((frame) => (frame + 1) % 3);
      if (position >= reply.length) finishSpeaking();
    }, 34);
  }

  async function sendQuestion(question: string) {
    const content = question.trim();
    if (!content || busy) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content };
    const conversation = [...messages.filter((message) => message.id !== "welcome"), userMessage]
      .slice(-12)
      .map(({ role, content: messageContent }) => ({ role, content: messageContent }));

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setActiveApp(null);
    setIsLoading(true);
    setStatus("MCPで公開情報を検索中");
    requestRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }),
        signal: requestRef.current.signal,
      });
      const data = await response.json() as {
        reply?: string;
        error?: string;
        apps?: ChatMcpApp[];
      };
      if (!response.ok || !data.reply) throw new Error(data.error || "返事を受け取れませんでした。");
      setIsLoading(false);
      revealReply(data.reply, data.apps ?? []);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setStatus("中断しました");
      } else {
        setMessages((current) => [...current, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "うまく接続できなかったみたい。少し待ってから、もう一度試してみてね。",
        }]);
        setStatus("接続を確認してください");
      }
      setIsLoading(false);
    } finally {
      requestRef.current = null;
    }
  }

  function cancelRequest() {
    requestRef.current?.abort();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendQuestion(input);
    }
  }

  function touchCharacter() {
    if (busy) return;
    const phrase = touchPhrases[touchIndexRef.current % touchPhrases.length];
    touchIndexRef.current += 1;
    revealReply(phrase);
  }

  function beginChatDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    chatDragStartRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishChatDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = chatDragStartRef.current;
    chatDragStartRef.current = null;
    if (start === null) return;

    const distance = event.clientY - start;
    if (Math.abs(distance) < 28) return;

    suppressChatToggleRef.current = true;
    setIsChatExpanded(distance < 0);
  }

  function cancelChatDrag() {
    chatDragStartRef.current = null;
  }

  function toggleChatSize() {
    if (suppressChatToggleRef.current) {
      suppressChatToggleRef.current = false;
      return;
    }
    setIsChatExpanded((expanded) => !expanded);
  }

  return (
    <main className="demo-page">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <section className={`demo-shell ${activeApp ? "has-active-app" : ""} ${isChatExpanded ? "chat-is-expanded" : ""}`} aria-label="AIニケちゃん MCP チャットデモ">
        <aside className="character-panel glass-panel" aria-label="AIニケちゃんのアバター">
          <header className="brand-row">
            <div className="brand-mark" aria-hidden="true">N</div>
            <h1>AIニケちゃん</h1>
            <a className="setup-link" href="/setup" aria-label="MCPのセットアップと利用可能なツールを見る">
              <span className="setup-link-dot" aria-hidden="true" />
              <span className="setup-link-desktop">エージェントに接続</span>
              <span className="setup-link-mobile">MCPを使う</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
            </a>
          </header>
          <p className="sr-only" role="status" aria-live="polite">{status}</p>

          <div className="character-stage">
            <div className="stage-halo" />
            <button
              type="button"
              className={`puru-character ${isSpeaking ? "is-speaking" : ""} ${isLoading ? "is-thinking" : ""}`}
              onClick={touchCharacter}
              disabled={isLoading}
              aria-label="AIニケちゃんに話しかける"
            >
              <div className="puru-speaking-shell">
                <div className="puru-motion">
                  <img className="puru-frame" src={avatarSource} alt="AIニケちゃん" draggable={false} />
                  <img className="puru-hair-motion" src={avatarSource} alt="" draggable={false} aria-hidden="true" />
                </div>
              </div>
            </button>
            <div className="shadow-puddle" />
          </div>

        </aside>

        <section className={`chat-panel ${isChatExpanded ? "is-expanded" : ""}`} aria-labelledby="conversation-title">
          <h2 id="conversation-title" className="sr-only">AIニケちゃんとの会話</h2>

          <button
            type="button"
            className="chat-dock-toggle"
            aria-controls="conversation-messages"
            aria-expanded={isChatExpanded}
            aria-label={isChatExpanded ? "会話を小さくする" : "会話を大きく表示する"}
            onClick={toggleChatSize}
            onPointerDown={beginChatDrag}
            onPointerUp={finishChatDrag}
            onPointerCancel={cancelChatDrag}
          >
            <span aria-hidden="true" />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5" /></svg>
          </button>

          <div id="conversation-messages" ref={messagesRef} className="messages" aria-live="polite">
            {messages.slice(isChatExpanded ? -12 : -2).map((message) => (
              <article key={message.id} className={`message-row ${message.role}`}>
                <div className="message-stack">
                  <div className="message-bubble">{messageParts(message.content)}</div>
                  {message.role === "assistant" && message.apps?.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      className="mcp-app-launch"
                      onClick={() => {
                        setActiveApp(app);
                        setIsChatExpanded(false);
                      }}
                    >
                      <span className="mcp-app-icon" aria-hidden="true">✦</span>
                      <span>
                        <small>MCP APP</small>
                        <strong>{toolLabels[app.tool] ?? app.tool}</strong>
                      </span>
                      <em>{app.results.length}件を見る</em>
                    </button>
                  ))}
                </div>
              </article>
            ))}

            {isLoading && (
              <article className="message-row assistant loading-message">
                <div className="message-stack">
                  <div className="message-bubble typing-bubble">
                    <span /><span /><span />
                    <em>MCPの記憶をたどっています</em>
                  </div>
                </div>
              </article>
            )}
            <div aria-hidden="true" />
          </div>
        </section>

        {activeApp && (
          <aside className="mcp-app-sheet glass-panel" aria-label="MCP Apps 検索結果">
            <header className="mcp-app-header">
              <div>
                <p className="eyebrow">MCP APP · KNOWLEDGE</p>
                <h2>{toolLabels[activeApp.tool] ?? activeApp.tool}</h2>
              </div>
              <span>{activeApp.results.length}件</span>
              <button type="button" onClick={() => setActiveApp(null)} aria-label="MCP Appを閉じる">×</button>
            </header>
            <McpAppFrame app={activeApp} />
          </aside>
        )}

        <div className="conversation-controls glass-panel">
          <div className="suggestions" aria-label="サンプル質問">
            {sampleQuestions.map((question) => (
              <button
                type="button"
                key={question.label}
                onClick={() => void sendQuestion(question.prompt)}
                disabled={busy}
              >
                {question.label}<span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>

          <form className="composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="question">AIニケちゃんへの質問</label>
            <textarea
              id="question"
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 2000))}
              onKeyDown={handleKeyDown}
              placeholder="気になることを聞いてみて…"
              rows={1}
              disabled={busy}
            />
            {isLoading ? (
              <button className="send-button stop-button" type="button" onClick={cancelRequest} aria-label="検索を中断">
                <span />
              </button>
            ) : (
              <button className="send-button" type="submit" disabled={!input.trim() || busy} aria-label="質問を送信">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
              </button>
            )}
          </form>
          <p className="disclaimer">
            非公式デモ · Avatar <a href="https://x.com/tegnike" target="_blank" rel="noreferrer">tegnike</a>
            <span aria-hidden="true"> · </span>
            <a href="https://nikechan.com/" target="_blank" rel="noreferrer">AIニケちゃん</a>
            <span aria-hidden="true"> · </span>
            <a href="/setup#tools">MCPツール一覧</a>
          </p>
        </div>
      </section>
    </main>
  );
}
