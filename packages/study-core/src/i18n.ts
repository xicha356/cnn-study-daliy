export const DEFAULT_LOCALE = "zh-CN" as const;

export const CORE_LOCALES = ["zh-CN", "km"] as const;

export const SUPPORTED_LOCALES = [
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
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export type LocaleConfig = {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  googleTranslateCode: string;
  htmlLang: string;
  ogLocale: string;
  dateLocale: string;
  fallbackLocale: LocaleCode;
};

export const LOCALE_CONFIGS: Record<LocaleCode, LocaleConfig> = {
  "zh-CN": {
    code: "zh-CN",
    label: "Chinese",
    nativeLabel: "中文",
    googleTranslateCode: "zh-CN",
    htmlLang: "zh-CN",
    ogLocale: "zh_CN",
    dateLocale: "zh-CN",
    fallbackLocale: "zh-CN",
  },
  en: {
    code: "en",
    label: "English",
    nativeLabel: "English",
    googleTranslateCode: "en",
    htmlLang: "en",
    ogLocale: "en_US",
    dateLocale: "en-US",
    fallbackLocale: "zh-CN",
  },
  km: {
    code: "km",
    label: "Khmer",
    nativeLabel: "ភាសាខ្មែរ",
    googleTranslateCode: "km",
    htmlLang: "km",
    ogLocale: "km_KH",
    dateLocale: "km-KH",
    fallbackLocale: "zh-CN",
  },
  th: {
    code: "th",
    label: "Thai",
    nativeLabel: "ไทย",
    googleTranslateCode: "th",
    htmlLang: "th",
    ogLocale: "th_TH",
    dateLocale: "th-TH",
    fallbackLocale: "en",
  },
  vi: {
    code: "vi",
    label: "Vietnamese",
    nativeLabel: "Tiếng Việt",
    googleTranslateCode: "vi",
    htmlLang: "vi",
    ogLocale: "vi_VN",
    dateLocale: "vi-VN",
    fallbackLocale: "en",
  },
  id: {
    code: "id",
    label: "Indonesian",
    nativeLabel: "Bahasa Indonesia",
    googleTranslateCode: "id",
    htmlLang: "id",
    ogLocale: "id_ID",
    dateLocale: "id-ID",
    fallbackLocale: "en",
  },
  ms: {
    code: "ms",
    label: "Malay",
    nativeLabel: "Bahasa Melayu",
    googleTranslateCode: "ms",
    htmlLang: "ms",
    ogLocale: "ms_MY",
    dateLocale: "ms-MY",
    fallbackLocale: "en",
  },
  fil: {
    code: "fil",
    label: "Filipino",
    nativeLabel: "Filipino",
    googleTranslateCode: "tl",
    htmlLang: "fil",
    ogLocale: "fil_PH",
    dateLocale: "fil-PH",
    fallbackLocale: "en",
  },
  my: {
    code: "my",
    label: "Burmese",
    nativeLabel: "မြန်မာ",
    googleTranslateCode: "my",
    htmlLang: "my",
    ogLocale: "my_MM",
    dateLocale: "my-MM",
    fallbackLocale: "en",
  },
  lo: {
    code: "lo",
    label: "Lao",
    nativeLabel: "ລາວ",
    googleTranslateCode: "lo",
    htmlLang: "lo",
    ogLocale: "lo_LA",
    dateLocale: "lo-LA",
    fallbackLocale: "en",
  },
};

export function isLocaleCode(value: string): value is LocaleCode {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value?: string | null): LocaleCode {
  if (!value) return DEFAULT_LOCALE;
  return isLocaleCode(value) ? value : DEFAULT_LOCALE;
}

export function getLocaleConfig(locale?: string | null): LocaleConfig {
  return LOCALE_CONFIGS[normalizeLocale(locale)];
}

export function localePath(locale: LocaleCode, path = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath === "/") return `/${locale}`;
  return `/${locale}${cleanPath}`;
}

