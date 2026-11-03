import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { LOCALE_CODES } from '../../src/i18n';
import { SOURCES, sourceVersionFor } from '../../src/data/sources';

const HEALTH = 'src/content/health';
const slugsOf = (locale: string) =>
  readdirSync(join(HEALTH, locale))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();

function frontmatter(locale: string, slug: string) {
  const text = readFileSync(join(HEALTH, locale, `${slug}.md`), 'utf8');
  const head = text.split('---')[1] ?? '';
  const sources = (head.match(/^sources: \[(.*)\]$/m)?.[1] ?? '').split(',').map((s) => s.trim());
  const order = Number(head.match(/^order: (\d+)$/m)?.[1]);
  const links = [...text.matchAll(/\]\(\.\.\/([a-z-]+)\/\)/g)].map((m) => m[1]);
  return { text, sources, order, links };
}

const reference = slugsOf('en');

describe('health pages', () => {
  it('every page has valid front matter', () => {
    for (const locale of LOCALE_CODES) {
      for (const slug of slugsOf(locale)) {
        const text = readFileSync(join(HEALTH, locale, `${slug}.md`), 'utf8');
        const data = parse(text.split('---')[1] ?? '');
        const where = `${locale}/${slug}`;
        expect(typeof data.title, where).toBe('string');
        expect(typeof data.description, where).toBe('string');
        expect(Number.isInteger(data.order), where).toBe(true);
        expect(Array.isArray(data.keyPoints), where).toBe(true);
        for (const point of data.keyPoints) expect(typeof point, where).toBe('string');
        expect(Array.isArray(data.sources), where).toBe(true);
      }
    }
  });

  it('English has the expected pages', () => {
    expect(reference).toEqual([
      'bundibugyo-virus',
      'contacts',
      'myths-facts',
      'prevention',
      'safe-burials',
      'survivors',
      'symptoms',
      'transmission',
      'vaccines-treatment',
      'what-is-ebola',
    ]);
  });

  for (const locale of LOCALE_CODES) {
    it(`${locale} has the same pages as English`, () => {
      expect(slugsOf(locale)).toEqual(reference);
    });

    for (const slug of reference) {
      it(`${locale}/${slug} cites the same sources and keeps the same order as English`, () => {
        const en = frontmatter('en', slug);
        const page = frontmatter(locale, slug);
        expect(page.sources).toEqual(en.sources);
        expect(page.order).toBe(en.order);
        for (const id of page.sources) expect(Object.keys(SOURCES)).toContain(id);
      });

      it(`${locale}/${slug} links only to pages that exist, like English`, () => {
        const page = frontmatter(locale, slug);
        for (const target of page.links) expect(reference).toContain(target);
        expect(page.links.sort()).toEqual(frontmatter('en', slug).links.sort());
      });
    }
  }

  it('the vaccine page says there is no approved vaccine or medicine for Bundibugyo virus', () => {
    expect(frontmatter('en', 'vaccines-treatment').text).toMatch(
      /Bundibugyo virus[^.]*there is no approved vaccine or medicine yet/,
    );
  });
});

describe('sources', () => {
  it('every source has an English or French version with an https link and valid dates', () => {
    for (const [id, source] of Object.entries(SOURCES)) {
      const versions = Object.values(source.versions) as { url: string; title: string }[];
      expect(versions.length, id).toBeGreaterThan(0);
      for (const v of versions) {
        expect(v.url, id).toMatch(/^https:\/\//);
        expect(v.title.length, id).toBeGreaterThan(3);
      }
      expect(source.published, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.checked, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('links readers to their own language when the publisher offers it', () => {
    expect(sourceVersionFor('whoFactSheet', 'ar').url).toBe(
      'https://www.who.int/ar/news-room/fact-sheets/detail/ebola-disease',
    );
    expect(sourceVersionFor('whoFactSheet', 'en').url).toBe(
      'https://www.who.int/news-room/fact-sheets/detail/ebola-disease',
    );
    expect(sourceVersionFor('cdcSpread', 'zh').lang).toBe('en');
    expect(sourceVersionFor('drcSitrep158', 'ru').lang).toBe('fr');
  });
});

describe('policy pages (editorial policy, privacy, contact)', () => {
  const INFO = 'src/content/info';
  const infoSlugs = (locale: string) =>
    readdirSync(join(INFO, locale))
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
      .sort();

  it('English has the three pages the footer links to', async () => {
    const { INFO_PAGES } = await import('../../src/lib/info-pages');
    expect(infoSlugs('en')).toEqual([...INFO_PAGES].sort());
  });

  for (const locale of LOCALE_CODES) {
    it(`${locale} has the same policy pages, with valid front matter and the contact address`, () => {
      expect(infoSlugs(locale)).toEqual(infoSlugs('en'));
      for (const slug of infoSlugs(locale)) {
        const text = readFileSync(join(INFO, locale, `${slug}.md`), 'utf8');
        const data = parse(text.split('---')[1] ?? '');
        const where = `${locale}/${slug}`;
        expect(typeof data.title, where).toBe('string');
        expect(typeof data.description, where).toBe('string');
        expect(String(data.updated), where).toMatch(/^\d{4}-\d{2}-\d{2}|^\w{3} \w{3} \d{2} \d{4}/);
        expect(text, where).toContain('mailto:wrongnumber@ebola.help');
        // The same links in every language (sources of privacy information, the helplines page).
        const links = (t: string) => [...t.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]).sort();
        expect(links(text), where).toEqual(links(readFileSync(join(INFO, 'en', `${slug}.md`), 'utf8')));
      }
    });
  }
});
