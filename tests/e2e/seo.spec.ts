import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { LOCALE_CODES } from '../../src/i18n';

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
    // The offline page is only for the service worker, not for search engines.
    const built = htmlFiles(`dist/${locale}`).map(urlOf).filter((url) => !url.endsWith('/offline/')).sort();
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