export function stripLocaleFromPath(pathname: string): {
  locale: LocaleCode | null;
  path: string;
} {
  const [first, ...rest] = pathname.replace(/^\/+/, "").split("/");
  if (first && isLocaleCode(first)) {
    return {
      locale: first,
      path: `/${rest.join("/")}`.replace(/\/$/, "") || "/",
    };
  }
  return { locale: null, path: pathname || "/" };
}

export function switchLocalePath(pathname: string, nextLocale: LocaleCode) {
  const { path } = stripLocaleFromPath(pathname);
  return localePath(nextLocale, path);
}

export type UiCopy = {
  siteName: string;
  siteKicker: string;
  siteDescription: string;
  todayArticle: string;
  startLearning: string;
  articleLibrary: string;
  articles: string;
  words: string;
  sentences: string;
  audio: string;
  features: string;
  swipeHint: string;
  studyPath: string;
  steps: string[];
  noArticles: string;
  pastArticles: string;
  searchPlaceholder: string;
  filters: {
    all: string;
    recent: string;
    audio: string;
    studied: string;
    review: string;
  };
  tabs: {
    transcript: string;
    original: string;
    translation: string;
    vocabulary: string;
    sentences: string;
    background: string;
    quiz: string;
  };
  actions: {
    back: string;
    copy: string;
    copied: string;
    translate: string;
    showTranslation: string;
    hideTranslation: string;
    read: string;
    close: string;
    openVocabulary: string;
    source: string;
  };
  status: {
    loadingTranslation: string;
    noTranslation: string;
    translationFailed: string;
    noMeaning: string;
    meaningFailed: string;
    correct: string;
    wrong: string;
  };
  featureCards: Array<{ title: string; value: string; detail: string }>;
  heroTitle: string;
  heroText: string;
};

const englishCopy: UiCopy = {
  siteName: "CNN News Study",
  siteKicker: "News Study",
  siteDescription:
    "Daily CNN intensive reading with bilingual transcript, key vocabulary, sentence analysis, quizzes, and American pronunciation practice.",
  todayArticle: "Today",
  startLearning: "Start learning",
  articleLibrary: "Article library",
  articles: "Articles",
  words: "Words",
  sentences: "Sentences",
  audio: "Audio",
  features: "Features",
  swipeHint: "Swipe",
  studyPath: "Study path",
  steps: ["Read", "Check words", "Analyze sentences", "Quiz"],
  noArticles: "No article data yet. Generate public data first.",
  pastArticles: "Past articles",
  searchPlaceholder: "Search title, summary, or date",
  filters: {
    all: "All",
    recent: "Recent 7 days",
    audio: "Audio",
    studied: "Studied",
    review: "Review",
  },
  tabs: {
    transcript: "Transcript",
    original: "Original",
    translation: "Translation",
    vocabulary: "Vocabulary",
    sentences: "Sentences",
    background: "Background",
    quiz: "Quiz",
  },
  actions: {
    back: "Back",
    copy: "Copy",
    copied: "Copied",
    translate: "Translate",
    showTranslation: "Show translation",
    hideTranslation: "Hide translation",
    read: "Read aloud",
    close: "Close",
    openVocabulary: "Open vocabulary",
    source: "Source",
  },
  status: {
    loadingTranslation: "Loading translation...",
    noTranslation: "No translation yet. Tap to request it.",
    translationFailed: "Translation failed. Please try again later.",
    noMeaning: "No meaning yet",
    meaningFailed: "Meaning lookup failed. Please try again later.",
    correct: "Correct",
    wrong: "Review this one",
  },
  featureCards: [
    {
      title: "Vocabulary",
      value: "<=50",
      detail: "Key words are selected from the news context, not exam labels.",
    },
    {
      title: "Sentences",
      value: "20-30",
      detail: "Complex sentences are broken down for careful reading.",
    },
    {
      title: "Audio",
      value: "TTS",
      detail: "Vocabulary audio is prepared; passages are generated on demand.",
    },
    {
      title: "Quiz",
      value: "Quiz",
      detail: "Answer, read the explanation, and review what you missed.",
    },
  ],
  heroTitle: "Study one CNN story deeply every day.",
  heroText:
    "Read the English source first, then use your language for translation, vocabulary, grammar, background, quiz, and audio practice.",
};

