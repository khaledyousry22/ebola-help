/**
 * RSS feeds for social media. A posting service (Zapier, see SOCIAL.md) turns
 * each new entry into a Facebook post: the description is the text of the post
 * and the link is shown as a preview under it.
 *
 * - /feeds/social.xml: official news and situation updates (one post per
 *   language), a daily health tip and the case figures whenever they change
 *   (all languages of SOCIAL_FEED_LOCALES in one post).
 * - /feeds/media.xml: news coverage by media outlets, without alarming
 *   headlines. Kept apart so it can be switched on or off on its own.
 *
 * Only headline, source, date and link for news, as on the news pages:
 * articles are never copied. Tips and figures reuse the site's own checked
 * text (health guide key points, banner wording).
 */
import { SITE_URL } from '../config';
import type { NewsItem } from '../data/news-schema';
import { format, formatDate, formatNumber, getMessages, type Locale } from '../i18n';
import { countryName } from '../i18n/countries';

/** Newest entries kept in a feed. Posting services only look at new ones. */
export const FEED_SIZE = 30;

export interface FeedEntry {
  /** Never changes, so a posting service never posts the same entry twice. */
  id: string;
  title: string;
  link: string;
  date: Date;
  /** The text of the post. */
  text: string;
}

export interface FeedChannel {
  path: string;
  title: string;
  description: string;
}

export const SOCIAL_FEED: FeedChannel = {
  path: '/feeds/social.xml',
  title: 'Ebola.help: official news, situation updates, health tips and figures',
  description:
    'Official Ebola news (WHO, Africa CDC, national health institutes), the Ebola.help situation updates (twice a week), a daily health tip and the official case figures, for sharing on social media.',
};

export const MEDIA_FEED: FeedChannel = {
  path: '/feeds/media.xml',
  title: 'Ebola.help: news coverage',
  description: 'Ebola news from established media outlets, for sharing on social media. Headlines only, with links to the original articles.',
};

const homeUrl = (locale: Locale) => `${SITE_URL}/${locale}/`;
const DAY = 24 * 60 * 60 * 1000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * A news item: headline, source, date and the original link, then a link to
 * the site. The preview is the Ebola.help news page: some sites cannot be read
 * by Facebook (no preview tags, bot protection), and Facebook then refuses
 * the post ("Failed to parse URL").
 */
export function newsEntry(item: NewsItem): FeedEntry {
  const m = getMessages(item.lang);
  const date = formatDate(item.lang, item.publishedAt.slice(0, 10));
  return {
    id: `news-${item.id}`,
    title: item.title,
    link: `${SITE_URL}/${item.lang}/news/`,
    date: new Date(item.firstSeenAt),
    text: [
      item.title,
      '',
      format(m.feed.source, { source: item.sourceName, date }),
      item.url,
      '',
      format(m.feed.more, { url: homeUrl(item.lang) }),
    ].join('\n'),
  };
}

export interface UpdateSummary {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
  date: Date;
}

/** A situation update: title and summary. The preview is the update on Ebola.help. */
export function updateEntry(update: UpdateSummary): FeedEntry {
  return {
    id: `update-${update.locale}-${update.slug}`,
    title: update.title,
    link: `${SITE_URL}/${update.locale}/updates/${update.slug}/`,
    date: update.date,
    text: [update.title, '', update.description].join('\n'),
  };
}

// Headlines that would make a post sound alarming. A few calm stories are
// caught too ("overcoming fear"); for this site that is the safer mistake.
const ALARMING: Partial<Record<Locale, RegExp>> = {
  en: /\b(panic\w*|terrif\w*|horr\w*|nightmare\w*|killer\w*|deadly|out of control|apocalyp\w*|doom\w*|catastroph\w*|explod\w*|explosion|rampag\w*|frighten\w*|scar(?:y|e|es|ed)|chaos|chaotic|plague|fear\w*|spiral\w*)\b/i,
  fr: /\b(paniqu\w*|terrifi\w*|terreur|horreur|cauchemar\w*|tueu(?:r|se)\w*|meurtri\w*|hors de contrôle|apocalyp\w*|catastroph\w*|explos\w*|chaos|effray\w*|psychose|peur\w*|fléau|flamb\w*|hécatombe)\b/i,
};

/** False for headlines with alarming words. Languages without a word list are never shared. */
export function isCalmHeadline(item: Pick<NewsItem, 'title' | 'lang'>): boolean {
  const words = ALARMING[item.lang];
  return words !== undefined && !words.test(item.title);
}

