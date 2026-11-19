/**
 * Source links after claims ([[sourceId]], see src/lib/citations.ts), drafts
 * waiting for approval (src/content/drafts/health/) and correction notes.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { ADS } from '../../src/config';
import { LOCALE_CODES } from '../../src/i18n';
import { citationParts, citedIds, stripCitations } from '../../src/lib/citations';

const LIVE = 'src/content/health';
const DRAFTS = 'src/content/drafts/health';
const UPDATES = 'src/content/updates';

const slugsIn = (dir: string, locale: string) =>
  existsSync(join(dir, locale))
    ? readdirSync(join(dir, locale))
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
        .sort()
    : [];

interface Page {
  data: { sources: string[]; keyPoints?: string[]; corrections?: { date: unknown }[] };
  body: string;
}

function read(dir: string, locale: string, slug: string): Page {
  const text = readFileSync(join(dir, locale, `${slug}.md`), 'utf8');
  const end = text.indexOf('\n---', 3);
  return { data: parse(text.slice(4, end)), body: text.slice(end + 4) };
}

/** Paragraphs and list items of a page, in order, without headings. */
export function blocks(body: string): string[] {
  const out: string[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    const lines = chunk.trim().split('\n');
    if (!lines[0] || lines[0].startsWith('#')) continue;
    if (!/^(- |\d+\. )/.test(lines[0])) {
      out.push(lines.join(' '));
      continue;
    }
    let item = '';
    for (const line of lines) {
      if (/^(- |\d+\. )/.test(line)) {
        if (item) out.push(item);
        item = line;
      } else item += ` ${line.trim()}`;
    }
    if (item) out.push(item);
  }
  return out;
}

/** A block that only points to another page of the site ("More in …") makes no claim of its own. */
const isSeeAlso = (block: string) => /\]\((\.\.\/|\/)/.test(block) && citedIds(block).length === 0;

describe('source markers', () => {
  it('turn into numbered links to the page’s list of sources', () => {
    const parts = citationParts('Fever.[[b]] Bleeding.[[a]][[b]]', ['a', 'b'], 'en');
    expect(parts).toEqual([
      { text: 'Fever.' },
      { id: 'b', number: 2, label: 'Source 2' },
      { text: ' Bleeding.' },
      { id: 'a', number: 1, label: 'Source 1' },
      { id: 'b', number: 2, label: 'Source 2' },
    ]);
    expect(stripCitations('Fever. [[b]] Bleeding.[[a]]')).toBe('Fever. Bleeding.');
  });

  it('fail when the source is not in the page’s sources list', () => {
    expect(() => citationParts('Fever.[[c]]', ['a'], 'en')).toThrow(/not in the page's sources list/);
  });
});

for (const [name, dir] of [
  ['health pages', LIVE],
  ['health page drafts', DRAFTS],
  ['situation updates', UPDATES],
] as const) {
  describe(`${name}: source links`, () => {
    // After approval, drafts move to the live pages and this folder is empty.
    if (slugsIn(dir, 'en').length === 0) it('none at the moment', () => {});
    for (const slug of slugsIn(dir, 'en')) {
      const en = read(dir, 'en', slug);
      const enBody = blocks(en.body).map(citedIds);
      const enPoints = (en.data.keyPoints ?? []).map(citedIds);
      const usesMarkers = [...enBody, ...enPoints].some((ids) => ids.length > 0);

      for (const locale of LOCALE_CODES) {
        it(`${locale}/${slug} cites only its own sources, in the same places as English`, () => {
          const page = read(dir, locale, slug);
          const body = blocks(page.body).map(citedIds);
          const points = (page.data.keyPoints ?? []).map(citedIds);
          for (const id of [...body, ...points].flat()) expect(page.data.sources).toContain(id);
          if (!usesMarkers) return;
          // Same paragraphs and list items, citing the same sources, in every language.
          expect(body).toEqual(enBody);
          expect(points).toEqual(enPoints);
        });
      }

      if (usesMarkers) {
        it(`en/${slug} cites every source it lists`, () => {
          const cited = new Set([...enBody, ...enPoints].flat());
          for (const id of en.data.sources) expect(cited, id).toContain(id);
        });
      }
    }
  });
}

describe('health page drafts', () => {
  const drafts = slugsIn(DRAFTS, 'en');

  for (const locale of LOCALE_CODES) {
    it(`${locale} has every draft, with the same sources as English`, () => {
      expect(slugsIn(DRAFTS, locale)).toEqual(drafts);
      for (const slug of drafts) expect(read(DRAFTS, locale, slug).data.sources).toEqual(read(DRAFTS, 'en', slug).data.sources);
    });
  }

  for (const slug of drafts) {
    it(`${slug}: every paragraph, list item and key point links to its source`, () => {
      for (const locale of LOCALE_CODES) {
        const page = read(DRAFTS, locale, slug);
        for (const block of blocks(page.body)) {
          if (isSeeAlso(block)) continue;
          expect(citedIds(block).length, `${locale}/${slug}: ${block}`).toBeGreaterThan(0);
        }
        for (const point of page.data.keyPoints ?? []) {
          expect(citedIds(point).length, `${locale}/${slug}: ${point}`).toBeGreaterThan(0);
        }
      }
    });
  }
});

describe('correction notes', () => {
  for (const dir of [LIVE, DRAFTS, UPDATES]) {
    for (const slug of slugsIn(dir, 'en')) {
      it(`${dir}/*/${slug} lists the same corrections in every language`, () => {
        const dates = (locale: string) => (read(dir, locale, slug).data.corrections ?? []).map((c) => String(c.date));
        for (const locale of LOCALE_CODES) expect(dates(locale)).toEqual(dates('en'));
      });
    }
  }
});

describe('ads.txt', () => {
  it('names the AdSense publisher ID used in the page head', () => {
    const publisher = ADS.client.replace(/^ca-/, '');
    expect(readFileSync('public/ads.txt', 'utf8').trim()).toBe(`google.com, ${publisher}, DIRECT, f08c47fec0942fa0`);
  });
});
