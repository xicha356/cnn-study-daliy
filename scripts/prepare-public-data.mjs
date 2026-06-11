import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const legacyOutput = "output";
const publicDir = "public";
const publicData = path.join(publicDir, "data");
const publicArticles = path.join(publicData, "articles");
const publicAudio = path.join(publicDir, "audio");
const supportedLocales = [
  "zh-CN",
  "en",
  "km",
  "th",
  "vi",
  "id",
  "ms",
  "fil",
  "my",
  "lo",
];
const fallbackLocales = {
  "zh-CN": "zh-CN",
  en: "zh-CN",
  km: "zh-CN",
  th: "en",
  vi: "en",
  id: "en",
  ms: "en",
  fil: "en",
  my: "en",
  lo: "en",
};
const noisePatterns = [
  "CNNSTATICSECTION",
  "CNN.com - Transcripts",
  "Transcript Providers",
];

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSpeaker(value) {
  const speaker = cleanText(value);
  return speaker === "ANCHOR" || speaker === "REPORTER" ? "" : speaker;
}

function articleTitle(data, date) {
  const topic = data.topics?.[0]?.title;
  return topic
    ? `CNN This Morning · ${date} · ${topic}`
    : `CNN This Morning · ${date}`;
}

function normalizeAudioUrl(value) {
  const url = cleanText(value);
  if (!url) return "";
  return `/${url
    .replaceAll("\\", "/")
    .replace(/^output\/audio\//, "audio/")
    .replace(/^\/+/, "")}`;
}

function normalizeParagraphs(data) {
  const source = data.paragraphs || data.transcript_highlights || [];
  return source
    .map((item, index) => {
      const en = cleanText(item.en || item.text || "");
      return {
        id: `p${String(index + 1).padStart(3, "0")}`,
        speaker: cleanSpeaker(item.speaker),
        en,
        cn: cleanText(item.cn),
      };
    })
    .filter(
      (item) =>
        item.en && !noisePatterns.some((noise) => item.en.includes(noise)),
    );
}

function normalizeArticle(file) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const date = data.date || path.basename(file, ".json");
  const article = {
    date,
    title: articleTitle(data, date),
    sourceUrl: cleanText(data.source_url),
    summary: cleanText(data.summary),
    paragraphs: normalizeParagraphs(data),
    vocabulary: (data.vocabulary || []).map((item) => ({
      word: cleanText(item.word),
      phonetic: cleanText(item.phonetic),
      pos: cleanText(item.pos),
      level: cleanText(
        item.level || [item.usage, item.difficulty].filter(Boolean).join(" · "),
      ),
      usage: cleanText(item.usage),
      difficulty: cleanText(item.difficulty),
      domain: cleanText(item.domain),
      cn: cleanText(item.cn),
      en: cleanText(item.en),
      excerpt: cleanText(item.excerpt || item.example),
      exampleCn: cleanText(item.example_cn),
      audioUrl: normalizeAudioUrl(item.audio_url),
    })),
    sentences: (data.sentences || []).map((item) => ({
      en: cleanText(item.en),
      cn: cleanText(item.cn),
      structure: cleanText(item.structure),
      analysis: cleanText(item.analysis),
    })),
    topics: data.topics || [],
    quiz: data.quiz || [],
  };
  validateArticle(article);
  return article;
}

function validateArticle(article) {
  const raw = JSON.stringify(article);
  for (const noise of noisePatterns) {
    if (raw.includes(noise))
      throw new Error(`${article.date} contains transcript noise: ${noise}`);
  }
  for (const paragraph of article.paragraphs) {
    if (paragraph.speaker === "ANCHOR")
      throw new Error(`${article.date} contains default ANCHOR speaker`);
  }
}

function hasAudio(article) {
  return article.vocabulary.some((item) => item.audioUrl);
}

mkdirSync(publicArticles, { recursive: true });
for (const locale of supportedLocales) {
  mkdirSync(path.join(publicData, locale, "articles"), { recursive: true });
}

const articleFiles = existsSync(legacyOutput)
  ? readdirSync(legacyOutput)
      .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort()
      .reverse()
      .map((name) => path.join(legacyOutput, name))
  : [];

const localizedIndexes = Object.fromEntries(
  supportedLocales.map((locale) => [locale, []]),
);

function localizedArticleFile(locale, date) {
  if (locale === "zh-CN") return "";
  return path.join(legacyOutput, "i18n", locale, `${date}.json`);
}

function buildIndexItem(article) {
  return {
    date: article.date,
    title: article.title,
    summary: article.summary,
    sourceUrl: article.sourceUrl,
    hasAudio: hasAudio(article),
    vocabCount: article.vocabulary.length,
    sentenceCount: article.sentences.length,
  };
}

for (const file of articleFiles) {
  const article = normalizeArticle(file);
  writeFileSync(
    path.join(publicArticles, `${article.date}.json`),
    `${JSON.stringify(article, null, 2)}\n`,
  );
  localizedIndexes["zh-CN"].push(buildIndexItem(article));
  writeFileSync(
    path.join(publicData, "zh-CN", "articles", `${article.date}.json`),
    `${JSON.stringify(article, null, 2)}\n`,
  );

  const preparedByLocale = { "zh-CN": article };
  for (const locale of supportedLocales.filter((value) => value !== "zh-CN")) {
    const localFile = localizedArticleFile(locale, article.date);
    let localized = null;
    if (existsSync(localFile)) {
      localized = normalizeArticle(localFile);
      localized.date = article.date;
      localized.sourceUrl = article.sourceUrl;
      localized.vocabulary = localized.vocabulary.map((item, index) => ({
        ...item,
        word: article.vocabulary[index]?.word || item.word,
        phonetic: article.vocabulary[index]?.phonetic || item.phonetic,
        en: article.vocabulary[index]?.en || item.en,
        excerpt: article.vocabulary[index]?.excerpt || item.excerpt,
        audioUrl: article.vocabulary[index]?.audioUrl || item.audioUrl,
      }));
    } else {
      const fallback = fallbackLocales[locale] || "zh-CN";
      localized = preparedByLocale[fallback] || article;
      console.warn(
        `⚠ Missing ${locale} localization for ${article.date}; using ${fallback} fallback.`,
      );
    }
    preparedByLocale[locale] = localized;
    writeFileSync(
      path.join(publicData, locale, "articles", `${article.date}.json`),
      `${JSON.stringify(localized, null, 2)}\n`,
    );
    localizedIndexes[locale].push(buildIndexItem(localized));
  }
}

mkdirSync(publicData, { recursive: true });
const index = localizedIndexes["zh-CN"];
writeFileSync(
  path.join(publicData, "articles.json"),
  `${JSON.stringify(index, null, 2)}\n`,
);
for (const locale of supportedLocales) {
  writeFileSync(
    path.join(publicData, locale, "articles.json"),
    `${JSON.stringify(localizedIndexes[locale], null, 2)}\n`,
  );
}

const audioSrc = path.join(legacyOutput, "audio");
if (existsSync(audioSrc)) {
  if (existsSync(publicAudio))
    rmSync(publicAudio, { recursive: true, force: true });
  cpSync(audioSrc, publicAudio, { recursive: true });
}

console.log(`Prepared ${index.length} article(s) in ${publicData}`);
