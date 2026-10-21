/**
 * Turns raw entries from a source into news items: keeps only Ebola-related
 * entries in one of our six languages, cleans the link, writes a short
 * excerpt and tags countries.
 */
import { NEWS_EXCERPTS } from '../../../src/config';
import type { NewsSource } from '../../../src/data/news-sources';
import type { NewsItem } from '../../../src/data/news-schema';
import { tagCountries } from './countries';
import type { RawEntry } from './fetchers';
import { isEbolaRelated } from './keywords';
import { resolveLanguage } from './language';
import { makeExcerpt, toPlainText } from './text';
import { cleanUrl, itemId } from './url';

const ONE_DAY = 24 * 60 * 60 * 1000;

/** Publication date, or now when missing, unreadable or in the future. */
export function itemDate(raw: string | undefined, now: Date): string {
  const parsed = raw ? Date.parse(raw) : Number.NaN;
  if (Number.isNaN(parsed) || parsed > now.getTime() + ONE_DAY) return now.toISOString();
  return new Date(parsed).toISOString();
}

export function toNewsItems(source: NewsSource, entries: RawEntry[], now: Date): NewsItem[] {
  const items: NewsItem[] = [];
  for (const entry of entries) {
    const title = toPlainText(entry.title);
    const summaryText = entry.summary ? toPlainText(entry.summary) : '';
    if (!title || !isEbolaRelated(`${title} ${summaryText}`, source.extraKeywords)) continue;

    const lang = resolveLanguage(entry.lang ?? source.lang, `${title} ${summaryText}`);
    if (!lang) continue;
    const url = cleanUrl(entry.link);
    if (!url) continue;

    items.push({
      id: itemId(url),
      url,
      title: title.length > 400 ? `${title.slice(0, 399)}…` : title,
      // Extracts are only kept when the site is non-commercial (see src/config.ts).
      ...(NEWS_EXCERPTS ? { excerpt: makeExcerpt(entry.summary, title, lang) } : {}),
      lang,
      sourceId: source.id,
      sourceName: entry.outlet ?? source.name,
      official: source.type === 'official',
      publishedAt: itemDate(entry.date, now),
      firstSeenAt: now.toISOString(),
      countries: [...new Set([...(source.defaultCountries ?? []), ...tagCountries(`${title} ${summaryText}`)])].sort(),
      alsoReportedBy: [],
    });
  }
  return items;
}
