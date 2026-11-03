import { SITE_URL } from '../config';
import { localePath, type Locale } from '../i18n';
import { COUNTRY_PAGES, countryPath } from './country-pages';
import { getHealthPages, splitHealthId } from './health';
import { INFO_PAGES } from './info-pages';

export { NOINDEX_PAGES } from './indexing';

/**
 * Every page in each language that search engines should index, as the part
 * after /<locale>. Used by the sitemaps. A browser test checks it against
 * the built site.
 */
export async function localePages(): Promise<string[]> {
  const health = await getHealthPages('en');
  return [
    '/',
    '/map/',
    '/help/',
    ...COUNTRY_PAGES.map(countryPath),
    '/health/',
    ...health.map((entry) => `/health/${splitHealthId(entry.id).slug}/`),
    '/about/',
    ...INFO_PAGES.map((slug) => `/${slug}/`),
  ];
}

/** Health pages kept on the reader's device for use without a connection. */
export const OFFLINE_HEALTH_PAGES = ['symptoms', 'transmission', 'prevention'];

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
