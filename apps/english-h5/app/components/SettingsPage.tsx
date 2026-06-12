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

function getHapticTestLabel(locale: LocaleCode) {
  const labels: Record<LocaleCode, string> = {
    "zh-CN": "测试",
    km: "សាកល្បង",
    id: "Tes",
  };
  return labels[locale];
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

export function SettingsPage({ locale }: { locale: LocaleCode }) {
  const mobileCopy = getMobileCopy(locale);
  const currentLocale = getLocaleConfig(locale);
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
      <header className="safe-x sticky top-0 z-30 border-b border-line bg-bg/92 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-xl">
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
        <div className="rounded-[8px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
          <p className="text-sm font-semibold leading-6 text-sub">
            {mobileCopy.settings.subtitle}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[8px] bg-muted p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-sub">
                {mobileCopy.settings.language}
              </p>
              <p className="mt-2 truncate text-sm font-black text-text">
                {currentLocale.nativeLabel}
              </p>
            </div>
            <div className="rounded-[8px] bg-muted p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-sub">
                {mobileCopy.settings.appearance}
              </p>
              <p className="mt-2 text-sm font-black text-text">
                {getThemeLabel(theme, locale)}
              </p>
            </div>
            <div className="rounded-[8px] bg-muted p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-sub">
                {mobileCopy.settings.speed}
              </p>
              <p className="mt-2 text-sm font-black text-brand">
                {speed.toFixed(2)}x
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[8px] border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-base font-black text-text">
              {mobileCopy.settings.appearance}
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
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-text">
                  {mobileCopy.settings.haptics}
                </h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-sub">
                  {mobileCopy.settings.hapticsHint}
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
                  {getHapticTestLabel(locale)}
                </button>
                <HapticToggle compact />
              </div>
            </div>
          </div>
        </div>

        <article className="mt-4 rounded-[8px] border border-line bg-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-text">
                {mobileCopy.settings.audio}
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-sub">
                {mobileCopy.settings.audioHint}
              </p>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-black text-brand">
              {speed.toFixed(2)}x
            </span>
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-sub">
              {mobileCopy.settings.speed}
            </span>
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
              className="w-full accent-brand"
              aria-label={mobileCopy.settings.speed}
            />
          </label>
        </article>
      </section>

      <TabBar locale={locale} />
    </main>
  );
}
