import { SITE_URL } from '../config';
import { localePath, type Locale } from '../i18n';
import { COUNTRY_PAGES, countryPath } from './country-pages';
import { getHealthPages, splitHealthId } from './health';
import { getUpdates, isoDay, updatePath } from './updates';
import { getInfoPage, INFO_PAGES } from './info';

export { NOINDEX_PAGES } from './indexing';

export interface SitePage {
  /** The part after /<locale>, e.g. '/health/symptoms/'. */
  path: string;
  /** Date the page's text last changed (YYYY-MM-DD), where we know it. */
  lastmod?: string | undefined;
}

/**
 * Every page in one language that search engines should index. Used by the
 * sitemap. A browser test checks it against the built site.
 */
export async function localePages(locale: Locale): Promise<SitePage[]> {
  const health = await getHealthPages(locale);
  const updates = await getUpdates(locale);
  const info = await Promise.all(INFO_PAGES.map((slug) => getInfoPage(locale, slug)));
  return [
    { path: '/' },
    { path: '/updates/', lastmod: updates[0] && isoDay(updates[0].data.date) },
    ...updates.map((entry) => ({ path: updatePath(entry), lastmod: isoDay(entry.data.date) })),
    { path: '/map/' },
    { path: '/help/' },
    ...COUNTRY_PAGES.map((iso) => ({ path: countryPath(iso) })),
    { path: '/health/' },
    ...health.map((entry) => ({
      path: `/health/${splitHealthId(entry.id).slug}/`,
      lastmod: isoDay(entry.data.reviewed),
    })),
    { path: '/about/' },
    ...INFO_PAGES.map((slug, i) => ({ path: `/${slug}/`, lastmod: isoDay(info[i]!.data.updated) })),
  ];
}

/** Health pages kept on the reader's device for use without a connection. */
export const OFFLINE_HEALTH_PAGES = ['symptoms', 'transmission', 'prevention', 'contacts', 'safe-burials'];

/**
 * Pages the service worker (/sw.js) saves for each language, so the
 * emergency box, helplines and essential advice open without a connection.
 * The offline page itself is saved last.
 */
export function offlinePages(): string[] {
  return [
    '/',
    '/help/',
    ...COUNTRY_PAGES.map(countryPath),
    '/health/',
    ...OFFLINE_HEALTH_PAGES.map((slug) => `/health/${slug}/`),
    '/offline/',
  ];
}

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).href;
export const localeUrl = (locale: Locale, path = '/') => absoluteUrl(localePath(locale, path));

export const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function xmlResponse(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
