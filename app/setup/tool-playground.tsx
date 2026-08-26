"use client";

import { useState } from "react";
import { mcpToolCatalog } from "@/src/lib/mcp-tool-catalog";
import { fixedToolTrials, type ToolTrialResponse, type TrialToolName } from "@/src/lib/mcp-tool-trial";
import styles from "./setup.module.css";

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

function ResultCards({ response }: { response: ToolTrialResponse }) {
  if (response.results.length) {
    return (
      <div className={styles.trialResults}>
        {response.results.map(({ post, scoreLabel }, index) => (
          <article key={`${post.url}-${index}`} className={styles.trialResultCard}>
            {post.previewImage && <img src={post.previewImage} alt="" loading="lazy" />}
            <div>
              <p className={styles.resultMeta}>
                <span>{post.collection}</span>
                <time dateTime={post.createdAt}>{post.createdAt.slice(0, 10)}</time>
                {scoreLabel && <em>{scoreLabel}</em>}
              </p>
              {post.previewTitle && <h4>{post.previewTitle}</h4>}
              <p className={styles.resultText}>{post.text.replace(/https?:\/\/\S+/g, "").trim()}</p>
              <a href={post.url} target="_blank" rel="noreferrer">元の投稿・ページを見る <ArrowIcon /></a>
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (response.info) {
    return (
      <dl className={styles.infoResults}>
        {Object.entries(response.info).map(([key, value]) => (
          <div key={key}><dt>{key}</dt><dd>{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>
        ))}
      </dl>
    );
  }

  return <p className={styles.emptyResult}>この固定クエリに該当する結果はありませんでした。</p>;
}

export function ToolPlayground() {
  const [selected, setSelected] = useState<TrialToolName>(mcpToolCatalog[0].name);
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<ToolTrialResponse | null>(null);
  const [error, setError] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);
  const tool = mcpToolCatalog.find((item) => item.name === selected) ?? mcpToolCatalog[0];
  const trial = fixedToolTrials[selected];

  function selectTool(name: TrialToolName) {
    setSelected(name);
    setResponse(null);
    setError("");
    setResultsOpen(false);
  }

  async function runTool() {
    if (running) return;
    setRunning(true);
    setResponse(null);
    setResultsOpen(false);
    setError("");
    try {
      const result = await fetch("/api/tool-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: selected }),
      });
      const data = await result.json() as ToolTrialResponse & { error?: string };
      if (!result.ok) throw new Error(data.error || "ツールを実行できませんでした。");
      setResponse(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ツールを実行できませんでした。");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={styles.toolWorkbench}>
      <div className={styles.toolSelector} role="list" aria-label="利用できるMCPツール">
        {mcpToolCatalog.map((item, index) => (
          <button
            type="button"
            key={item.name}
            className={item.name === selected ? styles.selectedTool : ""}
            onClick={() => selectTool(item.name)}
            aria-pressed={item.name === selected}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span><strong>{item.title}</strong><code>{item.name}</code></span>
            <em>{item.output}</em>
          </button>
        ))}
      </div>

      <section className={styles.toolInspector} aria-live="polite">
        <header>
          <div><span className={styles.inspectorOutput}>{tool.output}</span><h3>{tool.title}</h3><code>{tool.name}</code></div>
          <span className={styles.readOnlyBadge}>READ ONLY</span>
        </header>
        <p className={styles.toolSummary}>{tool.summary}</p>
        <dl className={styles.toolExplanation}>
          <div><dt>使う場面</dt><dd>{tool.useWhen}</dd></div>
          <div><dt>エージェントへの質問例</dt><dd>「{tool.example}」</dd></div>
        </dl>

        <div className={styles.fixedQuery}>
          <div><span>固定クエリ</span><strong>{trial.queryLabel}</strong></div>
          <code>{JSON.stringify(trial.arguments)}</code>
        </div>

        <button type="button" className={styles.runToolButton} onClick={runTool} disabled={running}>
          <span aria-hidden="true">{running ? "···" : "▶"}</span>
          {running ? "MCPを呼び出しています" : "このツールを試す"}
        </button>

        {error && <p className={styles.trialError} role="alert">{error}</p>}
        {response && (
          <div className={styles.trialReceipt}>
            <div>
              <span className={styles.successDot} />
              <p><strong>実行完了</strong><small>{response.results.length ? `${response.count}件の結果` : `${response.count}項目の情報`}を受け取りました</small></p>
            </div>
            <button
              type="button"
              onClick={() => setResultsOpen((open) => !open)}
              aria-expanded={resultsOpen}
            >
              {resultsOpen ? "結果を閉じる" : "結果を開く"}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={resultsOpen ? "m8 14 4-4 4 4" : "m8 10 4 4 4-4"} /></svg>
            </button>
          </div>
        )}
        {response && resultsOpen && <ResultCards response={response} />}
      </section>
    </div>
  );
}
