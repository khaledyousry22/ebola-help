/**
 * /feeds/social.xml: official news and the weekly updates in the languages of
 * SOCIAL_FEED_LOCALES, as an RSS feed. A posting service (Zapier, see
 * SOCIAL.md) turns each new entry into a Facebook post: the description is the
 * text of the post and the link is shown as a preview under it.
 *
 * Only headline, source, date and link, as on the news pages: articles are
 * never copied.
 */
import { SITE_URL } from '../config';
import type { NewsItem } from '../data/news-schema';
import { format, formatDate, getMessages, type Locale } from '../i18n';

export const SOCIAL_FEED_PATH = '/feeds/social.xml';
/** Newest entries kept in the feed. Posting services only look at new ones. */
export const SOCIAL_FEED_SIZE = 30;

export interface FeedEntry {
  /** Never changes, so a posting service never posts the same entry twice. */
  id: string;
  title: string;
  link: string;
  date: Date;
  /** The text of the post. */
  text: string;
}

export interface UpdateSummary {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
  date: Date;
}

const homeUrl = (locale: Locale) => `${SITE_URL}/${locale}/`;

/** An official news item: headline, source and date, then a link to the site. The preview is the original article. */
export function newsEntry(item: NewsItem): FeedEntry {
  const m = getMessages(item.lang);
  const date = formatDate(item.lang, item.publishedAt.slice(0, 10));
  return {
    id: `news-${item.id}`,
    title: item.title,
    link: item.url,
    date: new Date(item.firstSeenAt),
    text: [
      item.title,
      '',
      format(m.feed.source, { source: item.sourceName, date }),
      format(m.feed.more, { url: homeUrl(item.lang) }),
    ].join('\n'),
  };
}

/** A weekly situation update: title and summary. The preview is the update on Ebola.help. */
export function updateEntry(update: UpdateSummary): FeedEntry {
  return {
    id: `update-${update.locale}-${update.slug}`,
    title: update.title,
    link: `${SITE_URL}/${update.locale}/updates/${update.slug}/`,
    date: update.date,
    text: [update.title, '', update.description].join('\n'),
  };
}

// Characters XML does not allow, then the ones it needs escaped.
const xmlText = (text: string) =>
  text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** The feed, newest entries first. */
export function socialFeed(entries: FeedEntry[], builtAt: Date): string {
  const newest = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, SOCIAL_FEED_SIZE);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>Ebola.help: official news and weekly updates</title>',
    `    <link>${SITE_URL}/</link>`,
    `    <atom:link href="${SITE_URL}${SOCIAL_FEED_PATH}" rel="self" type="application/rss+xml"/>`,
    '    <description>Official Ebola news (WHO, Africa CDC, national health institutes) and the Ebola.help weekly situation updates, for sharing on social media.</description>',
    `    <lastBuildDate>${builtAt.toUTCString()}</lastBuildDate>`,
    ...newest.map((entry) =>
      [
        '    <item>',
        `      <title>${xmlText(entry.title)}</title>`,
        `      <link>${xmlText(entry.link)}</link>`,
        `      <guid isPermaLink="false">${xmlText(entry.id)}</guid>`,
        `      <pubDate>${entry.date.toUTCString()}</pubDate>`,
        `      <description>${xmlText(entry.text)}</description>`,
        '    </item>',
      ].join('\n'),
    ),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