const zhCopy: UiCopy = {
  ...englishCopy,
  siteName: "cnn 新闻精读",
  siteKicker: "News Study",
  siteDescription:
    "每日 CNN 新闻英语精读，提供双语全文、重点词汇、难句解析、测验和美式发音练习。",
  todayArticle: "今日文章",
  startLearning: "开始学习",
  articleLibrary: "文章库",
  articles: "文章",
  words: "词",
  sentences: "难句",
  audio: "音频",
  features: "功能",
  swipeHint: "横向滑动",
  studyPath: "学习路径",
  steps: ["读原文", "查词汇", "拆难句", "做测验"],
  noArticles: "暂无文章数据。请先生成 public/data 后再打开。",
  pastArticles: "往期文章",
  searchPlaceholder: "搜索标题、摘要或日期",
  filters: {
    all: "全部",
    recent: "最近7天",
    audio: "有音频",
    studied: "已学习",
    review: "待复习",
  },
  tabs: {
    transcript: "全文稿",
    original: "原文",
    translation: "翻译",
    vocabulary: "词汇",
    sentences: "难句",
    background: "背景",
    quiz: "测验",
  },
  actions: {
    back: "返回",
    copy: "复制",
    copied: "已复制",
    translate: "翻译",
    showTranslation: "显示翻译",
    hideTranslation: "隐藏翻译",
    read: "朗读",
    close: "关闭",
    openVocabulary: "打开词汇索引",
    source: "原文来源",
  },
  status: {
    loadingTranslation: "正在加载翻译...",
    noTranslation: "暂无翻译，点击获取翻译。",
    translationFailed: "翻译请求失败，请稍后重试",
    noMeaning: "暂无释义",
    meaningFailed: "释义查询失败，请稍后再试",
    correct: "回答正确",
    wrong: "再复习一下",
  },
  featureCards: [
    {
      title: "词汇",
      value: "<=50",
      detail: "按新闻语境抽重点词，不再用考试标签。",
    },
    {
      title: "难句",
      value: "20-30",
      detail: "单独生成长难句解析，适合逐句精读。",
    },
    {
      title: "朗读",
      value: "TTS",
      detail: "词汇预生成，段落和难句按需缓存播放。",
    },
    {
      title: "测验",
      value: "Quiz",
      detail: "选择后看解析，错题进入复习节奏。",
    },
  ],
  heroTitle: "每天一篇新闻，把英语拆开学。",
  heroText:
    "双语全文、重点词汇、长难句、测验和美式朗读，组合成一个可持续的精读流程。",
};

