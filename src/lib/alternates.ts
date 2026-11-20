import { SITE_URL } from '../config';
import { LOCALE_LIST, localePath } from '../i18n';

export interface Alternate {
  hreflang: string;
  href: string;
}

/**
 * Links to the same page in every language (hreflang), used in each page's
 * head and in the sitemap so the two always agree. `path` is the part after
 * /<locale>, e.g. '/health/symptoms/'.
 *
 * x-default is what search engines show readers whose language is not one of
 * ours: the language picker at the root for the home pages, and the English
 * version for every other page. (Search engines ignore an x-default that does
 * not link back, and the picker links back only to the home pages.)
 */
export function alternates(path: string): Alternate[] {
  const href = (p: string) => new URL(p, SITE_URL).href;
  return [
    ...LOCALE_LIST.map((l) => ({ hreflang: l.htmlLang, href: href(localePath(l.code, path)) })),
    { hreflang: 'x-default', href: href(path === '/' ? '/' : localePath('en', path)) },
  ];
}
