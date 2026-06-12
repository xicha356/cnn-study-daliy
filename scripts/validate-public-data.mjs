import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const dataRoot = path.join("public", "data");
const articlesRoot = path.join(dataRoot, "articles");
const supportedLocales = ["zh-CN", "km", "id"];
const coreLocales = ["zh-CN", "km", "id"];
const noisePatterns = [
  "CNNSTATICSECTION",
  "CNN.com - Transcripts",
  "Transcript Providers",
];
const maxVocabItems = 50;
const maxSentenceItems = 30;

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
  assert(
    (article.vocabulary || []).length <= maxVocabItems,
    `${item.date} has more than ${maxVocabItems} vocabulary items`,
  );
  assert(
    (article.sentences || []).length <= maxSentenceItems,
    `${item.date} has more than ${maxSentenceItems} sentence items`,
  );
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

for (const locale of supportedLocales) {
  const localeRoot = path.join(dataRoot, locale);
  const localeIndexPath = path.join(localeRoot, "articles.json");
  const localeArticlesRoot = path.join(localeRoot, "articles");
  assert(existsSync(localeIndexPath), `${locale} article index is missing`);
  assert(
    existsSync(localeArticlesRoot),
    `${locale} article details are missing`,
  );

  const localeIndex = JSON.parse(readFileSync(localeIndexPath, "utf8"));
  assert(
    localeIndex.length === index.length,
    `${locale} index count mismatch: ${localeIndex.length} != ${index.length}`,
  );

  for (const item of index) {
    const localeItem = localeIndex.find((entry) => entry.date === item.date);
    assert(localeItem, `${locale} index missing date: ${item.date}`);
    const detailPath = path.join(localeArticlesRoot, `${item.date}.json`);
    assert(existsSync(detailPath), `${locale} detail missing: ${item.date}`);
    const article = JSON.parse(readFileSync(detailPath, "utf8"));
    assert(article.date === item.date, `${locale} detail date mismatch`);
    assert(
      (article.vocabulary || []).length === item.vocabCount,
      `${locale} vocabulary count drift: ${item.date}`,
    );
    assert(
      (article.sentences || []).length === item.sentenceCount,
      `${locale} sentence count drift: ${item.date}`,
    );
    for (const group of ["vocabulary", "sentences"]) {
      for (const entry of article[group] || []) {
        if (entry.audioUrl) {
          const audioPath = path.join(
            "public",
            entry.audioUrl.replace(/^\/+/, ""),
          );
          assert(
            existsSync(audioPath),
            `${locale} audio missing: ${entry.audioUrl}`,
          );
        }
      }
    }
  }
}

for (const locale of coreLocales) {
  const localeIndexPath = path.join(dataRoot, locale, "articles.json");
  assert(existsSync(localeIndexPath), `core locale missing: ${locale}`);
}
console.log(`Validated ${index.length} article(s).`);