const localizedCopies: Partial<Record<LocaleCode, Partial<UiCopy>>> = {
  km: {
    siteName: "រៀនព័ត៌មាន CNN",
    siteDescription:
      "រៀនអង់គ្លេសពីព័ត៌មាន CNN រៀងរាល់ថ្ងៃ ជាមួយការបកប្រែ វាក្យសព្ទ ប្រយោគពិបាក សំណួរ និងសំឡេងអាមេរិក។",
    todayArticle: "អត្ថបទថ្ងៃនេះ",
    startLearning: "ចាប់ផ្តើមរៀន",
    articleLibrary: "បណ្ណាល័យអត្ថបទ",
    articles: "អត្ថបទ",
    words: "ពាក្យ",
    sentences: "ប្រយោគ",
    audio: "សំឡេង",
    features: "មុខងារ",
    swipeHint: "អូសមើល",
    studyPath: "លំហូរសិក្សា",
    steps: ["អានអង់គ្លេស", "មើលវាក្យសព្ទ", "វិភាគប្រយោគ", "ធ្វើតេស្ត"],
    noArticles: "មិនទាន់មានទិន្នន័យអត្ថបទទេ។",
    pastArticles: "អត្ថបទមុនៗ",
    searchPlaceholder: "ស្វែងរកចំណងជើង សង្ខេប ឬកាលបរិច្ឆេទ",
    heroTitle: "រៀនព័ត៌មាន CNN មួយអត្ថបទឱ្យស៊ីជម្រៅរៀងរាល់ថ្ងៃ។",
    heroText:
      "អត្ថបទអង់គ្លេសគឺជាចំណុចកណ្តាល ហើយភាសារបស់អ្នកជួយពន្យល់ការបកប្រែ វាក្យសព្ទ វេយ្យាករណ៍ និងសំណួរ។",
  },
  th: {
    siteName: "เรียนข่าว CNN",
    todayArticle: "บทความวันนี้",
    startLearning: "เริ่มเรียน",
    articleLibrary: "คลังบทความ",
    words: "คำศัพท์",
    sentences: "ประโยค",
    heroTitle: "เรียนข่าว CNN อย่างลึกซึ้งวันละหนึ่งเรื่อง",
  },
  vi: {
    siteName: "Học tin tức CNN",
    todayArticle: "Bài hôm nay",
    startLearning: "Bắt đầu học",
    articleLibrary: "Thư viện bài viết",
    words: "Từ vựng",
    sentences: "Câu khó",
    heroTitle: "Mỗi ngày học sâu một bản tin CNN.",
  },
  id: {
    siteName: "Belajar Berita CNN",
    todayArticle: "Artikel hari ini",
    startLearning: "Mulai belajar",
    articleLibrary: "Pustaka artikel",
    words: "Kosakata",
    sentences: "Kalimat",
    heroTitle: "Pelajari satu berita CNN secara mendalam setiap hari.",
  },
  ms: {
    siteName: "Belajar Berita CNN",
    todayArticle: "Artikel hari ini",
    startLearning: "Mula belajar",
    articleLibrary: "Pustaka artikel",
    words: "Kosa kata",
    sentences: "Ayat",
    heroTitle: "Pelajari satu berita CNN dengan mendalam setiap hari.",
  },
  fil: {
    siteName: "CNN News Study",
    todayArticle: "Artikulo ngayon",
    startLearning: "Magsimulang matuto",
    articleLibrary: "Aklatan ng artikulo",
    words: "Bokabularyo",
    sentences: "Pangungusap",
    heroTitle: "Pag-aralan nang malalim ang isang balita ng CNN araw-araw.",
  },
  my: {
    siteName: "CNN သတင်းလေ့လာရေး",
    todayArticle: "ယနေ့ဆောင်းပါး",
    startLearning: "စတင်လေ့လာမည်",
    articleLibrary: "ဆောင်းပါးစာကြည့်တိုက်",
    words: "ဝေါဟာရ",
    sentences: "ဝါကျ",
    heroTitle: "နေ့စဉ် CNN သတင်းတစ်ပုဒ်ကို နက်နက်ရှိုင်းရှိုင်း လေ့လာပါ။",
  },
  lo: {
    siteName: "ຮຽນຂ່າວ CNN",
    todayArticle: "ບົດຄວາມມື້ນີ້",
    startLearning: "ເລີ່ມຮຽນ",
    articleLibrary: "ຄັງບົດຄວາມ",
    words: "ຄຳສັບ",
    sentences: "ປະໂຫຍກ",
    heroTitle: "ຮຽນຂ່າວ CNN ໃຫ້ເລິກມື້ລະໜຶ່ງບົດ.",
  },
};

function mergeCopy(locale: LocaleCode): UiCopy {
  if (locale === "zh-CN") return zhCopy;
  if (locale === "en") return englishCopy;
  return {
    ...englishCopy,
    ...localizedCopies[locale],
    filters: {
      ...englishCopy.filters,
      ...localizedCopies[locale]?.filters,
    },
    tabs: {
      ...englishCopy.tabs,
      ...localizedCopies[locale]?.tabs,
    },
    actions: {
      ...englishCopy.actions,
      ...localizedCopies[locale]?.actions,
    },
    status: {
      ...englishCopy.status,
      ...localizedCopies[locale]?.status,
    },
  };
}

export function getUiCopy(locale?: string | null): UiCopy {
  return mergeCopy(normalizeLocale(locale));
}
