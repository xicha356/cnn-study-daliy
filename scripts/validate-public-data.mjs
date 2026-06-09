import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dataRoot = path.join("public", "data");
const articlesRoot = path.join(dataRoot, "articles");
const noisePatterns = [
  "CNNSTATICSECTION",
  "CNN.com - Transcripts",
  "Transcript Providers",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const indexPath = path.join(dataRoot, "articles.json");
assert(existsSync(indexPath), "public/data/articles.json is missing");
const index = JSON.parse(readFileSync(indexPath, "utf8"));
assert(Array.isArray(index) && index.length > 0, "article index is empty");

for (const item of index) {
  const detailPath = path.join(articlesRoot, `${item.date}.json`);
  assert(existsSync(detailPath), `article detail missing: ${item.date}`);
  const raw = readFileSync(detailPath, "utf8");
  for (const noise of noisePatterns)
    assert(!raw.includes(noise), `${item.date} contains noise: ${noise}`);
  const article = JSON.parse(raw);
  for (const paragraph of article.paragraphs || []) {
    assert(
      paragraph.speaker !== "ANCHOR",
      `${item.date} has default ANCHOR speaker`,
    );
  }
  for (const group of ["vocabulary", "sentences"]) {
    for (const entry of article[group] || []) {
      if (entry.audioUrl) {
        const audioPath = path.join(
          "public",
          entry.audioUrl.replace(/^\/+/, ""),
        );
        assert(existsSync(audioPath), `audio missing: ${entry.audioUrl}`);
      }
    }
  }
}

const detailCount = readdirSync(articlesRoot).filter((name) =>
  name.endsWith(".json"),
).length;
assert(index.length === detailCount, "index/detail count mismatch");
console.log(`Validated ${index.length} article(s).`);
