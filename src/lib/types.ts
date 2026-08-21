export type PostRecord = {
  source: "x" | "website";
  collection: string;
  authority: string;
  datasetTier: string;
  url: string;
  id: string;
  conversationId: string;
  authorId: string;
  createdAt: string;
  occurredAt?: string;
  lang?: string;
  text: string;
  metrics?: Record<string, number>;
};

export type IndexMetadata = {
  schemaVersion: 1;
  generatedAt: string;
  sourceFile: string;
  model: string;
  dimensions: number;
  records: PostRecord[];
};
