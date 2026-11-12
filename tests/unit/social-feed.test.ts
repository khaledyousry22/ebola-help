import { describe, expect, it } from 'vitest';
import { SOCIAL_FEED_LOCALES } from '../../src/config';
import { officialNewsIn, visibleNews } from '../../src/data/news';
import overrides from '../../src/data/news/overrides.json' with { type: 'json' };
import type { NewsItem } from '../../src/data/news-schema';
import {
  FEED_SIZE,
  figuresEntry,
  isCalmHeadline,
  isShareableMedia,
  newsEntry,
  rssFeed,
  SOCIAL_FEED,
  tipDay,
  tipEntry,
  tipSequence,
  updateEntry,
  type HealthGuide,
} from '../../src/lib/social-feed';

const item = (over: Partial<NewsItem> = {}): NewsItem => ({
  id: '0123456789abcdef',
  url: 'https://www.who.int/emergencies/disease-outbreak-news/item/example',
  title: 'Ebola disease caused by Bundibugyo virus – Democratic Republic of the Congo',
  lang: 'en',
  sourceId: 'who-don',
  sourceName: 'World Health Organization (WHO): Disease Outbreak News',
  official: true,
  publishedAt: '2026-11-06T10:00:00.000Z',
  firstSeenAt: '2026-11-06T11:00:00.000Z',
  countries: ['CD'],
  alsoReportedBy: [],
  ...over,
});

const guide = (slug: string, order: number, points: number): HealthGuide => ({
  slug,
  order,
  text: {
    en: { title: `Guide ${slug}`, keyPoints: Array.from({ length: points }, (_, i) => `${slug} point ${i + 1}.`) },
    fr: { title: `Guide ${slug} (fr)`, keyPoints: Array.from({ length: points }, (_, i) => `${slug} point ${i + 1} (fr).`) },
  },
});

describe('social media feed: news and weekly updates', () => {
  it('posts a news item as headline, source, date and original link, previewing the Ebola.help news page', () => {
    const entry = newsEntry(item());
    expect(entry.id).toBe('news-0123456789abcdef');
    expect(entry.link).toBe('https://ebola.help/en/news/');
    expect(entry.text).toBe(
      [
        'Ebola disease caused by Bundibugyo virus – Democratic Republic of the Congo',
        '',
        'Source: World Health Organization (WHO): Disease Outbreak News, 6 November 2026',
        'https://www.who.int/emergencies/disease-outbreak-news/item/example',
        '',
        'News, helplines and health information in six languages: https://ebola.help/en/',
      ].join('\n'),
    );
  });

  it('writes a French item in French, previewing the French news page', () => {
    const entry = newsEntry(item({ lang: 'fr', title: 'Point de situation', sourceName: 'INSP' }));
    expect(entry.link).toBe('https://ebola.help/fr/news/');
    expect(entry.text).toContain('Source : INSP, 6 novembre 2026');
    expect(entry.text).toContain('https://ebola.help/fr/');
  });

  it('posts a weekly update with its summary, linking to the update', () => {
    const entry = updateEntry({
      locale: 'fr',
      slug: '2026-11-06',
      title: 'Point de situation',
      description: 'Résumé.',
      date: new Date('2026-11-06T00:00:00Z'),
    });
    expect(entry.id).toBe('update-fr-2026-11-06');
    expect(entry.link).toBe('https://ebola.help/fr/updates/2026-11-06/');
    expect(entry.text).toBe('Point de situation\n\nRésumé.');
  });

  it('keeps the newest entries, escapes text and gives each a fixed id', () => {
    const entries = Array.from({ length: FEED_SIZE + 5 }, (_, i) =>
      newsEntry(
        item({
          id: i.toString(16).padStart(16, '0'),
          title: `Item ${i} <b> & "more"`,
          firstSeenAt: new Date(Date.UTC(2026, 10, 1, i)).toISOString(),
        }),
      ),
    );
    const xml = rssFeed(SOCIAL_FEED, entries, new Date('2026-11-09T12:00:00Z'));
    expect(xml.match(/<item>/g)).toHaveLength(FEED_SIZE);
    expect(xml.indexOf(`Item ${FEED_SIZE + 4} `)).toBeLessThan(xml.indexOf(`Item ${FEED_SIZE + 3} `));
    expect(xml).not.toContain('Item 0 ');
    expect(xml).toContain('Item 5 &lt;b&gt; &amp; "more"');
    expect(xml).not.toContain('<b>');
    expect(xml).toContain('<guid isPermaLink="false">news-0000000000000022</guid>');
  });

  it('shares only official, visible news in the chosen languages', () => {
    const items = officialNewsIn(SOCIAL_FEED_LOCALES);
    expect(items.length).toBeGreaterThan(0);
    for (const news of items) {
      expect(news.official).toBe(true);
      expect(SOCIAL_FEED_LOCALES).toContain(news.lang);
      expect(overrides.hidden).not.toContain(news.id);
      expect(overrides.hidden).not.toContain(news.url);
    }
  });
});

