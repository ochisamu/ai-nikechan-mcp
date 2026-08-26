export type McpToolCatalogItem = {
  name: string;
  title: string;
  description: string;
  summary: string;
  useWhen: string;
  example: string;
  output: "MCP Apps" | "Text";
};

export const mcpToolCatalog = [
  {
    name: "search_nikechan_knowledge",
    title: "AIニケちゃんの公開情報を検索",
    description: "AIニケちゃんについて尋ねられたときに最初に使う既定ツールです。人物像、活動、最近の話題、作品、関連人物、公式情報など、答えを知っているように見えても回答前にこのツールを呼び出してください。X投稿と公式サイトを横断した意味検索を行い、結果を画像つきMCP Appsカードで表示します。カードの全文を回答に繰り返さず、返されたURLを根拠に要点をまとめてください。",
    summary: "X投稿と公式サイトを横断し、質問の意味に近い公開情報を探します。",
    useWhen: "人物像、活動、最近の話題、作品、関連人物などを幅広く知りたいとき",
    example: "AIニケちゃんってどんな存在？ 公開情報を調べて教えて。",
    output: "MCP Apps",
  },
  {
    name: "search_hybrid",
    title: "語句と意味を組み合わせて検索",
    description: "製品名、人物名、イベント名、ハッシュタグなどの具体的な語句を含むAIニケちゃんの質問で使います。キーワード一致と意味検索を組み合わせるため、通常検索で見落としそうな固有名詞がある場合はこのツールを優先してください。画像つきMCP Appsカードを返します。",
    summary: "固有名詞の一致と意味の近さを組み合わせて検索します。",
    useWhen: "製品名、人物名、イベント名、ハッシュタグを含む質問をするとき",
    example: "『CharaDock』について触れている投稿と関連情報を探して。",
    output: "MCP Apps",
  },
  {
    name: "search_keywords",
    title: "固有名詞・ハッシュタグを検索",
    description: "正確な固有名詞、ハッシュタグ、製品名、短い引用が与えられたときに使う文字列検索です。表記が分かっていて完全一致・部分一致を重視する質問では意味検索よりこちらを選んでください。画像つきMCP Appsカードを返します。",
    summary: "分かっている表記をそのまま使い、完全一致・部分一致で探します。",
    useWhen: "正確な名称、ハッシュタグ、短い引用文から探したいとき",
    example: "#AIニケちゃん を含む公開投稿をキーワード検索して。",
    output: "MCP Apps",
  },
  {
    name: "search_x_posts",
    title: "AIニケちゃんのX投稿を検索",
    description: "利用者が「Xで」「投稿」「ポスト」「ツイート」「コミュニティの反応」のようにX上の情報を明示した場合に使います。公式・コミュニティのX投稿だけを意味検索し、日時と元URLを画像つきMCP Appsカードで表示します。",
    summary: "公式・コミュニティのX投稿に絞り、意味の近い投稿を探します。",
    useWhen: "X上での発言やコミュニティの反応を明示して尋ねるとき",
    example: "AIニケちゃんについて、Xで最近どんな反応がある？",
    output: "MCP Apps",
  },
  {
    name: "get_popular_posts",
    title: "反応が大きい投稿をランキング",
    description: "「人気」「バズった」「反応が大きい」「いいね順」「最も見られた」のような順位や反応数を尋ねられた場合は、意味検索ではなく必ずこのツールを使ってください。指定期間のX投稿を反応指標で並べ、画像つきMCP Appsカードで比較表示します。",
    summary: "いいね、リポスト、返信、表示数などの指標で投稿を並べます。",
    useWhen: "人気、反応が大きい、いいね順といったランキングを見たいとき",
    example: "AIニケちゃん関連で反応が大きかった投稿を5件見せて。",
    output: "MCP Apps",
  },
  {
    name: "search_timeline",
    title: "年月・期間から記録を検索",
    description: "「最近」「いつ」「2026年6月」「この期間」「時系列」のように日付や順序を含む質問では必ずこのツールを使ってください。AIニケちゃんのX投稿と公式サイトを期間で絞り、新しい順のMCP Appsカードとして表示します。",
    summary: "年月や期間で公開情報を絞り、新しい順に確認します。",
    useWhen: "最近の話題、特定の年月、出来事の順番を調べたいとき",
    example: "2026年6月のAIニケちゃんの話題を時系列で見せて。",
    output: "MCP Apps",
  },
  {
    name: "get_x_post",
    title: "X投稿をIDで取得",
    description: "X投稿URLまたは投稿IDが示され、その投稿の正確な本文・日時・メタデータを確認する場合に使います。推測や再検索をせず、IDを取り出してこのツールを呼び出してください。",
    summary: "指定されたX投稿の本文、日時、メタデータを正確に取得します。",
    useWhen: "確認したいX投稿のURLまたは投稿IDが手元にあるとき",
    example: "このX投稿の内容と日時を正確に確認して：https://x.com/i/web/status/2089268494848454992",
    output: "MCP Apps",
  },
  {
    name: "get_x_thread",
    title: "Xの会話スレッドを取得",
    description: "「この投稿の続き」「前後の会話」「スレッド全体」を求められ、X投稿URLまたはIDがある場合に使います。同じ会話の投稿を時系列で取得し、MCP Appsカードとして表示します。",
    summary: "指定した投稿を含む会話をまとめ、時系列で取得します。",
    useWhen: "X投稿の続き、前後の会話、スレッド全体を読みたいとき",
    example: "この投稿を含むスレッド全体を時系列で見せて：https://x.com/i/web/status/2089268494848454992",
    output: "MCP Apps",
  },
  {
    name: "x_posts_dataset_info",
    title: "検索データセットの情報を確認",
    description: "検索対象の件数、収録範囲、インデックス作成日時、公式・コミュニティ別の内訳について尋ねられた場合にだけ使います。AIニケちゃん本人の活動内容を探すツールではありません。",
    summary: "収録件数、期間、更新日時、情報源の内訳を確認します。",
    useWhen: "このMCPが検索できるデータの範囲や更新状況を知りたいとき",
    example: "このMCPの収録件数と対象期間、最終更新日時を教えて。",
    output: "Text",
  },
] as const satisfies readonly McpToolCatalogItem[];

export const mcpToolCatalogByName = Object.fromEntries(
  mcpToolCatalog.map((tool) => [tool.name, tool]),
) as Record<(typeof mcpToolCatalog)[number]["name"], (typeof mcpToolCatalog)[number]>;
