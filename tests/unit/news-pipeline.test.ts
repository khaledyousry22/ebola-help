import { describe, expect, it } from 'vitest';
import { newsFileSchema, newsItemSchema, type NewsItem } from '../../src/data/news-schema';
import { NEWS_SOURCES } from '../../src/data/news-sources';
import { prune } from '../../scripts/news/ingest';
import { tagCountries } from '../../scripts/news/lib/countries';
import { mergeItems } from '../../scripts/news/lib/dedupe';
import { parseFeed } from '../../scripts/news/lib/feeds';
import { isEbolaRelated } from '../../scripts/news/lib/keywords';
import { detectLanguage, resolveLanguage } from '../../scripts/news/lib/language';
import { itemDate, toNewsItems } from '../../scripts/news/lib/process';
import { EXCERPT_LIMIT, makeExcerpt, toPlainText } from '../../scripts/news/lib/text';
import { cleanUrl, itemId, urlKey } from '../../scripts/news/lib/url';

const NOW = new Date('2026-10-21T12:00:00Z');

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  const url = overrides.url ?? 'https://example.org/news/1';
  return {
    id: itemId(url),
    url,
    title: 'Ebola outbreak in the Democratic Republic of the Congo spreads to new areas',
    lang: 'en',
    sourceId: 'test',
    sourceName: 'Test News',
    official: false,
    publishedAt: '2026-10-20T10:00:00.000Z',
    firstSeenAt: '2026-10-20T11:00:00.000Z',
    countries: ['CD'],
    alsoReportedBy: [],
    ...overrides,
  };
}

describe('Ebola keywords', () => {
  it.each([
    'Ebola outbreak declared',
    "Épidémie d'Ebola en RDC",
    'Brote de ébola en Kenia',
    'Bundibugyo virus disease update',
    'Вспышка Эболы в ДРК',
    'تفشي الإيبولا في الكونغو',
    'كينيا تعلن إصابة بفيروس ايبولا',
    '刚果（金）埃博拉疫情',
    '本迪布焦病毒病',
  ])('recognises %s', (text) => expect(isEbolaRelated(text)).toBe(true));

  it.each(['Cholera cases rise in Zambia', 'Mpox vaccination campaign', 'Gebolas is not a word'])(
    'ignores %s',
    (text) => expect(isEbolaRelated(text)).toBe(false),
  );

  it('accepts source-specific abbreviations as whole words only', () => {
    expect(isEbolaRelated('SitRep N°159/MVE-BDBV/20/10/2026', ['MVE', 'BDBV'])).toBe(true);
    expect(isEbolaRelated('Campagne MVEX contre le paludisme', ['MVE'])).toBe(false);
  });
});

describe('text and excerpts', () => {
  it('strips HTML and decodes entities', () => {
    expect(toPlainText('<p>Ebola &amp; <b>cholera</b>&nbsp;update&#8230;</p>')).toBe('Ebola & cholera update…');
    expect(toPlainText('&lt;p&gt;Hello&lt;/p&gt;')).toBe('Hello');
  });

  it('keeps excerpts short and never the full article', () => {
    const long = 'The outbreak continues. '.repeat(60);
    const excerpt = makeExcerpt(long, 'Headline', 'en')!;
    expect(excerpt.length).toBeLessThanOrEqual(EXCERPT_LIMIT.en + 1);
    expect(excerpt.endsWith('…')).toBe(true);
    const zh = makeExcerpt('埃博拉疫情'.repeat(60), '标题', 'zh')!;
    expect(zh.length).toBeLessThanOrEqual(EXCERPT_LIMIT.zh + 1);
  });

  it('drops excerpts that only repeat the headline', () => {
    expect(makeExcerpt('Kenya confirms Ebola case. More soon', 'Kenya confirms Ebola case', 'en')).toBeUndefined();
    expect(makeExcerpt('short', 'Title', 'en')).toBeUndefined();
  });
});

