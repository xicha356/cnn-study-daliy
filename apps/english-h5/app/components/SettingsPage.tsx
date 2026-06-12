"use client";

import {
  getGlobalPlaybackRate,
  setGlobalPlaybackRate,
  subscribeAudioPlayer,
} from "@study/core/audio";
import { type LocaleCode, getLocaleConfig } from "@study/core/i18n";
import { getStoredTheme } from "@study/core/storage";
import { LanguageSwitcher } from "@study/ui/LanguageSwitcher";
import { useEffect, useState } from "react";
import { type HapticResult, haptic, testHaptic } from "../lib/haptics";
import { HapticToggle } from "./HapticToggle";
import { TabBar } from "./TabBar";
import { ThemeToggle } from "./ThemeToggle";
import { getMobileCopy } from "./mobileCopy";

type Theme = "light" | "dark";

function getThemeLabel(theme: Theme, locale: LocaleCode) {
  const labels: Record<LocaleCode, Record<Theme, string>> = {
    "zh-CN": { light: "白天", dark: "黑夜" },
    km: { light: "ភ្លឺ", dark: "ងងឹត" },
    id: { light: "Siang", dark: "Malam" },
  };
  return labels[locale][theme];
}

function getHapticStatusText(locale: LocaleCode, result: HapticResult) {
  const copy: Record<LocaleCode, Record<HapticResult["reason"], string>> = {
    "zh-CN": {
      ok: "已向浏览器发送震动。若手机没有震动，请检查系统震动、勿扰和省电设置。",
      unsupported: "当前浏览器不支持 Web 震动 API。",
      disabled: "触感反馈已关闭。",
      hidden: "页面不可见时浏览器会拦截震动。",
      "rate-limited": "触发太频繁，已自动限频。",
      error: "浏览器拒绝了本次震动请求。",
    },
    km: {
      ok: "បានផ្ញើសំណើរំញ័រទៅកម្មវិធីរុករក។ បើមិនរំញ័រ សូមពិនិត្យការកំណត់រំញ័រ Do Not Disturb និងសន្សំថាមពល។",
      unsupported: "កម្មវិធីរុករកនេះមិនគាំទ្រ Web Vibration API ទេ។",
      disabled: "ប្រតិកម្មរំញ័រត្រូវបានបិទ។",
      hidden: "កម្មវិធីរុករកទប់ស្កាត់រំញ័រ ពេលទំព័រមិនបង្ហាញ។",
      "rate-limited": "ប៉ះញឹកពេក ដូច្នេះបានកំណត់ល្បឿន។",
      error: "កម្មវិធីរុករកបានបដិសេធសំណើរំញ័រនេះ។",
    },
    id: {
      ok: "Permintaan getaran sudah dikirim ke browser. Jika ponsel tidak bergetar, cek setelan getar, Jangan Ganggu, dan hemat daya.",
      unsupported: "Browser ini tidak mendukung Web Vibration API.",
      disabled: "Umpan balik getar sedang nonaktif.",
      hidden: "Browser memblokir getaran saat halaman tidak terlihat.",
      "rate-limited": "Terlalu sering dipicu, jadi getaran dibatasi.",
      error: "Browser menolak permintaan getaran ini.",
    },
  };
  return copy[locale][result.reason];
}

function getAuthorCopy(locale: LocaleCode) {
  const copy: Record<
    LocaleCode,
    {
      label: string;
      name: string;
      role: string;
      telegram: string;
      hapticTest: string;
      hapticNote: string;
      preferences: string;
    }
  > = {
    "zh-CN": {
      label: "作者",
      name: "xicha356",
      role: "软件工程师",
      telegram: "Telegram",
      hapticTest: "测试",
      hapticNote:
        "Web 震动由浏览器和系统共同决定，若测试无震动通常是系统层拦截。",
      preferences: "偏好",
    },
    km: {
      label: "អ្នកបង្កើត",
      name: "xicha356",
      role: "វិស្វករផ្នែកទន់",
      telegram: "Telegram",
      hapticTest: "សាកល្បង",
      hapticNote:
        "ការរំញ័រ Web អាស្រ័យលើកម្មវិធីរុករក និងប្រព័ន្ធ។ បើតេស្តហើយមិនរំញ័រ ជាទូទៅប្រព័ន្ធបានទប់ស្កាត់។",
      preferences: "ចំណូលចិត្ត",
    },
    id: {
      label: "Pembuat",
      name: "xicha356",
      role: "Software Engineer",
      telegram: "Telegram",
      hapticTest: "Tes",
      hapticNote:
        "Getaran web ditentukan browser dan sistem. Jika tes tidak terasa, biasanya diblokir di level sistem.",
      preferences: "Preferensi",
    },
  };
  return copy[locale];
}

