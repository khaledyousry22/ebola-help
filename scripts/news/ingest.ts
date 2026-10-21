/**
 * Hourly news job.
 *
 *   npm run news            fetch all sources and update src/data/news/items.json
 *   npm run news -- --dry   fetch and report, but do not write anything
 *   npm run news -- --only=who-don,un-news-fr   only these sources
 *   npm run news -- --no-gdelt                  skip the GDELT search
 *
 * The file is written only when the list of items changes. The job fails
 * (exit code 1) only if every source failed, so one broken feed never stops
 * the others.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { NEWS_SOURCES, type NewsSource } from '../../src/data/news-sources';
import { newsFileSchema, type NewsFile, type NewsItem } from '../../src/data/news-schema';
import { LOCALE_CODES } from '../../src/i18n/locales';
import { mergeItems } from './lib/dedupe';
import { fetchSource } from './lib/fetchers';
import { toNewsItems } from './lib/process';

export const STORE_PATH = 'src/data/news/items.json';
const KEEP_DAYS = 180;
const MAX_ITEMS = 800;

interface SourceResult {
  source: NewsSource;
  fetched: number;
  relevant: NewsItem[];
  error?: string;
}

async function runSource(source: NewsSource, now: Date): Promise<SourceResult> {
  try {
    const entries = await fetchSource(source);
    return { source, fetched: entries.length, relevant: toNewsItems(source, entries, now) };
  } catch (error) {
    const message = error instanceof Error ? (error.cause instanceof Error ? `${error.message}: ${error.cause.message}` : error.message) : String(error);
    return { source, fetched: 0, relevant: [], error: message };
  }
}

/** Run tasks a few at a time, to be polite to publishers. */
async function inBatches<T, R>(list: T[], size: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < list.length; i += size) {
    results.push(...(await Promise.all(list.slice(i, i + size).map(task))));
  }
  return results;
}

export function readStore(path = STORE_PATH): NewsFile {
  if (!existsSync(path)) return { updatedAt: new Date(0).toISOString(), items: [] };
  return newsFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

/** Newest first; drop items older than KEEP_DAYS and keep at most MAX_ITEMS. */
export function prune(items: NewsItem[], now: Date): NewsItem[] {
  const oldest = now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  return items
    .filter((item) => Date.parse(item.publishedAt) >= oldest)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id))
    .slice(0, MAX_ITEMS);
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
  const noGdelt = args.includes('--no-gdelt');
  const now = new Date();

  const sources = NEWS_SOURCES.filter(
    (s) => s.enabled && (!only || only.includes(s.id)) && !(noGdelt && s.kind === 'gdelt'),
  );
  const feeds = sources.filter((s) => s.kind !== 'gdelt');
  const gdelt = sources.filter((s) => s.kind === 'gdelt');

  // GDELT is slow (one request every few seconds), so it runs alongside the feeds.
  const [feedResults, gdeltResults] = await Promise.all([
    inBatches(feeds, 4, (s) => runSource(s, now)),
    inBatches(gdelt, 1, (s) => runSource(s, now)),
  ]);
  const results = [...feedResults, ...gdeltResults];

  // Official first, then oldest first, so the original report is the one kept.
  const incoming = results
    .flatMap((r) => r.relevant)
    .sort((a, b) => Number(b.official) - Number(a.official) || a.publishedAt.localeCompare(b.publishedAt));

  const store = readStore();
  const { items: merged, added } = mergeItems(store.items, incoming);
  const items = prune(merged, now);
  const changed = JSON.stringify(items) !== JSON.stringify(store.items);

  // Report.
  for (const r of results) {
    const status = r.error ? `FAILED  ${r.error}` : `ok      ${r.fetched} fetched, ${r.relevant.length} about Ebola`;
    console.log(`${r.source.id.padEnd(22)} ${status}`);
  }
  const perLanguage = LOCALE_CODES.map((l) => `${l}=${items.filter((i) => i.lang === l).length}`).join(' ');
  console.log(`\n${added} new item(s). Stored: ${items.length} (${perLanguage}).`);

  const failed = results.filter((r) => r.error).length;
  if (failed === results.length) {
    console.error('Every source failed. Nothing was changed.');
    process.exitCode = 1;
    return;
  }
  if (dry) {
    console.log('Dry run: nothing written.');
    return;
  }
  if (!changed) {
    console.log('No change.');
    return;
  }
  const file: NewsFile = newsFileSchema.parse({ updatedAt: now.toISOString(), items });
  writeFileSync(STORE_PATH, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`Wrote ${STORE_PATH}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
