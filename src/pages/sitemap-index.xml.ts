/** /sitemap-index.xml: lists the sitemap of each language. */
import type { APIRoute } from 'astro';
import { LOCALE_CODES } from '../i18n';
import { escapeXml, localeUrl, xmlResponse } from '../lib/site-pages';

export const GET: APIRoute = () =>
  xmlResponse(
    [
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...LOCALE_CODES.map((locale) => `  <sitemap><loc>${escapeXml(localeUrl(locale, '/sitemap.xml'))}</loc></sitemap>`),
      '</sitemapindex>',
    ].join('\n'),
  );
