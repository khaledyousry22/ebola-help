/** /feeds/social.xml: what gets posted to Facebook (see src/lib/social-feed.ts and SOCIAL.md). */
import type { APIRoute } from 'astro';
import { BUILD_TIME, SOCIAL_FEED_LOCALES } from '../../config';
import { officialNewsIn } from '../../data/news';
import { newsEntry, socialFeed, updateEntry } from '../../lib/social-feed';
import { getUpdates, splitUpdateId } from '../../lib/updates';

export const GET: APIRoute = async () => {
  const updates = (await Promise.all(SOCIAL_FEED_LOCALES.map((locale) => getUpdates(locale)))).flat();
  const entries = [
    ...officialNewsIn(SOCIAL_FEED_LOCALES).map(newsEntry),
    ...updates.map((update) =>
      updateEntry({ ...splitUpdateId(update.id), title: update.data.title, description: update.data.description, date: update.data.date }),
    ),
  ];
  return new Response(socialFeed(entries, BUILD_TIME), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
