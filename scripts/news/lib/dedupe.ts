/**
 * Recognises the same story reported twice: identical links, or headlines in
 * the same language that share most of their words within two days.
 */
import type { NewsItem } from '../../../src/data/news-schema';
import { normalizeForCompare } from './text';

const WINDOW_MS = 48 * 60 * 60 * 1000;
const THRESHOLD = 0.8;

export function titleTokens(title: string, lang: string): Set<string> {
  const text = normalizeForCompare(title);
  if (lang === 'zh') {
    const chars = [...text.replace(/\s+/g, '')];
    return new Set(chars.slice(0, -1).map((c, i) => c + chars[i + 1]));
  }
  return new Set(text.split(' ').filter((w) => w.length > 2));
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  return shared / (a.size + b.size - shared);
}

export function isSameStory(a: NewsItem, b: NewsItem): boolean {
  if (a.lang !== b.lang) return false;
  if (Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt)) > WINDOW_MS) return false;
  return similarity(titleTokens(a.title, a.lang), titleTokens(b.title, b.lang)) >= THRESHOLD;
}

/**
 * Add new items to the existing list. Returns the merged list and how many
 * items were genuinely new. When two outlets carry the same story, the
 * official one (or the first one seen) is kept and the other is listed as
 * "also reported by".
 */
export function mergeItems(existing: NewsItem[], incoming: NewsItem[]): { items: NewsItem[]; added: number } {
  const byId = new Map(existing.map((item) => [item.id, item]));
  const items = [...existing];
  let added = 0;
  for (const candidate of incoming) {
    if (byId.has(candidate.id)) continue;
    const twinIndex = items.findIndex((item) => isSameStory(item, candidate));
    if (twinIndex >= 0) {
      const twin = items[twinIndex]!;
      if (candidate.official && !twin.official) {
        items[twinIndex] = { ...candidate, alsoReportedBy: unique([...candidate.alsoReportedBy, twin.sourceName]) };
        byId.delete(twin.id);
        byId.set(candidate.id, items[twinIndex]!);
      } else if (twin.sourceName !== candidate.sourceName) {
        items[twinIndex] = { ...twin, alsoReportedBy: unique([...twin.alsoReportedBy, candidate.sourceName]) };
      }
      continue;
    }
    items.push(candidate);
    byId.set(candidate.id, candidate);
    added++;
  }
  return { items, added };
}

const unique = (list: string[]) => [...new Set(list)];