export interface HealthGuide {
  slug: string;
  /** Position in the health section menu. */
  order: number;
  /** Title and key points in each language of the post. */
  text: Partial<Record<Locale, { title: string; keyPoints: string[] }>>;
}

/**
 * The order in which key points are shared: the first point of every guide,
 * then the second of every guide, and so on, so two days in a row never come
 * from the same guide (unless only one guide has points left).
 */
export function tipSequence(guides: HealthGuide[], locale: Locale): { guide: HealthGuide; point: number }[] {
  const sorted = [...guides].sort((a, b) => a.order - b.order);
  const longest = Math.max(0, ...sorted.map((g) => g.text[locale]?.keyPoints.length ?? 0));
  const sequence: { guide: HealthGuide; point: number }[] = [];
  for (let point = 0; point < longest; point++) {
    for (const guide of sorted) {
      if (point < (guide.text[locale]?.keyPoints.length ?? 0)) sequence.push({ guide, point });
    }
  }
  return sequence;
}

/** The day whose tip is shared: a new tip each day from 06:00 UTC, not in the middle of the night in Africa. */
export function tipDay(builtAt: Date): Date {
  const shifted = new Date(builtAt.getTime() - 6 * 60 * 60 * 1000);
  return new Date(`${isoDay(shifted)}T06:00:00Z`);
}

/** Today's health tip: one key point from a guide, in every language of the post, with a link to the guide. */
export function tipEntry(guides: HealthGuide[], locales: readonly Locale[], builtAt: Date): FeedEntry | undefined {
  const [first] = locales;
  if (!first) return undefined;
  const sequence = tipSequence(guides, first);
  if (sequence.length === 0) return undefined;
  const day = tipDay(builtAt);
  const { guide, point } = sequence[Math.floor(day.getTime() / DAY) % sequence.length]!;
  const blocks = locales.flatMap((locale) => {
    const text = guide.text[locale];
    const keyPoint = text?.keyPoints[point];
    if (!text || !keyPoint) return [];
    const m = getMessages(locale);
    return [
      [
        format(m.feed.tip, { text: keyPoint }),
        format(m.feed.readMore, { title: text.title, url: `${SITE_URL}/${locale}/health/${guide.slug}/` }),
      ].join('\n'),
    ];
  });
  return {
    id: `tip-${isoDay(day)}`,
    title: guide.text[first]?.keyPoints[point] ?? guide.slug,
    link: `${SITE_URL}/${first}/health/${guide.slug}/`,
    date: day,
    text: blocks.join('\n\n'),
  };
}

export interface HeadlineFigures {
  country: string;
  confirmedCases: number;
  confirmedDeaths: number;
  asOf: string;
  /** Publisher name in each language, as on the banner. */
  sourceName: (locale: Locale) => string;
}

/** The banner figures, in the banner's own words, in every language of the post. New figures make a new post. */
export function figuresEntry(figures: HeadlineFigures, locales: readonly Locale[]): FeedEntry | undefined {
  const [first] = locales;
  if (!first) return undefined;
  const blocks = locales.map((locale) => {
    const m = getMessages(locale);
    return [
      format(m.outbreak.headline, { country: countryName(locale, figures.country) }),
      format(m.outbreak.figures, {
        cases: formatNumber(locale, figures.confirmedCases),
        deaths: formatNumber(locale, figures.confirmedDeaths),
        date: formatDate(locale, figures.asOf),
      }),
      format(m.outbreak.source, { source: figures.sourceName(locale) }),
      format(m.feed.mapMore, { url: `${SITE_URL}/${locale}/map/` }),
    ].join('\n');
  });
  return {
    id: `figures-${figures.country}-${figures.asOf}-${figures.confirmedCases}-${figures.confirmedDeaths}`,
    title: format(getMessages(first).outbreak.headline, { country: countryName(first, figures.country) }),
    link: `${SITE_URL}/${first}/map/`,
    date: new Date(`${figures.asOf}T12:00:00Z`),
    text: blocks.join('\n\n'),
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
export function rssFeed(channel: FeedChannel, entries: FeedEntry[], builtAt: Date): string {
  const newest = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, FEED_SIZE);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xmlText(channel.title)}</title>`,
    `    <link>${SITE_URL}/</link>`,
    `    <atom:link href="${SITE_URL}${channel.path}" rel="self" type="application/rss+xml"/>`,
    `    <description>${xmlText(channel.description)}</description>`,
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

export const rssResponse = (xml: string) =>
  new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });

/** Media news is shared only if not official, in a feed language, and calm. */
export const isShareableMedia = (item: NewsItem, locales: readonly Locale[]) =>
  !item.official && locales.includes(item.lang) && isCalmHeadline(item);
