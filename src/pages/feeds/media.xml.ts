/**
 * /feeds/media.xml: news coverage by media outlets, without alarming headlines,
 * for posting on Facebook through a second Zap (see src/lib/social-feed.ts and
 * SOCIAL.md).
 */
import type { APIRoute } from 'astro';
import { BUILD_TIME, SOCIAL_FEED_LOCALES } from '../../config';
import { visibleNews } from '../../data/news';
import { isShareableMedia, MEDIA_FEED, newsEntry, rssFeed, rssResponse } from '../../lib/social-feed';

export const GET: APIRoute = () =>
  rssResponse(
    rssFeed(
      MEDIA_FEED,
      visibleNews()
        .filter((item) => isShareableMedia(item, SOCIAL_FEED_LOCALES))
        .map(newsEntry),
      BUILD_TIME,
    ),
  );
