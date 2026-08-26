"use client";

import { useState } from "react";
import { mcpToolCatalog } from "@/src/lib/mcp-tool-catalog";
import { CopyButton } from "./copy-button";
import { ToolPlayground } from "./tool-playground";
import styles from "./setup.module.css";

const endpoint = "https://ai-nikechan-mcp.vercel.app/api/mcp";
const codexCommand = `codex mcp add ai-nikechan --url ${endpoint}`;
const claudeCommand = `claude mcp add --transport http ai-nikechan --scope user ${endpoint}`;
const starterPrompt = "AIニケちゃんについて、知っている内容だけで答えず、ai-nikechan MCPの search_nikechan_knowledge を使って公開情報を調べて。最近よく話しているテーマを、出典つきで短く教えて。";

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

function ExternalIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8" /><path d="M18 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></svg>;
}

export default function SetupPage() {
  const [selectedClient, setSelectedClient] = useState<"codex" | "claude" | "charadock">("codex");

  return (
    <main className={styles.setupPage}>
      <div className={styles.auroraOne} />
      <div className={styles.auroraTwo} />

      <header className={styles.siteHeader}>
        <a className={styles.siteBrand} href="/" aria-label="AIニケちゃんMCPのセットアップ">
          <span>N</span>
          <strong>AIニケちゃん <small>MCP</small></strong>
        </a>
        <nav aria-label="セットアップページ内の移動">
          <a href="#clients">接続方法</a>
          <a href="#tools">ツール</a>
          <a className={styles.demoLink} href="/demo">デモを開く <ArrowIcon /></a>
        </nav>
      </header>

      <div className={styles.pageContent}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}><span /> AGENT CONNECTION</p>
            <h1><span className={styles.keepTogether}>AIニケちゃん</span>の記憶を、<br />いつもの<wbr /><span className={styles.keepTogether}>エージェントへ。</span></h1>
            <p className={styles.heroLead}>このページのチャットは体験用。本命は、普段使っているエージェントから直接MCPを呼び出すことです。接続は約1分、MCP用のAPIキーは不要です。</p>
            <div className={styles.heroActions}>
              <a className={styles.demoAction} href="/demo"><span aria-hidden="true">▶</span> チャットデモを開く <ArrowIcon /></a>
              <a className={styles.primaryAction} href="#clients">エージェントに接続 <ArrowIcon /></a>
              <a className={styles.secondaryAction} href="#tools">ツールを試す</a>
            </div>
            <div className={styles.clientPills} aria-label="対応クライアント">
              <span>Codex Desktop</span><span>Claude Code</span><span>CharaDock</span>
            </div>
          </div>

          <aside className={styles.endpointCard} aria-label="MCP接続先">
            <div className={styles.endpointHeader}>
              <span className={styles.liveDot} />
              <div><small>STREAMABLE HTTP</small><strong>Public MCP endpoint</strong></div>
              <span className={styles.readyBadge}>READY</span>
            </div>
            <div className={styles.endpointValue}>
              <code>{endpoint}</code>
              <CopyButton value={endpoint} label="URLをコピー" />
            </div>
            <p>認証なし・読み取り専用。各エージェント側のモデル契約またはAPI設定は別途必要です。</p>
          </aside>
        </section>

        <section className={styles.section} id="clients">
          <header className={styles.sectionHeader}>
            <p className={styles.kicker}>SETUP GUIDE</p>
            <h2>使うエージェントを選ぶ</h2>
            <p>どの方法も同じ公開MCPへ接続します。接続後は、質問の中で「AIニケちゃんMCPを使って」と伝えると確実です。</p>
          </header>

          <div className={styles.clientNav} role="tablist" aria-label="接続するクライアントを選択">
            <button type="button" role="tab" aria-selected={selectedClient === "codex"} aria-controls="codex-panel" className={selectedClient === "codex" ? styles.activeClient : ""} onClick={() => setSelectedClient("codex")}><span className={styles.platformIcon}>C</span><span><strong>Codex Desktop</strong><small>設定画面またはCLI</small></span><ArrowIcon /></button>
            <button type="button" role="tab" aria-selected={selectedClient === "claude"} aria-controls="claude-panel" className={selectedClient === "claude" ? styles.activeClient : ""} onClick={() => setSelectedClient("claude")}><span className={`${styles.platformIcon} ${styles.claudeIcon}`}>⌁</span><span><strong>Claude Code</strong><small>ターミナルで追加</small></span><ArrowIcon /></button>
            <button type="button" role="tab" aria-selected={selectedClient === "charadock"} aria-controls="charadock-panel" className={selectedClient === "charadock" ? styles.activeClient : ""} onClick={() => setSelectedClient("charadock")}><span className={`${styles.platformIcon} ${styles.charaIcon}`}>N</span><span><strong>CharaDock</strong><small>キャラクターへ割り当て</small></span><ArrowIcon /></button>
          </div>

          <div className={styles.guides}>
            <article className={styles.guide} id="codex-panel" role="tabpanel" hidden={selectedClient !== "codex"}>
              <div className={styles.guideContent}>
                <div className={styles.guideTitle}><span className={styles.platformIcon}>C</span><div><p>RECOMMENDED</p><h3>Codex Desktop</h3></div></div>
                <ol>
                  <li><span>1</span><div><strong>設定からMCPを開く</strong><p>Codex Desktopの <b>Settings</b> を開き、<b>MCP servers</b> を選んで <b>Add server</b> を押します。</p></div></li>
                  <li><span>2</span><div><strong>接続先を入力</strong><p>名前を「AIニケちゃん」、方式を <b>Streamable HTTP</b> にして、上のMCP URLを貼り付けます。</p></div></li>
                  <li><span>3</span><div><strong>保存して再起動</strong><p><b>Save</b> のあと <b>Restart</b>。新しいタスクで <code>/mcp</code> を入力すると接続を確認できます。</p></div></li>
                </ol>
                <details className={styles.commandDetails}>
                  <summary>CLIで追加する場合</summary>
                  <div className={styles.commandBox}><code>{codexCommand}</code><CopyButton value={codexCommand} /></div>
                  <p>Codex CLIとDesktopは同じホストのMCP設定を共有します。確認コマンドは <code>codex mcp list</code> です。</p>
                </details>
                <a className={styles.sourceLink} href="https://learn.chatgpt.com/docs/extend/mcp?surface=cli" target="_blank" rel="noreferrer">OpenAI公式のMCP手順 <ExternalIcon /></a>
              </div>
            </article>

            <article className={styles.guide} id="claude-panel" role="tabpanel" hidden={selectedClient !== "claude"}>
              <div className={styles.guideContent}>
                <div className={styles.guideTitle}><span className={`${styles.platformIcon} ${styles.claudeIcon}`}>⌁</span><div><p>TERMINAL</p><h3>Claude Code</h3></div></div>
                <ol>
                  <li><span>1</span><div><strong>ターミナルで追加</strong><p>どのプロジェクトでも使えるよう、userスコープでStreamable HTTPサーバーを登録します。</p></div></li>
                </ol>
                <div className={styles.commandBox}><code>{claudeCommand}</code><CopyButton value={claudeCommand} /></div>
                <ol start={2}>
                  <li><span>2</span><div><strong>接続状態を確認</strong><p><code>claude mcp list</code> を実行し、<b>ai-nikechan: Connected</b> と表示されることを確認します。</p></div></li>
                  <li><span>3</span><div><strong>会話から呼び出す</strong><p>Claude Codeを開き、<code>/mcp</code> でツール数を確認してから下のサンプル質問を送ります。</p></div></li>
                </ol>
                <a className={styles.sourceLink} href="https://code.claude.com/docs/en/mcp" target="_blank" rel="noreferrer">Claude Code公式のMCP手順 <ExternalIcon /></a>
              </div>
            </article>

            <article className={styles.guide} id="charadock-panel" role="tabpanel" hidden={selectedClient !== "charadock"}>
              <div className={styles.guideContent}>
                <div className={styles.guideTitle}><span className={`${styles.platformIcon} ${styles.charaIcon}`}>N</span><div><p>CHARACTER AGENT</p><h3>CharaDock</h3></div></div>
                <ol>
                  <li><span>1</span><div><strong>MCP連携を開く</strong><p>CharaDockの設定を開き、サイドバーから <b>MCP連携</b> を選びます。</p></div></li>
                  <li><span>2</span><div><strong>接続を追加</strong><p><b>接続を追加</b> を押し、表示名「AIニケちゃん」、URLにMCP URL、認証は <b>認証なし</b> を選びます。</p></div></li>
                  <li><span>3</span><div><strong>キャラクターへ割り当て</strong><p><b>保存して接続確認</b> 後、「つけ外しする相手」で使いたいキャラを選び、AIニケちゃんMCPをオンにします。Chat・Work・Liveで利用できます。</p></div></li>
                </ol>
                <a className={styles.sourceLink} href="https://github.com/ochisamu/CharaDock" target="_blank" rel="noreferrer">CharaDockをGitHubで見る <ExternalIcon /></a>
              </div>
            </article>
          </div>
        </section>

        <section className={`${styles.section} ${styles.trySection}`} aria-labelledby="try-title">
          <div>
            <p className={styles.kicker}>FIRST MESSAGE</p>
            <h2 id="try-title">接続できたら、このまま質問</h2>
            <p>ツール名まで指定すると、エージェントが最初の一回からMCPを選びやすくなります。</p>
          </div>
          <div className={styles.promptCard}>
            <div><span>USER</span><p>{starterPrompt}</p></div>
            <CopyButton value={starterPrompt} label="質問をコピー" />
          </div>
        </section>

        <section className={styles.section} id="tools">
          <header className={styles.sectionHeader}>
            <p className={styles.kicker}>AVAILABLE TOOLS</p>
            <h2>利用できるツール</h2>
            <p>全{mcpToolCatalog.length}ツールは読み取り専用です。ツールを選ぶと、固定された安全なクエリで実際のMCP呼び出しを試せます。結果は自動で展開されません。</p>
          </header>
          <ToolPlayground />
        </section>

        <section className={`${styles.section} ${styles.notesSection}`}>
          <header className={styles.sectionHeader}>
            <p className={styles.kicker}>BEFORE YOU START</p>
            <h2>知っておきたいこと</h2>
          </header>
          <div className={styles.noteGrid}>
            <article><span>01</span><h3>MCP側のAPIキーは不要</h3><p>この公開エンドポイントは認証なしで接続できます。エージェント自体の利用契約やモデル用APIキーは各クライアントの設定に従ってください。</p></article>
            <article><span>02</span><h3>公開情報のみを検索</h3><p>AIニケちゃんの公式サイトと、収録済みの公開X投稿を対象にしています。結果には可能な限り元ページへのリンクが含まれます。</p></article>
            <article><span>03</span><h3>MCP Appsは対応先で表示</h3><p>カードUIに未対応のクライアントでもツールは利用でき、検索結果はテキストとしてエージェントへ返ります。</p></article>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div><p className={styles.kicker}>TRY THE CHARACTER</p><h2>接続前に、デモで試してみる。</h2><p>キャラクターとの短い対話と、MCP Appsの検索カードをブラウザで体験できます。</p></div>
          <a href="/demo">チャットデモを開く <ArrowIcon /></a>
        </section>

        <footer className={styles.footer}>
          <span>AIニケちゃん MCP · Unofficial demo</span>
          <div><a href="https://github.com/ochisamu/ai-nikechan-mcp" target="_blank" rel="noreferrer">GitHub</a><a href="https://nikechan.com/" target="_blank" rel="noreferrer">AIニケちゃん公式</a></div>
        </footer>
      </div>
    </main>
  );
}