export function SettingsPage({ locale }: { locale: LocaleCode }) {
  const mobileCopy = getMobileCopy(locale);
  const currentLocale = getLocaleConfig(locale);
  const authorCopy = getAuthorCopy(locale);
  const [speed, setSpeed] = useState(1);
  const [theme, setTheme] = useState<Theme>("dark");
  const [hapticStatus, setHapticStatus] = useState<HapticResult | null>(null);

  useEffect(() => {
    setSpeed(getGlobalPlaybackRate());
    setTheme(getStoredTheme() === "light" ? "light" : "dark");
    return subscribeAudioPlayer((player) => setSpeed(player.speed));
  }, []);

  function changeSpeed(value: number) {
    setGlobalPlaybackRate(value);
    setSpeed(value);
  }

  function runHapticTest() {
    setHapticStatus(testHaptic());
  }

  return (
    <main className="min-h-dvh bg-bg pb-28 text-text">
      <header className="safe-x sticky top-0 z-30 border-b border-line bg-bg/92 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">
              {currentLocale.nativeLabel}
            </p>
            <h1 className="mt-1 text-2xl font-black text-text">
              {mobileCopy.settings.title}
            </h1>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-brand text-base font-black text-white">
            ⚙
          </span>
        </div>
      </header>

      <section className="safe-x mx-auto max-w-screen-sm py-4">
        <article className="rounded-[8px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
          <div className="flex items-center gap-4">
            <img
              src="/images/author-avatar.png"
              alt={authorCopy.label}
              className="h-16 w-16 shrink-0 rounded-[8px] object-cover ring-1 ring-line"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">
                {authorCopy.label}
              </p>
              <h2 className="mt-1 truncate text-lg font-black text-text">
                {authorCopy.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-sub">
                {authorCopy.role}
              </p>
            </div>
            <a
              href="https://t.me/xicha356"
              target="_blank"
              rel="noreferrer"
              className="tap-highlight rounded-full bg-brand px-3 py-2 text-xs font-black text-white active:scale-95"
            >
              {authorCopy.telegram}
            </a>
          </div>
        </article>

        <div className="mt-4 overflow-hidden rounded-[8px] border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-base font-black text-text">
              {authorCopy.preferences}
            </h2>
          </div>
          <div className="divide-y divide-line">
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div>
                <h3 className="text-sm font-black text-text">
                  {mobileCopy.settings.language}
                </h3>
                <p className="mt-1 text-xs font-semibold text-sub">
                  {mobileCopy.settings.languageHint}
                </p>
              </div>
              <LanguageSwitcher locale={locale} compact />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div>
                <h3 className="text-sm font-black text-text">
                  {mobileCopy.settings.appearance}
                </h3>
                <p className="mt-1 text-xs font-semibold text-sub">
                  {getThemeLabel(theme, locale)}
                </p>
              </div>
              <ThemeToggle compact onThemeChange={setTheme} />
            </div>
            <div className="px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-text">
                    {mobileCopy.settings.audio}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-sub">
                    {speed.toFixed(2)}x
                  </p>
                </div>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-black text-brand">
                  {speed.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={speed}
                onChange={(event) =>
                  changeSpeed(Number(event.currentTarget.value))
                }
                onPointerUp={() => haptic("scrub")}
                className="mt-4 w-full accent-brand"
                aria-label={mobileCopy.settings.speed}
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-text">
                  {mobileCopy.settings.haptics}
                </h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-sub">
                  {authorCopy.hapticNote}
                </p>
                {hapticStatus ? (
                  <p className="mt-2 text-xs font-semibold leading-5 text-brand">
                    {getHapticStatusText(locale, hapticStatus)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={runHapticTest}
                  className="tap-highlight h-9 rounded-full border border-line bg-muted px-3 text-xs font-black text-text transition active:scale-95"
                >
                  {authorCopy.hapticTest}
                </button>
                <HapticToggle compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      <TabBar locale={locale} />
    </main>
  );
}
