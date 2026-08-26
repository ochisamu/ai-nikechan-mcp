"use client";

import { useRef, useState } from "react";
import toolTrialCacheJson from "@/src/generated/tool-trial-results.json";
import { mcpToolCatalog } from "@/src/lib/mcp-tool-catalog";
import { fixedToolTrials, type ToolTrialCache, type ToolTrialResponse, type TrialToolName } from "@/src/lib/mcp-tool-trial";
import { searchResultsAppHtml } from "@/src/lib/search-results-app";
import styles from "./setup.module.css";

const toolTrialCache = toolTrialCacheJson as unknown as ToolTrialCache;

function ToolMcpAppFrame({ response }: { response: ToolTrialResponse }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  function sendToolOutput() {
    frameRef.current?.contentWindow?.postMessage({
      params: { structuredContent: { results: response.results } },
    }, "*");
  }

  return (
    <iframe
      ref={frameRef}
      className={styles.trialMcpAppFrame}
      srcDoc={searchResultsAppHtml}
      title={`${response.queryLabel} MCP App`}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      onLoad={sendToolOutput}
    />
  );
}

function CachedResult({ response }: { response: ToolTrialResponse }) {
  if (response.results.length) return <ToolMcpAppFrame response={response} />;
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
  const [response, setResponse] = useState<ToolTrialResponse | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const tool = mcpToolCatalog.find((item) => item.name === selected) ?? mcpToolCatalog[0];
  const trial = fixedToolTrials[selected];

  function selectTool(name: TrialToolName) {
    setSelected(name);
    setResponse(null);
    setResultsOpen(false);
  }

  function showCachedTrial() {
    setResponse(toolTrialCache.responses[selected]);
    setResultsOpen(false);
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

        <button type="button" className={styles.runToolButton} onClick={showCachedTrial}>
          <span aria-hidden="true">▶</span>
          固定クエリの結果を見る
        </button>

        {response && (
          <div className={styles.trialReceipt}>
            <div>
              <span className={styles.successDot} />
              <p><strong>実行結果を用意しました</strong><small>{response.results.length ? `${response.count}件のMCP Appsカード` : `${response.count}項目の情報`} · 事前取得済み</small></p>
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
        {response && resultsOpen && <CachedResult response={response} />}
      </section>
    </div>
  );
}
