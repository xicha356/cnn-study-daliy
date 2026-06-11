import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@study/core/i18n";

type LocaleRedirectScriptProps = {
  path?: string;
};

export function LocaleRedirectScript({
  path = "/",
}: LocaleRedirectScriptProps) {
  const code = `
    (function () {
      try {
        var supported = ${JSON.stringify(SUPPORTED_LOCALES)};
        var stored = window.localStorage.getItem('cnn_locale') || ${JSON.stringify(DEFAULT_LOCALE)};
        var locale = supported.indexOf(stored) >= 0 ? stored : ${JSON.stringify(DEFAULT_LOCALE)};
        var path = ${JSON.stringify(path)};
        if (!path || path.charAt(0) !== '/') path = '/' + path;
        var target = '/' + locale + (path === '/' ? '' : path) + window.location.search + window.location.hash;
        if (target !== window.location.pathname + window.location.search + window.location.hash) {
          window.location.replace(target);
        }
      } catch (_) {}
    })();
  `;

  // biome-ignore lint/security/noDangerouslySetInnerHtml: tiny boot script preserves old URLs while honoring the stored locale.
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
