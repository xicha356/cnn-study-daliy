import {
  SUPPORTED_LOCALES,
  getUiCopy,
  normalizeLocale,
} from "@study/core/i18n";
import { buildLanguageAlternates } from "@study/core/seo";
import type { Metadata } from "next";
import { SettingsPage } from "../../components/SettingsPage";
import { getMobileCopy } from "../../components/mobileCopy";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const copy = getUiCopy(locale);
  const mobileCopy = getMobileCopy(locale);

  return {
    title: mobileCopy.settings.title,
    description: copy.siteDescription,
    alternates: {
      canonical: `/${locale}/settings`,
      languages: buildLanguageAlternates("/settings"),
    },
  };
}

export default async function LocaleSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  return <SettingsPage locale={locale} />;
}
