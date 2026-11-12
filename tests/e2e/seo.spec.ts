import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { LOCALE_CODES } from '../../src/i18n';
import { NOINDEX_PAGES } from '../../src/lib/indexing';

const SITE = 'https://ebola.help';

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name === 'index.html' ? [path] : [];
  });
}

/** dist/fr/news/index.html -> https://ebola.help/fr/news/ */
const urlOf = (file: string) => `${SITE}/${file.replace(/^dist\//, '').replace(/index\.html$/, '')}`;
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!);

test('robots.txt points to the sitemap index, which lists one sitemap per language', () => {
  expect(readFileSync('dist/robots.txt', 'utf8')).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
  const index = readFileSync('dist/sitemap-index.xml', 'utf8');
  expect(locs(index)).toEqual(LOCALE_CODES.map((l) => `${SITE}/${l}/sitemap.xml`));
});

for (const locale of LOCALE_CODES) {
  test(`/${locale}/sitemap.xml lists every page in that language, with its translations`, () => {
    const xml = readFileSync(`dist/${locale}/sitemap.xml`, 'utf8');
    // The offline page and the news headline lists are kept out of search engines.
    const hidden = NOINDEX_PAGES.map((path) => `${SITE}/${locale}${path}`);
    const built = htmlFiles(`dist/${locale}`).map(urlOf).filter((url) => !hidden.includes(url)).sort();
    expect(locs(xml).sort()).toEqual(built);
    for (const href of xml.matchAll(/hreflang="[^"]+" href="([^"]+)"/g)) {
      const path = href[1]!.replace(SITE, 'dist');
      expect(existsSync(join(path, 'index.html')), href[1]).toBe(true);
    }
  });
}

test('every page has a share image that exists', () => {
  for (const file of htmlFiles('dist')) {
    const image = readFileSync(file, 'utf8').match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    expect(image, file).toBeTruthy();
    expect(existsSync(image!.replace(SITE, 'dist')), image).toBe(true);
  }
});

test('pages kept out of search engines say so, and every other page may be indexed', () => {
  for (const file of htmlFiles('dist')) {
    const path = '/' + file.replace(/^dist\/[a-z]{2}\//, '').replace(/index\.html$/, '');
    const noindex = /<meta name="robots" content="noindex"/.test(readFileSync(file, 'utf8'));
    const expected = NOINDEX_PAGES.includes(path) || /^dist\/(404\.html|admin\/)/.test(file);
    expect(noindex, file).toBe(expected);
  }
});

async function readFeed(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.status()).toBe(200);
  return page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    return {
      error: doc.querySelector('parsererror')?.textContent ?? null,
      items: [...doc.querySelectorAll('item')].map((item) => ({
        id: item.querySelector('guid')?.textContent ?? '',
        link: item.querySelector('link')?.textContent ?? '',
        text: item.querySelector('description')?.textContent ?? '',
      })),
    };
  }, await response.text());
}

for (const path of ['/feeds/social.xml', '/feeds/media.xml']) {
  test(`${path} is valid RSS for Facebook posts, previewing Ebola.help pages`, async ({ page, request }) => {
    const feed = await readFeed(page, request, path);
    expect(feed.error).toBeNull();
    expect(feed.items.length).toBeGreaterThan(0);
    expect(feed.items.length).toBeLessThanOrEqual(30);
    expect(new Set(feed.items.map((i) => i.id)).size).toBe(feed.items.length);
    for (const item of feed.items) {
      expect(item.link).toMatch(/^https:\/\/ebola\.help\/(en|fr)\//);
      expect(item.text.length).toBeGreaterThan(0);
    }
  });
}

test('the social feed has weekly updates and today\'s health tip in English and French', async ({ page, request }) => {
  const feed = await readFeed(page, request, '/feeds/social.xml');
  expect(feed.items.some((i) => i.id.startsWith('update-en-'))).toBe(true);
  const tip = feed.items.find((i) => i.id.startsWith('tip-'));
  expect(tip?.text).toMatch(/^Good to know: [\s\S]+\n\nBon à savoir : /);
});

test('the media feed has news coverage only, never official news', async ({ page, request }) => {
  const feed = await readFeed(page, request, '/feeds/media.xml');
  const officialIds = new Set(
    (JSON.parse(readFileSync('src/data/news/items.json', 'utf8')) as { items: { id: string; official: boolean }[] }).items
      .filter((i) => i.official)
      .map((i) => `news-${i.id}`),
  );
  for (const item of feed.items) expect(officialIds.has(item.id)).toBe(false);
});
