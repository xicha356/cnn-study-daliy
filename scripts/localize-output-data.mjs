import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const outputDir = "output";
const i18nDir = path.join(outputDir, "i18n");
const localeTargets = {
  en: "en",
  km: "km",
  th: "th",
  vi: "vi",
  id: "id",
  ms: "ms",
  fil: "tl",
  my: "my",
  lo: "lo",
};

const requestedLocales = (process.env.TARGET_LOCALES || "km")
  .split(",")
  .map((item) => item.trim())
  .filter((item) => item && localeTargets[item]);
const maxArticles = Number.parseInt(process.env.MAX_ARTICLES || "", 10);
const concurrency = Number.parseInt(
  process.env.TRANSLATE_CONCURRENCY || "8",
  10,
);
const translationCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateText(text, locale) {
  const value = String(text || "").trim();
  if (!value) return "";
  const cacheKey = `${locale}:${value}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);
  const target = localeTargets[locale];
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${target}&dt=t&q=${encodeURIComponent(value)}`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data) || !Array.isArray(data[0])) return value;
      const translated = data[0]
        .map((part) => String(part?.[0] || ""))
        .join("")
        .trim();
      translationCache.set(cacheKey, translated);
      return translated;
    } catch (error) {
      if (attempt === 3) {
        console.warn(
          `⚠ ${locale} translate failed: ${value.slice(0, 48)} (${error})`,
        );
        translationCache.set(cacheKey, value);
        return value;
      }
      await sleep(500 * attempt);
    }
  }
  return value;
}

async function localizeArticle(article, locale) {
  const localized = structuredClone(article);
  const tasks = [];

  function addTask(object, key) {
    if (!object?.[key]) return;
    tasks.push(async () => {
      object[key] = await translateText(object[key], locale);
    });
  }

  addTask(localized, "summary");
  for (const paragraph of localized.paragraphs || []) addTask(paragraph, "cn");
  for (const item of localized.vocabulary || []) {
    for (const key of ["usage", "difficulty", "domain", "cn", "example_cn"]) {
      addTask(item, key);
    }
  }
  for (const item of localized.sentences || []) {
    for (const key of ["cn", "structure", "analysis"]) addTask(item, key);
  }
  for (const topic of localized.topics || []) {
    for (const key of ["title", "content", "keywords"]) addTask(topic, key);
  }
  for (const item of localized.quiz || []) {
    addTask(item, "question");
    addTask(item, "explanation");
    item.options = item.options || [];
    item.options.forEach((_, index) => {
      tasks.push(async () => {
        item.options[index] = await translateText(item.options[index], locale);
      });
    });
  }

  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (cursor < tasks.length) {
        const task = tasks[cursor];
        cursor += 1;
        await task();
      }
    }),
  );

  for (const item of localized.vocabulary || []) {
    item.level = [item.usage, item.difficulty].filter(Boolean).join(" · ");
  }
  return localized;
}

const articleFiles = existsSync(outputDir)
  ? readdirSync(outputDir)
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort()
      .reverse()
  : [];
const selectedArticleFiles = Number.isFinite(maxArticles)
  ? articleFiles.slice(0, Math.max(0, maxArticles))
  : articleFiles;

for (const locale of requestedLocales) {
  for (const file of selectedArticleFiles) {
    const date = path.basename(file, ".json");
    const targetPath = path.join(i18nDir, locale, file);
    if (existsSync(targetPath) && process.env.FORCE_REGENERATE !== "true") {
      console.log(`✓ ${locale} cache exists: ${date}`);
      continue;
    }
    const source = JSON.parse(readFileSync(path.join(outputDir, file), "utf8"));
    console.log(`Localizing ${date} -> ${locale}`);
    const localized = await localizeArticle(source, locale);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, `${JSON.stringify(localized, null, 2)}\n`);
  }
}
