import { put } from "@vercel/blob";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

const root = process.cwd();
config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env") });

const files = [
  { local: "src/data/metadata.json", remote: process.env.VECTOR_INDEX_METADATA_PATH ?? "indexes/metadata.json", contentType: "application/json" },
  { local: "src/data/embeddings.f32", remote: process.env.VECTOR_INDEX_VECTORS_PATH ?? "indexes/embeddings.f32", contentType: "application/octet-stream" },
];

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN を .env.local または環境変数に設定してください。");
  }

  const uploaded = await Promise.all(files.map(async ({ local, remote, contentType }) => {
    const body = await readFile(path.join(root, local));
    return put(remote, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
  }));

  for (const file of uploaded) console.log(`Uploaded ${file.pathname}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