describe('links', () => {
  it('removes tracking parameters and fragments', () => {
    expect(cleanUrl('https://www.example.org/a?utm_source=x&id=3&fbclid=y#top')).toBe('https://www.example.org/a?id=3');
  });

  it('rejects links that are not http(s)', () => {
    expect(cleanUrl('javascript:alert(1)')).toBeUndefined();
    expect(cleanUrl('not a url')).toBeUndefined();
  });

  it('treats small variations of the same link as one article', () => {
    expect(urlKey('https://www.example.org/news/1/')).toBe(urlKey('http://example.org/news/1'));
    expect(urlKey('https://example.org/news/1/amp')).toBe(urlKey('https://example.org/news/1'));
    expect(itemId('https://www.example.org/x/')).toBe(itemId('https://example.org/x'));
  });
});

describe('language', () => {
  it('detects the writing system and common words', () => {
    expect(detectLanguage('تفشي الإيبولا')).toBe('ar');
    expect(detectLanguage('埃博拉疫情')).toBe('zh');
    expect(detectLanguage('Вспышка Эболы')).toBe('ru');
    expect(detectLanguage("Le virus Ebola gagne du terrain dans les provinces de l'est")).toBe('fr');
    expect(detectLanguage('El brote de ébola se extiende por la región')).toBe('es');
    expect(detectLanguage('The outbreak has spread to the capital')).toBe('en');
  });

  it("trusts the feed's language unless the text is clearly different", () => {
    expect(resolveLanguage('en', 'Ebola posters for Kenya')).toBe('en');
    expect(resolveLanguage('en', "Le point sur l'épidémie dans les provinces de l'est et la riposte")).toBe('fr');
    expect(resolveLanguage('en', 'تفشي الإيبولا')).toBe('ar');
  });
});

describe('country tagging', () => {
  it.each([
    ['Ebola in the Democratic Republic of the Congo and Uganda', ['CD', 'UG']],
    ["Épidémie d'Ebola en RDC : nouveaux cas en Ituri", ['CD']],
    ['Вспышка Эболы в ДРК: случаи в Уганде и Кении', ['CD', 'KE', 'UG']],
    ['تفشي الإيبولا في جمهورية الكونغو الديمقراطية ووصوله إلى كينيا', ['CD', 'KE']],
    ['刚果（金）埃博拉疫情蔓延至北基伍省', ['CD']],
    ['Republic of the Congo prepares for Ebola', ['CG']],
    ['Brote de ébola en el Congo', ['CD']],
    ['Nigeria confirms case in Abuja', ['NG']],
  ])('%s', (text, expected) => expect(tagCountries(text)).toEqual(expected));

  it('does not confuse common words with country names', () => {
    expect(tagCountries('ВОЗ призывает к бдительности после того, как подтвержден случай')).toEqual([]);
    expect(tagCountries('Это мало кого удивило')).toEqual([]);
    expect(tagCountries('دعم مالي لمكافحة الإيبولا')).toEqual([]);
  });
});

describe('feed formats', () => {
  it('reads RSS 2.0', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
      <item><title>Ebola update</title><link>https://example.org/1</link><description>&lt;p&gt;Text&lt;/p&gt;</description><pubDate>Tue, 20 Oct 2026 10:00:00 GMT</pubDate></item>
      <item><title><![CDATA[Second <b>item</b>]]></title><guid>https://example.org/2</guid></item>
    </channel></rss>`;
    const entries = parseFeed(xml);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ title: 'Ebola update', link: 'https://example.org/1', date: 'Tue, 20 Oct 2026 10:00:00 GMT' });
    expect(entries[1]?.link).toBe('https://example.org/2');
  });

  it('reads Atom', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html">Ebola</title>
      <link rel="self" href="https://example.org/self"/><link rel="alternate" href="https://example.org/a"/>
      <summary>Short</summary><updated>2026-10-20T10:00:00Z</updated></entry></feed>`;
    expect(parseFeed(xml)).toEqual([{ title: 'Ebola', link: 'https://example.org/a', summary: 'Short', date: '2026-10-20T10:00:00Z' }]);
  });

  it('reads RSS 1.0 (RDF)', () => {
    const xml = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <item><title>Ebola</title><link>https://example.org/r</link><dc:date>2026-10-20T10:00:00Z</dc:date></item></rdf:RDF>`;
    expect(parseFeed(xml)[0]).toMatchObject({ title: 'Ebola', link: 'https://example.org/r', date: '2026-10-20T10:00:00Z' });
  });

  it('refuses feeds that try to load external files', () => {
    const xml = `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss><channel><item><title>&x;</title><link>https://e.org/</link></item></channel></rss>`;
    expect(() => parseFeed(xml)).toThrow(/External entities/);
  });
});

