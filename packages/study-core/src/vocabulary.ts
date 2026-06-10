import type { StudyArticle, VocabularyItem } from "./types";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findWordPosition(article: StudyArticle, word: string) {
  const cleanWord = word.trim();
  if (!cleanWord) return null;

  const matcher = new RegExp(
    `(?:^|[^A-Za-z])(${escapeRegExp(cleanWord)})(?=$|[^A-Za-z])`,
    "i",
  );

  for (
    let paragraphIndex = 0;
    paragraphIndex < article.paragraphs.length;
    paragraphIndex += 1
  ) {
    const paragraph = article.paragraphs[paragraphIndex];
    const match = paragraph.en.match(matcher);
    if (match?.index !== undefined) {
      return {
        paragraphIndex,
        charIndex: match.index + match[0].length - match[1].length,
      };
    }
  }

  return null;
}

export function orderVocabularyByArticle(
  article: StudyArticle,
): VocabularyItem[] {
  return article.vocabulary
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      position: findWordPosition(article, item.word),
    }))
    .sort((left, right) => {
      if (!left.position && !right.position) {
        return left.originalIndex - right.originalIndex;
      }
      if (!left.position) return 1;
      if (!right.position) return -1;
      if (left.position.paragraphIndex !== right.position.paragraphIndex) {
        return left.position.paragraphIndex - right.position.paragraphIndex;
      }
      if (left.position.charIndex !== right.position.charIndex) {
        return left.position.charIndex - right.position.charIndex;
      }
      return left.originalIndex - right.originalIndex;
    })
    .map(({ item }) => item);
}