describe('social media feed: daily health tip', () => {
  const guides = [guide('symptoms', 2, 3), guide('what-is-ebola', 1, 2), guide('myths', 3, 1)];

  it('takes the first point of every guide, then the second, so the guide changes every day', () => {
    expect(tipSequence(guides, 'en').map(({ guide: g, point }) => `${g.slug}:${point}`)).toEqual([
      'what-is-ebola:0',
      'symptoms:0',
      'myths:0',
      'what-is-ebola:1',
      'symptoms:1',
      'symptoms:2',
    ]);
  });

  it('changes at 06:00 UTC, not at midnight', () => {
    expect(tipDay(new Date('2026-11-13T05:59:00Z')).toISOString()).toBe('2026-11-12T06:00:00.000Z');
    expect(tipDay(new Date('2026-11-13T06:00:00Z')).toISOString()).toBe('2026-11-13T06:00:00.000Z');
    expect(tipDay(new Date('2026-11-13T23:00:00Z')).toISOString()).toBe('2026-11-13T06:00:00.000Z');
  });

  it('puts one key point in English and French in one post, with links to the guide', () => {
    const entry = tipEntry(guides, ['en', 'fr'], new Date('2026-11-13T09:00:00Z'))!;
    expect(entry.id).toBe('tip-2026-11-13');
    const [en, fr] = entry.text.split('\n\n');
    const slug = entry.link.match(/health\/([^/]+)\//)![1];
    expect(en).toMatch(new RegExp(`^Good to know: ${slug} point \\d\\.\\nRead more: Guide ${slug}, https://ebola.help/en/health/${slug}/$`));
    expect(fr).toMatch(new RegExp(`^Bon à savoir : ${slug} point \\d \\(fr\\)\\.\\nEn savoir plus : Guide ${slug} \\(fr\\), https://ebola.help/fr/health/${slug}/$`));
  });

  it('shares a different point every day and every point once per cycle', () => {
    const cycle = tipSequence(guides, 'en').length;
    const seen = new Set<string>();
    for (let day = 0; day < cycle; day++) {
      seen.add(tipEntry(guides, ['en', 'fr'], new Date(Date.UTC(2026, 10, 13 + day, 9)))!.title);
    }
    expect(seen.size).toBe(cycle);
  });
});

describe('social media feed: case figures', () => {
  const figures = {
    country: 'CD',
    confirmedCases: 10990,
    confirmedDeaths: 5354,
    asOf: '2026-11-08',
    sourceName: (locale: string) => (locale === 'fr' ? 'CDC (fr)' : 'CDC'),
  };

  it('uses the banner wording in English and French, with links to the map', () => {
    const entry = figuresEntry(figures, ['en', 'fr'])!;
    expect(entry.id).toBe('figures-CD-2026-11-08-10990-5354');
    expect(entry.link).toBe('https://ebola.help/en/map/');
    const [en, fr] = entry.text.split('\n\n');
    expect(en).toBe(
      [
        'Democratic Republic of the Congo: Ebola outbreak in progress (Bundibugyo virus)',
        'Confirmed cases: 10,990. Deaths: 5,354. Official figures as of 8 November 2026.',
        'Source: CDC',
        'Map and helplines: https://ebola.help/en/map/',
      ].join('\n'),
    );
    expect(fr).toContain('Source : CDC (fr)');
    expect(fr).toContain('https://ebola.help/fr/map/');
    expect(fr).toContain('8 novembre 2026');
  });

  it('makes a new post only when the figures change', () => {
    expect(figuresEntry(figures, ['en'])!.id).toBe(figuresEntry(figures, ['en', 'fr'])!.id);
    expect(figuresEntry({ ...figures, confirmedCases: 11000 }, ['en'])!.id).not.toBe(figuresEntry(figures, ['en'])!.id);
  });
});

describe('social media feed: media news', () => {
  it('leaves out alarming headlines', () => {
    expect(isCalmHeadline({ lang: 'en', title: "Kenya's last Ebola patient leaves hospital" })).toBe(true);
    expect(isCalmHeadline({ lang: 'en', title: "Ebola a 'terrifying disease'" })).toBe(false);
    expect(isCalmHeadline({ lang: 'en', title: 'Deadly Ebola spreads' })).toBe(false);
    expect(isCalmHeadline({ lang: 'fr', title: 'Ebola à Beni : 13 patients guéris quittent le centre' })).toBe(true);
    expect(isCalmHeadline({ lang: 'fr', title: 'Une épidémie meurtrière' })).toBe(false);
    expect(isCalmHeadline({ lang: 'fr', title: 'La peur gagne Abuja' })).toBe(false);
  });

  it('shares only media items in the chosen languages, never official or hidden ones', () => {
    const shared = visibleNews().filter((news) => isShareableMedia(news, SOCIAL_FEED_LOCALES));
    expect(shared.length).toBeGreaterThan(0);
    for (const news of shared) {
      expect(news.official).toBe(false);
      expect(SOCIAL_FEED_LOCALES).toContain(news.lang);
      expect(overrides.hidden).not.toContain(news.id);
    }
    expect(isShareableMedia(item({ official: false, lang: 'es' }), SOCIAL_FEED_LOCALES)).toBe(false);
  });
});
