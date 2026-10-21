/**
 * /<locale>/sitemap.xml: every page in one language, each with links to the
 * same page in the other languages (hreflang), as search engines recommend.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { LOCALE_CODES, LOCALE_LIST, type Locale } from '../../i18n';
import { absoluteUrl, escapeXml, localePages, localeUrl, xmlResponse } from '../../lib/site-pages';

export const getStaticPaths = (() => LOCALE_CODES.map((locale) => ({ params: { locale } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale as Locale;
  const urls = (await localePages()).map((path) => {
    const alternates = LOCALE_LIST.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${l.htmlLang}" href="${escapeXml(localeUrl(l.code, path))}"/>`,
    );
    if (path === '/') alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl('/')}"/>`);
    return ['  <url>', `    <loc>${escapeXml(localeUrl(locale, path))}</loc>`, ...alternates, '  </url>'].join('\n');
  });
  return xmlResponse(
    [
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...urls,
      '</urlset>',
    ].join('\n'),
  );
};
