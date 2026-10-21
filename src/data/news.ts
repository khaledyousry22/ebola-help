/**
 * News for the website, read from src/data/news/items.json (written by the
 * hourly news job) and src/data/news/overrides.json (hide or pin items).
 * The build fails if either file is malformed.
 */
import { LOCALE_CODES, type Locale } from '../i18n/locales';
import raw from './news/items.json' with { type: 'json' };
import overridesRaw from './news/overrides.json' with { type: 'json' };
import { newsFileSchema, newsOverridesSchema, type NewsItem } from './news-schema';
import { NEWS_SOURCES, newsSourceById } from './news-sources';

export type { NewsItem } from './news-schema';

export const NEWS = newsFileSchema.parse(raw);
const OVERRIDES = newsOverridesSchema.parse(overridesRaw);

const listed = (item: NewsItem, list: string[]) => list.includes(item.id) || list.includes(item.url);

export const isPinned = (item: NewsItem) => listed(item, OVERRIDES.pinned);

/** Pinned first, then newest first. */
const ordered = (items: NewsItem[]) =>
  [...items].sort(
    (a, b) => Number(isPinned(b)) - Number(isPinned(a)) || b.publishedAt.localeCompare(a.publishedAt),
  );

const VISIBLE = NEWS.items.filter((item) => !listed(item, OVERRIDES.hidden));

/** Languages a publisher group covers, e.g. WHO news in all six. */
function groupLanguages(group: string): Set<string> {
  return new Set(NEWS_SOURCES.filter((s) => s.group === group).flatMap((s) => (s.lang ? [s.lang] : [])));
}

/**
 * Official updates for a reader: everything in their language, plus reports
 * that the publisher does not issue in that language (WHO outbreak reports,
 * DRC situation reports...). When a publisher issues the same update in
 * several languages, the reader sees one version only.
 */
export function officialUpdates(locale: Locale): NewsItem[] {
  const official = VISIBLE.filter((item) => item.official);
  const publisher = (item: NewsItem) => newsSourceById(item.sourceId)?.group ?? item.sourceId;
  const DAY = 24 * 60 * 60 * 1000;
  // Some publishers put several language versions of one announcement in the same feed.
  const hasLocalVersion = (item: NewsItem) =>
    official.some(
      (other) =>
        other.lang === locale &&
        publisher(other) === publisher(item) &&
        Math.abs(Date.parse(other.publishedAt) - Date.parse(item.publishedAt)) <= DAY,
    );
  return ordered(
    official.filter((item) => {
      if (item.lang === locale) return true;
      if (hasLocalVersion(item)) return false;
      const group = newsSourceById(item.sourceId)?.group;
      if (!group) return true;
      const languages = groupLanguages(group);
      if (languages.has(locale)) return false;
      // Publisher not available in the reader's language: show one version, English if offered.
      return languages.has('en') ? item.lang === 'en' : true;
    }),
  );
}

/** News coverage (not official) in the reader's language. */
export function mediaCoverage(locale: Locale): NewsItem[] {
  return ordered(VISIBLE.filter((item) => !item.official && item.lang === locale));
}

/** Everything in other languages, grouped by language (largest group first). */
export function otherLanguageNews(locale: Locale): { lang: Locale; items: NewsItem[] }[] {
  return LOCALE_CODES.filter((lang) => lang !== locale)
    .map((lang) => ({ lang, items: ordered(VISIBLE.filter((item) => item.lang === lang)) }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);
}

/** Latest news mentioning a country, for country pages and the map. */
export function newsForCountry(iso: string, locale: Locale): NewsItem[] {
  return ordered(VISIBLE.filter((item) => item.countries.includes(iso) && (item.lang === locale || item.official)));
}