describe('turning entries into items', () => {
  const source = NEWS_SOURCES.find((s) => s.id === 'drc-insp')!;

  it('keeps only Ebola items and adds the source countries', () => {
    const items = toNewsItems(
      source,
      [
        { title: 'SitRep N°159/MVE-BDBV/20/10/2026', link: 'https://insp.cd/sitrep-159/', date: '2026-10-21T08:00:00Z' },
        { title: 'Campagne de vaccination contre la rougeole', link: 'https://insp.cd/rougeole/' },
      ],
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ lang: 'fr', official: true, countries: ['CD'] });
    expect(newsItemSchema.parse(items[0])).toBeTruthy();
  });

  it('never stores dates in the future', () => {
    expect(itemDate('2030-01-01T00:00:00Z', NOW)).toBe(NOW.toISOString());
    expect(itemDate('not a date', NOW)).toBe(NOW.toISOString());
    expect(itemDate('Tue, 20 Oct 2026 10:00:00 GMT', NOW)).toBe('2026-10-20T10:00:00.000Z');
  });
});

describe('merging and pruning', () => {
  it('skips items already stored', () => {
    const a = item();
    expect(mergeItems([a], [item()]).added).toBe(0);
  });

  it('keeps one copy of the same story and notes the other outlet', () => {
    const first = item();
    const twin = item({ url: 'https://other.org/story', sourceName: 'Other News', title: 'Ebola outbreak in the Democratic Republic of the Congo spreads to new areas!' });
    const { items, added } = mergeItems([first], [twin]);
    expect(added).toBe(0);
    expect(items).toHaveLength(1);
    expect(items[0]?.alsoReportedBy).toEqual(['Other News']);
  });

  it('prefers the official report when a medium carries the same story', () => {
    const media = item();
    const official = item({ url: 'https://who.int/x', sourceName: 'WHO', official: true });
    const { items } = mergeItems([media], [official]);
    expect(items[0]?.official).toBe(true);
    expect(items[0]?.alsoReportedBy).toEqual(['Test News']);
  });

  it('does not merge different languages or distant dates', () => {
    const fr = item({ url: 'https://e.org/fr', lang: 'fr' });
    const later = item({ url: 'https://e.org/later', publishedAt: '2026-10-25T10:00:00.000Z' });
    expect(mergeItems([item()], [fr, later]).added).toBe(2);
  });

  it('drops old items and sorts newest first', () => {
    const old = item({ url: 'https://e.org/old', publishedAt: '2026-01-01T00:00:00.000Z' });
    const newer = item({ url: 'https://e.org/new', publishedAt: '2026-10-21T00:00:00.000Z' });
    expect(prune([item(), old, newer], NOW).map((i) => i.url)).toEqual(['https://e.org/new', 'https://example.org/news/1']);
  });
});

describe('stored news file', () => {
  it('rejects unsafe links and over-long excerpts', () => {
    expect(() => newsItemSchema.parse(item({ url: 'javascript:alert(1)' }))).toThrow();
    expect(() => newsItemSchema.parse(item({ excerpt: 'x'.repeat(500) }))).toThrow();
  });

  it('the committed file is valid', async () => {
    const { readFileSync } = await import('node:fs');
    const file = newsFileSchema.parse(JSON.parse(readFileSync('src/data/news/items.json', 'utf8')));
    expect(file.items.length).toBeGreaterThan(0);
  });
});

describe('news sources', () => {
  it('have unique ids and https links', () => {
    const ids = NEWS_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of NEWS_SOURCES) {
      expect(s.url, s.id).toMatch(/^https:\/\//);
      expect(s.homepage, s.id).toMatch(/^https:\/\//);
    }
  });
});
