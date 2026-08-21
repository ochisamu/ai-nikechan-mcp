# AIニケちゃん知識ベクトル検索 MCP サーバー計画

## 目的

フォルダ内のX投稿とAIニケちゃん公式サイトの公開文章をOpenAI Embeddingsでベクトル化し、質問文に意味的に近い情報をMCPツールから返せるようにする。公開先はVercelとし、MCPクライアントはStreamable HTTPのエンドポイントへ接続する。

## 採用構成

| 項目 | 内容 |
| --- | --- |
| MCP実装 | Next.js API Route と `mcp-handler` |
| 公開先 | Vercel Functions |
| 埋め込み | OpenAI `text-embedding-3-small`、512次元 |
| インデックス | 投稿メタデータJSON + Float32バイナリベクトル |
| 類似度 | コサイン類似度 |
| データ入力 | X投稿JSONL + 公式サイトの公開ページ |

512次元に縮小した埋め込みを採用し、投稿数が増えてもVercel Functionへ同梱しやすいサイズにする。検索時は質問文だけをOpenAI APIへ送り、投稿全件の埋め込みはデプロイ済みのインデックスから読む。

## 実装ステップ

1. JSONLの投稿と、公式サイトの文章ページを読み、本文・日時・URL・情報源を正規化する。
2. `npm run build:index` で本文をOpenAI Embeddingsにまとめて送信し、検索インデックスを作る。
3. 横断検索用の `search_nikechan_knowledge` と、投稿専用の `search_x_posts` をMCPツールとして公開する。
4. Vercel Functionに検索インデックスを同梱し、検索時にクエリだけを埋め込む。
5. MCP Inspectorまたは接続先クライアントで、初期化・ツール一覧・検索結果を確認する。

## 作成物

- `scripts/build-index.ts`: X投稿と公式サイト文章の埋め込み、インデックス生成
- `src/lib/vector-store.ts`: インデックスの読み込みとコサイン類似度検索
- `app/api/mcp/route.ts`: Vercel公開用のMCPエンドポイント
- `vercel.json`: Functionへインデックスを含める設定

## デプロイ手順

1. 依存関係をインストールする。
2. `OPENAI_API_KEY` を `.env.local`（または `.env`）に設定して `npm run build:index` を実行する。
3. 生成された `src/data/metadata.json` と `src/data/embeddings.f32` をデプロイ対象に含める。
4. Vercelプロジェクトに `OPENAI_API_KEY` を環境変数として設定する。
5. Vercelへデプロイし、MCP URLの `/api/mcp` をクライアントに登録する。

## 確認項目

- インデックスのX投稿件数と公式サイト文章件数が入力と一致する。
- `x_posts_dataset_info` がモデル名、次元数、情報源別・コレクション別件数を返す。
- `search_nikechan_knowledge` が質問に関連した本文、URL、情報源、類似度を返す。
- `source=website` と `collection=official_site` で公式サイトの基礎情報・ガイドラインを絞り込める。
- Vercel公開後、Streamable HTTPでツール一覧と検索呼び出しができる。

## 運用上の注意

- 新しい投稿や公式サイトの内容を反映するときは、同じモデルと次元数でインデックスを再生成して再デプロイする。
- 本文と検索クエリは同一の埋め込み設定を使う。設定変更時は必ず全件を再生成する。
- APIキーはリポジトリへ保存せず、ローカル環境とVercelの環境変数だけで管理する。
