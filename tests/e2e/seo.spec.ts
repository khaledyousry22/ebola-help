import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import raw from '../../src/data/outbreak.json' with { type: 'json' };
import { formatDate, formatNumber, LOCALE_CODES } from '../../src/i18n';
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

test('robots.txt points to /sitemap.xml, and the older sitemap index points there too', () => {
  expect(readFileSync('dist/robots.txt', 'utf8')).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  expect(locs(readFileSync('dist/sitemap-index.xml', 'utf8'))).toEqual([`${SITE}/sitemap.xml`]);
});

test('/sitemap.xml lists the root and every indexable page in every language', () => {
  const xml = readFileSync('dist/sitemap.xml', 'utf8');
  // The offline page and the news headline lists are kept out of search engines.
  const hidden = LOCALE_CODES.flatMap((l) => NOINDEX_PAGES.map((path) => `${SITE}/${l}${path}`));
  const built = [`${SITE}/`, ...LOCALE_CODES.flatMap((l) => htmlFiles(`dist/${l}`).map(urlOf))]
    .filter((url) => !hidden.includes(url))
    .sort();
  expect(locs(xml).sort()).toEqual(built);
});

test('the sitemap gives each page the same language links (hreflang) as the page itself', () => {
  const xml = readFileSync('dist/sitemap.xml', 'utf8');
  const pairs = (text: string) =>
    [...text.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`).sort();
  for (const block of xml.split('<url>').slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)![1]!;
    const html = readFileSync(`${loc.replace(SITE, 'dist')}index.html`, 'utf8');
    const fromPage = pairs(html);
    expect(fromPage, loc).toHaveLength(LOCALE_CODES.length + 1);
    expect(pairs(block), loc).toEqual(fromPage);
    // x-default: the language picker for home pages, the English version elsewhere.
    const xDefault = fromPage.find((p) => p.startsWith('x-default '))!.split(' ')[1];
    const isHome = loc === `${SITE}/` || /^https:\/\/ebola\.help\/[a-z]{2}\/$/.test(loc);
    expect(xDefault, loc).toBe(isHome ? `${SITE}/` : loc.replace(/^(https:\/\/ebola\.help\/)[a-z]{2}\//, '$1en/'));
    for (const pair of fromPage) {
      const href = pair.split(' ')[1]!;
      expect(existsSync(join(href.replace(SITE, 'dist'), 'index.html')), href).toBe(true);
    }
  }
});

test('every indexable page has its own title and description in its language', () => {
  const seen = new Map<string, string>();
  for (const file of htmlFiles('dist')) {
    const html = readFileSync(file, 'utf8');
    if (/<meta name="robots" content="noindex"/.test(html)) continue;
    // Translations may share a word ("Contact" in English and French): compare within one language.
    const lang = html.match(/<html lang="([^"]+)"/)?.[1];
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    expect(title, file).toBeTruthy();
    expect(description, file).toBeTruthy();
    for (const key of [`${lang} title ${title}`, `${lang} description ${description}`]) {
      expect(seen.get(key), `${file}: ${key}`).toBeUndefined();
      seen.set(key, file);
    }
  }
  expect(readFileSync('dist/index.html', 'utf8')).not.toMatch(/<title>[^<]*Choose your language/);
});

for (const locale of LOCALE_CODES) {
  test(`/${locale}/ has the official figures and their date in the HTML itself, not added by JavaScript`, () => {
    const html = readFileSync(`dist/${locale}/index.html`, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    const { confirmedCases, confirmedDeaths, asOf } = raw.headline;
    for (const text of [formatNumber(locale, confirmedCases), formatNumber(locale, confirmedDeaths), formatDate(locale, asOf)]) {
      expect(html, text).toContain(text);
    }
    expect(html).toMatch(new RegExp(`<title>[^<]*${raw.declared.slice(0, 4)}`));
    expect(html.match(/<meta name="description" content="([^"]+)"/)?.[1]).toContain(formatNumber(locale, confirmedCases));
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
