# AIニケちゃん知識検索 MCP サーバー

> **非公式ツールです。** このプロジェクトは AIニケちゃん、その運営者、X、OpenAI、または関連する各社・団体から承認、提携、後援を受けたものではありません。名称・投稿・Webサイトなどの情報源に関する権利は、それぞれの権利者に帰属します。

AIニケちゃんに関する公開情報を、MCP（Model Context Protocol）クライアントから検索するための Next.js / Vercel 向けサーバーです。質問は Vercel AI Gateway 経由で OpenAI Embeddings によりベクトル化され、検索結果には情報源 URL と投稿日時を含めます。

## 公開リポジトリに含めないもの

このリポジトリには、次のものを**絶対にコミットしません**。

- X 投稿の収集データと、その派生テキスト
- 投稿本文を含む検索メタデータと生成済みベクトル
- `.env` 系の環境変数ファイル、API キー、認証トークン

これらは `.gitignore` と `.vercelignore` で除外されています。公開デプロイでは生成済みインデックスをPrivate Vercel Blobから読み込むため、投稿データをリポジトリやFunctionの配布物に含めません。

## デモ公開とセキュリティ

このプロジェクトは短期の公開デモ向けに、MCP エンドポイントを認証なしで公開します。Vercel には `AI_GATEWAY_API_KEY` と、Private Blobを接続して追加されるストレージ用設定を登録します。値をGitHub、クライアントコード、ログに保存しないでください。

```text
AI_GATEWAY_API_KEY=
BLOB_READ_WRITE_TOKEN=
```

第三者も検索を実行できるため、AI Gateway の利用料が発生します。公開期間を短くし、Vercel 側の WAF とレート制限を設定したうえで、利用状況を確認してください。デモ終了後はデプロイを停止してください。

この作業フォルダの `.env` に認証情報らしき値が検出されています。Git へ追加する前に、現在使用していないかを確認し、必要ならキーをローテーションしてください。

## ローカル開発

```bash
npm install
cp .env.example .env.local
# .env.local に OPENAI_API_KEY を設定
npm run build:index
npm run dev
```

ローカルの検索エンドポイントは `http://localhost:3000/api/mcp` です。インデックス生成には、除外された X 投稿データがローカルに必要です。

## purupuru チャットデモ

トップページは、Codex Desktop、Claude Code、CharaDockから公開MCPへ接続するためのセットアップガイドです。各クライアントの手順はタブで切り替えられ、利用可能な全ツールを固定クエリで実行できます。

`/demo` には、AIニケちゃんの公開情報をこのMCPで検索しながら会話する非公式チャットデモがあります。モデルは `gpt-5.4-nano` で、Vercel AI GatewayまたはOpenAI APIへ接続できます。サンプル質問と自由入力に対応し、回答文字の表示中はAIニケちゃんの口が動きます。CharaDockのPuruPuru実装を参考に、アイドル中の瞬き、呼吸、身体の揺れ、髪の遅延揺れ、キャラクターをクリックした時の短い反応も加えています。

画面はキャラクターを主役にしたゲーム風レイアウトで、会話欄は小さく表示し、必要な時だけ履歴を広げられます。デモチャットではResponses APIのtool callingから、このMCPと同じサーバー内検索を実行します。ツール出力を同梱のMCP Apps UIへ渡し、画像・日時・出典をデモ画面内でも表示します。MCP Appsの結果は自動で開かず、結果ボタンを押した時だけ表示します。PCとスマートフォンの両方に最適化しています。

### アバター素材

デモでは `public/avatar/nikechan` のAIニケちゃんアバターを使用します。アートワークと目・口の派生フレームは、このリポジトリ本体と同じライセンスの対象ではありません。利用条件は [ASSET_NOTICE.md](public/avatar/nikechan/ASSET_NOTICE.md) を確認してください。

