/**
 * /sitemap.xml: every page in every language, plus the language picker at
 * the root, for search engines. Each page lists its versions in the other
 * languages (hreflang), exactly as in the page's own head.
 */
import type { APIRoute } from 'astro';
import { LOCALE_CODES } from '../i18n';
import { alternates } from '../lib/alternates';
import { absoluteUrl, escapeXml, localePages, localeUrl, xmlResponse } from '../lib/site-pages';

function entry(loc: string, path: string, lastmod?: string): string {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    ...alternates(path).map(
      (link) => `    <xhtml:link rel="alternate" hreflang="${link.hreflang}" href="${escapeXml(link.href)}"/>`,
    ),
    '  </url>',
  ].join('\n');
}

export const GET: APIRoute = async () => {
  const urls = [entry(absoluteUrl('/'), '/')];
  for (const locale of LOCALE_CODES) {
    for (const page of await localePages(locale)) urls.push(entry(localeUrl(locale, page.path), page.path, page.lastmod));
  }
  return xmlResponse(
    [
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...urls,
      '</urlset>',
    ].join('\n'),
  );
};
