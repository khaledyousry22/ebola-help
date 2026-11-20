/**
 * /sitemap-index.xml: kept because Google Search Console may already know
 * this address. It points to /sitemap.xml, the one list of all pages.
 */
import type { APIRoute } from 'astro';
import { absoluteUrl, xmlResponse } from '../lib/site-pages';

export const GET: APIRoute = () =>
  xmlResponse(
    [
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      `  <sitemap><loc>${absoluteUrl('/sitemap.xml')}</loc></sitemap>`,
      '</sitemapindex>',
    ].join('\n'),
  );