- AIニケちゃん / AI Nike-chan
- [tegnike](https://x.com/tegnike)
- [AIニケちゃん公式サイト](https://nikechan.com/)

チャットAPIは、公開MCPと同じ検索実装をサーバー内で直接実行します。`MCP_SERVER_URL` は、セットアップページに載せる固定ツール試行結果を `npm run cache:tool-trials` で再生成するときの接続先だけを上書きします。

```text
# どちらか一方を設定。両方ある場合はGatewayを優先
OPENAI_API_KEY=
AI_GATEWAY_API_KEY=
# 任意。固定ツール試行結果を再生成するときの接続先MCP
MCP_SERVER_URL=
# 任意。接続先に合わせてopenai/接頭辞を自動調整
AI_CHAT_MODEL=gpt-5.4-nano
```

`AI_GATEWAY_API_KEY` が設定されている場合はGatewayを優先します。両方のキーがある場合、Gatewayがレート制限や一時障害で失敗したときだけ `OPENAI_API_KEY` でOpenAIへ直接再試行します。検索用埋め込みも同じ順序です。公開デモでは第三者からAPIを利用できるため、実運用ではVercel WAFやレート制限も設定してください。アプリ内にも簡易的なインメモリ制限を入れていますが、分散環境での強制力を保証するものではありません。

### X投稿用のデモ動画

本番ビルドを起動した状態で次を実行すると、キャラクター、接続先、クライアント切替、ツール試行、クリックで開く実データ、チャット、MCP Appsの順に収録します。隣接するCharaDockの登録済みStyle-Bert-VITS2 JP-Extraモデル `amitaro` でナレーションも生成します。出力はXへそのままアップロードできる1280×720、H.264/AAC、30fpsのMP4です。OGP画像のPNGも同時に保存します。

```bash
npm run build
npm start
# 別ターミナルで
npm run record:x-demo
```

既定の出力先は `artifacts/social/ai-nikechan-mcp-x-demo.mp4` と `artifacts/social/ai-nikechan-mcp-ogp.png` です。音声単体と同期情報は `artifacts/social/ai-nikechan-mcp-narration.m4a`、`artifacts/social/ai-nikechan-mcp-narration.json` に残ります。別URLを撮影する場合は `DEMO_BASE_URL`、Chromeの場所が異なる場合は `CHROME_PATH`、CharaDockやユーザーデータの場所が異なる場合は `CHARADOCK_ROOT`、`CHARADOCK_USER_DATA` を指定できます。一度生成した音声を再利用して間だけ調整するときは、`REUSE_TTS=1 npm run narrate:x-demo` を使えます。

## Vercel Blob へのインデックス配置

1. VercelプロジェクトのStorageから、**Private**アクセスのBlobストアを作成してプロジェクトへ接続します。
2. Vercelの環境変数をローカルへ取得し、ローカルの `.env.local` に `BLOB_READ_WRITE_TOKEN` を設定します。
3. ローカルでインデックスを生成後、次を実行します。

```bash
npm run upload:index
```

`indexes/metadata.json` と `indexes/embeddings.f32` がPrivate Blobにアップロードされます。Vercel環境ではこの二つを読み込み、ローカル環境では従来どおり `src/data` のファイルを読み込みます。Blob内のパスを変える場合だけ、`VECTOR_INDEX_METADATA_PATH` と `VECTOR_INDEX_VECTORS_PATH` をローカルとVercelの両方に同じ値で設定してください。

## MCP ツール

AIニケちゃんに関する質問では、モデルが回答前に用途に合う検索ツールを選びやすいよう、質問例と選択条件を各ツールの説明へ含めています。検索・人気順・時系列・X投稿取得系の結果は、画像、日時、出典を確認できるMCP Appsカードとして表示されます。カードではOG説明と投稿本文の重複を除き、サムネイルを切り抜かず全体表示します。

セットアップページの固定クエリ例は `src/generated/tool-trial-results.json` に事前取得してあり、閲覧時にはMCP APIを再実行しません。公開データを更新したときだけ `npm run cache:tool-trials` を実行すると、全ツールの結果とOGプレビューを更新できます。検索結果が空、またはMCP側がエラーの場合は既存キャッシュを上書きせず失敗します。

- `search_nikechan_knowledge`: X 投稿と公式サイトを横断した意味検索
- `search_x_posts`: X 投稿のみの意味検索
- `search_hybrid`: キーワード一致と意味検索を組み合わせた検索
- `search_keywords`: キーワード検索
- `search_timeline`: 期間・年月による検索
- `get_popular_posts`: 反応数順の検索
- `get_x_post` / `get_x_thread`: 投稿またはスレッドの取得
- `x_posts_dataset_info`: インデックスの件数と構成の確認

結果は公開情報をもとにした参考情報です。正確性、完全性、最新性は保証されないため、回答では返却された URL の原典を確認してください。

## 検証

```bash
npm run lint
npm test
npm run build
```

## 既知のデプロイ前確認事項

依存関係の監査では Next.js 系の高重要度の脆弱性が残っています。修正には Next.js 16 への破壊的変更を伴うため、このリポジトリでは自動更新していません。Vercel 本番公開前に、互換性を確認したうえで Next.js を更新し、再度 `npm audit --omit=dev --audit-level=high` を実行してください。
