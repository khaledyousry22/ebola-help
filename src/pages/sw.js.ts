/**
 * /sw.js: the service worker that lets the site work without a connection.
 *
 * - Pages: network first, so readers always get current figures and news.
 *   On a very slow connection a saved copy is shown after a few seconds.
 *   Without a connection, the saved copy or the offline page is shown.
 * - For each language a reader uses, the pages in offlinePages() are saved
 *   ahead of time and refreshed at most once a day.
 * - Only this site's own files are handled. Ads and other sites are never
 *   cached or touched.
 */
import type { APIRoute } from 'astro';
import { LOCALE_CODES } from '../i18n';
import { offlinePages } from '../lib/site-pages';

const ARABIC_FONTS = [400, 700].map((weight) => `/fonts/noto-sans-arabic-arabic-${weight}-normal.woff2`);

const saved = Object.fromEntries(
  LOCALE_CODES.map((locale) => [
    locale,
    [
      '/',
      ...offlinePages().map((path) => `/${locale}${path}`),
      ...(locale === 'ar' ? ARABIC_FONTS : []),
    ],
  ]),
);

const worker = `'use strict';
const CACHE = 'ebh-v1';
const SAVED = ${JSON.stringify(saved)};
const REFRESH_AFTER = 24 * 60 * 60 * 1000;
const SLOW_NETWORK = 4000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (SAVED[data.save]) event.waitUntil(save(data.save, data.saveData));
});

/** Saves a language's essential pages, and the styles they use. */
async function save(locale, saveData) {
  const cache = await caches.open(CACHE);
  const marker = '/__saved/' + locale;
  const last = await cache.match(marker);
  if (last) {
    const age = Date.now() - Number(await last.text());
    if (saveData || age < REFRESH_AFTER) return;
  }
  const assets = new Set();
  for (const path of SAVED[locale]) {
    const response = await fetch(path, { cache: 'no-cache' }).catch(() => null);
    if (!response || !response.ok) return;
    if ((response.headers.get('content-type') || '').includes('text/html')) {
      const html = await response.clone().text();
      for (const match of html.matchAll(/href="(\\/_astro\\/[^"]+\\.css)"/g)) assets.add(match[1]);
    }
    await cache.put(path, response);
  }
  for (const asset of assets) {
    if (!(await cache.match(asset))) await cache.add(asset).catch(() => {});
  }
  await cache.put(marker, new Response(String(Date.now())));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(event, url));
  } else if (/^\\/(_astro|fonts|icons)\\//.test(url.pathname)) {
    event.respondWith(asset(request));
  }
});

async function page(event, url) {
  const cache = await caches.open(CACHE);
  const key = url.pathname;
  const network = fetch(event.request).then((response) => {
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      event.waitUntil(cache.put(key, response.clone()));
    }
    return response;
  });
  const copy = await cache.match(key);
  if (!copy) return network.catch(() => offline(cache, url));
  const slow = new Promise((resolve) => setTimeout(() => resolve(copy), SLOW_NETWORK));
  return Promise.race([network.catch(() => copy), slow]);
}

async function offline(cache, url) {
  const locale = url.pathname.split('/')[1];
  const page = SAVED[locale] ? '/' + locale + '/offline/' : '/';
  return (await cache.match(page)) || Response.error();
}

/** Styles, fonts and icons have unique names per version, so a saved copy is always right. */
async function asset(request) {
  const cache = await caches.open(CACHE);
  const copy = await cache.match(request);
  if (copy) return copy;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
`;

export const GET: APIRoute = () =>
  new Response(worker, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
