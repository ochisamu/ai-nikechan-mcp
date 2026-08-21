# AIニケちゃん知識検索 MCP サーバー

> **非公式ツールです。** このプロジェクトは AIニケちゃん、その運営者、X、OpenAI、または関連する各社・団体から承認、提携、後援を受けたものではありません。名称・投稿・Webサイトなどの情報源に関する権利は、それぞれの権利者に帰属します。

AIニケちゃんに関する公開情報を、MCP（Model Context Protocol）クライアントから検索するための Next.js / Vercel 向けサーバーです。質問は OpenAI Embeddings でベクトル化され、検索結果には情報源 URL と投稿日時を含めます。

## 公開リポジトリに含めないもの

このリポジトリには、次のものを**絶対にコミットしません**。

- X 投稿の収集データと、その派生テキスト
- 投稿本文を含む検索メタデータと生成済みベクトル
- `.env` 系の環境変数ファイル、API キー、認証トークン

これらは `.gitignore` と `.vercelignore` で除外されています。公開デプロイでは生成済みインデックスをPrivate Vercel Blobから読み込むため、投稿データをリポジトリやFunctionの配布物に含めません。

## デモ公開とセキュリティ

このプロジェクトは短期の公開デモ向けに、MCP エンドポイントを認証なしで公開します。Vercel には `OPENAI_API_KEY` と、Private Blobを接続して追加されるストレージ用設定を登録します。値をGitHub、クライアントコード、ログに保存しないでください。

```text
OPENAI_API_KEY=
BLOB_READ_WRITE_TOKEN=
```

第三者も検索を実行できるため、OpenAI API の利用料が発生します。公開期間を短くし、Vercel 側の WAF とレート制限を設定したうえで、利用状況を確認してください。デモ終了後はデプロイを停止してください。

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

## Vercel Blob へのインデックス配置

1. VercelプロジェクトのStorageから、**Private**アクセスのBlobストアを作成してプロジェクトへ接続します。
2. Vercelの環境変数をローカルへ取得し、ローカルの `.env.local` に `BLOB_READ_WRITE_TOKEN` を設定します。
3. ローカルでインデックスを生成後、次を実行します。

```bash
npm run upload:index
```

`indexes/metadata.json` と `indexes/embeddings.f32` がPrivate Blobにアップロードされます。Vercel環境ではこの二つを読み込み、ローカル環境では従来どおり `src/data` のファイルを読み込みます。Blob内のパスを変える場合だけ、`VECTOR_INDEX_METADATA_PATH` と `VECTOR_INDEX_VECTORS_PATH` をローカルとVercelの両方に同じ値で設定してください。

## MCP ツール

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
