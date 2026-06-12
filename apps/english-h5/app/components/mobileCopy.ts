import type { LocaleCode } from "@study/core/i18n";

type MobileCopy = {
  nav: {
    home: string;
    articles: string;
    settings: string;
  };
  settings: {
    title: string;
    subtitle: string;
    appearance: string;
    language: string;
    languageHint: string;
    audio: string;
    audioHint: string;
    speed: string;
    haptics: string;
    hapticsHint: string;
  };
  articleDrawer: {
    open: string;
    title: string;
    close: string;
  };
};

const mobileCopies: Record<LocaleCode, MobileCopy> = {
  "zh-CN": {
    nav: {
      home: "首页",
      articles: "文章",
      settings: "设置",
    },
    settings: {
      title: "设置",
      subtitle: "调整阅读、朗读和触感偏好。",
      appearance: "主题",
      language: "语言",
      languageHint: "切换学习解释语言",
      audio: "朗读",
      audioHint: "影响单词、句子和段落播放器",
      speed: "全局倍速",
      haptics: "触感",
      hapticsHint: "支持的 Android 浏览器会触发震动反馈",
    },
    articleDrawer: {
      open: "打开文章列表",
      title: "文章列表",
      close: "关闭文章列表",
    },
  },
  km: {
    nav: {
      home: "ទំព័រដើម",
      articles: "អត្ថបទ",
      settings: "ការកំណត់",
    },
    settings: {
      title: "ការកំណត់",
      subtitle: "កែសម្រួលការអាន សំឡេង និងប្រតិកម្មរំញ័រ។",
      appearance: "រូបរាង",
      language: "ភាសា",
      languageHint: "ប្ដូរភាសាពន្យល់សម្រាប់ការសិក្សា",
      audio: "សំឡេងអាន",
      audioHint: "អនុវត្តចំពោះពាក្យ ប្រយោគ និងកថាខណ្ឌ",
      speed: "ល្បឿនសកល",
      haptics: "រំញ័រ",
      hapticsHint: "ដំណើរការលើកម្មវិធីរុករក Android ដែលគាំទ្រ",
    },
    articleDrawer: {
      open: "បើកបញ្ជីអត្ថបទ",
      title: "បញ្ជីអត្ថបទ",
      close: "បិទបញ្ជីអត្ថបទ",
    },
  },
  id: {
    nav: {
      home: "Beranda",
      articles: "Artikel",
      settings: "Pengaturan",
    },
    settings: {
      title: "Pengaturan",
      subtitle: "Atur preferensi membaca, audio, dan getaran.",
      appearance: "Tema",
      language: "Bahasa",
      languageHint: "Ganti bahasa penjelasan belajar",
      audio: "Audio",
      audioHint: "Berlaku untuk pemutar kata, kalimat, dan paragraf",
      speed: "Kecepatan global",
      haptics: "Getaran",
      hapticsHint: "Aktif di browser Android yang mendukung",
    },
    articleDrawer: {
      open: "Buka daftar artikel",
      title: "Daftar artikel",
      close: "Tutup daftar artikel",
    },
  },
};

export function getMobileCopy(locale: LocaleCode) {
  return mobileCopies[locale];
}
