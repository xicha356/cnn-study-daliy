export type VocabStatus = "" | "reviewing" | "mastered";

export type ArticleIndexItem = {
  date: string;
  title: string;
  summary: string;
  sourceUrl: string;
  hasAudio: boolean;
  vocabCount: number;
  sentenceCount: number;
};

export type Paragraph = {
  id: string;
  speaker?: string;
  en: string;
  /** Localized learner-facing translation for the current article locale. */
  cn?: string;
};

export type VocabularyItem = {
  word: string;
  phonetic?: string;
  pos?: string;
  level?: string;
  usage?: string;
  difficulty?: string;
  domain?: string;
  /** Localized learner-facing meaning for the current article locale. */
  cn: string;
  en?: string;
  excerpt?: string;
  /** Localized translation of the example/excerpt for the current article locale. */
  exampleCn?: string;
  audioUrl?: string;
};

export type SentenceItem = {
  en: string;
  cn: string;
  structure?: string;
  analysis?: string;
  audioUrl?: string;
};

export type TopicItem = {
  title: string;
  content: string;
  keywords?: string;
};

export type QuizItem = {
  type: "vocab" | "sentence";
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
};

export type StudyArticle = {
  date: string;
  title: string;
  sourceUrl: string;
  summary: string;
  paragraphs: Paragraph[];
  vocabulary: VocabularyItem[];
  sentences: SentenceItem[];
  topics: TopicItem[];
  quiz: QuizItem[];
};

export type WordHit = {
  start: number;
  end: number;
  word: string;
  vocab: VocabularyItem;
};
