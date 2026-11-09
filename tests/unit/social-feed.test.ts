import { describe, expect, it } from 'vitest';
import { SOCIAL_FEED_LOCALES } from '../../src/config';
import { officialNewsIn } from '../../src/data/news';
import overrides from '../../src/data/news/overrides.json' with { type: 'json' };
import type { NewsItem } from '../../src/data/news-schema';
import { newsEntry, SOCIAL_FEED_SIZE, socialFeed, updateEntry } from '../../src/lib/social-feed';

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

describe('social media feed', () => {
  it('posts a news item as headline, source and date, linking to the original', () => {
    const entry = newsEntry(item());
    expect(entry.id).toBe('news-0123456789abcdef');
    expect(entry.link).toBe('https://www.who.int/emergencies/disease-outbreak-news/item/example');
    expect(entry.text).toBe(
      [
        'Ebola disease caused by Bundibugyo virus – Democratic Republic of the Congo',
        '',
        'Source: World Health Organization (WHO): Disease Outbreak News, 6 November 2026',
        'News, helplines and health information in six languages: https://ebola.help/en/',
      ].join('\n'),
    );
  });

  it('writes a French item in French', () => {
    const entry = newsEntry(item({ lang: 'fr', title: 'Point de situation', sourceName: 'INSP' }));
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
    const entries = Array.from({ length: SOCIAL_FEED_SIZE + 5 }, (_, i) =>
      newsEntry(
        item({
          id: i.toString(16).padStart(16, '0'),
          title: `Item ${i} <b> & "more"`,
          firstSeenAt: new Date(Date.UTC(2026, 10, 1, i)).toISOString(),
        }),
      ),
    );
    const xml = socialFeed(entries, new Date('2026-11-09T12:00:00Z'));
    expect(xml.match(/<item>/g)).toHaveLength(SOCIAL_FEED_SIZE);
    expect(xml.indexOf(`Item ${SOCIAL_FEED_SIZE + 4} `)).toBeLessThan(xml.indexOf(`Item ${SOCIAL_FEED_SIZE + 3} `));
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
