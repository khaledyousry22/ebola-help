/**
 * /feeds/social.xml: official news, situation updates, the daily health tip and
 * the case figures, for posting on Facebook (see src/lib/social-feed.ts and
 * SOCIAL.md).
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { BUILD_TIME, SOCIAL_FEED_LOCALES } from '../../config';
import { officialNewsIn } from '../../data/news';
import { OUTBREAK } from '../../data/outbreak';
import { SOURCES } from '../../data/sources';
import { getMessages, type Locale } from '../../i18n';
import {
  figuresEntry,
  newsEntry,
  rssFeed,
  rssResponse,
  SOCIAL_FEED,
  tipEntry,
  updateEntry,
  type FeedEntry,
  type HealthGuide,
} from '../../lib/social-feed';
import { stripCitations } from '../../lib/citations';
import { getUpdates, splitUpdateId } from '../../lib/updates';

async function healthGuides(): Promise<HealthGuide[]> {
  const guides = new Map<string, HealthGuide>();
  for (const entry of await getCollection('health')) {
    const [locale, slug = ''] = entry.id.split('/') as [Locale, string?];
    const guide = guides.get(slug) ?? { slug, order: entry.data.order, text: {} };
    guide.text[locale] = { title: entry.data.title, keyPoints: entry.data.keyPoints.map(stripCitations) };
    guides.set(slug, guide);
  }
  return [...guides.values()];
}

export const GET: APIRoute = async () => {
  const updates = (await Promise.all(SOCIAL_FEED_LOCALES.map((locale) => getUpdates(locale)))).flat();
  const h = OUTBREAK.headline;
  const entries: (FeedEntry | undefined)[] = [
    ...officialNewsIn(SOCIAL_FEED_LOCALES).map(newsEntry),
    ...updates.map((update) =>
      updateEntry({ ...splitUpdateId(update.id), title: update.data.title, description: update.data.description, date: update.data.date }),
    ),
    tipEntry(await healthGuides(), SOCIAL_FEED_LOCALES, BUILD_TIME),
    figuresEntry(
      { ...h, sourceName: (locale) => getMessages(locale).publishers[SOURCES[h.source].publisher] },
      SOCIAL_FEED_LOCALES,
    ),
  ];
  return rssResponse(rssFeed(SOCIAL_FEED, entries.filter((e): e is FeedEntry => e !== undefined), BUILD_TIME));
};
