"use client";

import { type LocaleCode, localePath } from "@study/core/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "../lib/haptics";
import { getMobileCopy } from "./mobileCopy";

type TabKey = "home" | "articles" | "settings";

function tabPath(locale: LocaleCode, key: TabKey) {
  if (key === "home") return localePath(locale);
  return localePath(locale, `/${key}`);
}

function tabIcon(key: TabKey) {
  if (key === "home") return "⌂";
  if (key === "articles") return "☰";
  return "⚙";
}

export function TabBar({ locale }: { locale: LocaleCode }) {
  const pathname = usePathname();
  const mobileCopy = getMobileCopy(locale);
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "home", label: mobileCopy.nav.home },
    { key: "articles", label: mobileCopy.nav.articles },
    { key: "settings", label: mobileCopy.nav.settings },
  ];

  function isActive(key: TabKey) {
    const path = tabPath(locale, key);
    if (key === "home") return pathname === path || pathname === `${path}/`;
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/96 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_40px_rgb(0_0_0/0.18)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-screen-sm grid-cols-3 gap-3">
        {tabs.map((tab) => {
          const active = isActive(tab.key);
          return (
            <Link
              key={tab.key}
              href={tabPath(locale, tab.key)}
              onClick={() => {
                if (!active) haptic("selection");
              }}
              aria-label={tab.label}
              title={tab.label}
              className={[
                "tap-highlight mx-auto flex h-11 w-16 items-center justify-center rounded-[8px] text-base font-black transition active:scale-[0.98]",
                active ? "bg-brand text-white" : "text-sub",
              ].join(" ")}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {tabIcon(tab.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
