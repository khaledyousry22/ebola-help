/** /<locale>/manifest.webmanifest: opens the site in that language from the home screen. */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getMessages, LOCALE_CODES, LOCALES, localePath, type Locale } from '../../i18n';
import { manifest } from '../../lib/manifest';

export const getStaticPaths = (() => LOCALE_CODES.map((locale) => ({ params: { locale } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const locale = params.locale as Locale;
  const info = LOCALES[locale];
  return manifest({
    lang: info.htmlLang,
    dir: info.dir,
    description: getMessages(locale).meta.homeDescription,
    startUrl: localePath(locale),
  });
};
