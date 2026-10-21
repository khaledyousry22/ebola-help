/**
 * Downloads each kind of source and turns it into raw entries.
 * Every request identifies the site, has a timeout and a size limit.
 */
import { GDELT_DOMAINS, GDELT_LANGUAGES, type NewsSource } from '../../../src/data/news-sources';
import { LOCALE_CODES, type Locale } from '../../../src/i18n/locales';
import { parseFeed } from './feeds';
import { hostMatches } from './url';

export const USER_AGENT = 'EbolaHelpNewsBot/1.0 (+https://ebola.help/en/about/)';
const MAX_BYTES = 5_000_000;

export interface RawEntry {
  title: string;
  link: string;
  summary?: string | undefined;
  date?: string | undefined;
  /** Language reported by the source itself (GDELT), if any. */
  lang?: Locale | undefined;
  /** Outlet name when one source covers many outlets (GDELT). */
  outlet?: string | undefined;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchText(url: string, { timeoutMs = 20_000, retries = 1 } = {}): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': USER_AGENT,
          accept: 'application/rss+xml, application/atom+xml, application/xml, application/json, text/xml;q=0.9, */*;q=0.5',
        },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      });
      if (!response.ok) throw new HttpError(response.status, url);
      const body = await response.text();
      if (body.length > MAX_BYTES) throw new Error(`Response too large from ${url}`);
      return body;
    } catch (error) {
      const retryable = !(error instanceof HttpError) || error.status >= 500;
      if (attempt >= retries || !retryable) throw error;
      await sleep(2_000);
    }
  }
}

async function fetchRss(source: NewsSource): Promise<RawEntry[]> {
  const body = await fetchText(source.url);
  // A blocking or error page arrives as HTML: report it instead of "0 items".
  if (!/<(rss|feed|rdf:RDF)[\s>]/.test(body.slice(0, 5000))) {
    throw new Error(`Not a feed (received ${body.trimStart().slice(0, 40).replace(/\s+/g, ' ')}…)`);
  }
  return parseFeed(body);
}

interface WhoDonItem {
  Title?: string;
  Summary?: string;
  PublicationDateAndTime?: string;
  UrlName?: string;
  DonId?: string;
}

async function fetchWhoDon(source: NewsSource): Promise<RawEntry[]> {
  const data = JSON.parse(await fetchText(source.url)) as { value?: WhoDonItem[] };
  return (data.value ?? [])
    .filter((item) => item.Title && item.UrlName)
    .map((item) => ({
      // WHO gives every update in a series the same title; its report number tells them apart.
      title: item.DonId ? `${item.Title!} (${item.DonId})` : item.Title!,
      link: `https://www.who.int/emergencies/disease-outbreak-news/item/${item.UrlName}`,
      summary: item.Summary,
      date: item.PublicationDateAndTime,
    }));
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
}

/** GDELT dates look like 20261021T101500Z. */
function gdeltDate(value: string | undefined): string | undefined {
  const m = value?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : undefined;
}

/**
 * One search per language, five seconds apart as GDELT asks. Only articles
 * from the outlets in GDELT_DOMAINS are kept. Stops at the first refusal.
 */
async function fetchGdelt(source: NewsSource): Promise<RawEntry[]> {
  const entries: RawEntry[] = [];
  for (const [index, lang] of LOCALE_CODES.entries()) {
    if (index > 0) await sleep(6_000);
    const query = `(ebola OR bundibugyo) sourcelang:${GDELT_LANGUAGES[lang]}`;
    const url = `${source.url}?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=75&format=json&timespan=3d&sort=datedesc`;
    let body: string;
    try {
      body = await fetchText(url, { retries: 0 });
    } catch (error) {
      // GDELT often refuses busy shared connections. Keep what was already found.
      if (entries.length > 0 || index > 0) {
        console.warn(`gdelt: stopped at ${lang} (${error instanceof Error ? error.message : error}); keeping ${entries.length} result(s)`);
        return entries;
      }
      throw error;
    }
    let articles: GdeltArticle[] = [];
    try {
      articles = (JSON.parse(body) as { articles?: GdeltArticle[] }).articles ?? [];
    } catch {
      throw new Error(`GDELT returned something other than JSON for ${lang}: ${body.slice(0, 80)}`);
    }
    for (const article of articles) {
      if (!article.url || !article.title || !article.domain) continue;
      const domain = Object.keys(GDELT_DOMAINS).find((d) => hostMatches(article.domain!, d));
      if (!domain) continue;
      entries.push({
        title: article.title,
        link: article.url,
        date: gdeltDate(article.seendate),
        lang,
        outlet: GDELT_DOMAINS[domain],
      });
    }
  }
  return entries;
}

export async function fetchSource(source: NewsSource): Promise<RawEntry[]> {
  switch (source.kind) {
    case 'rss':
      return fetchRss(source);
    case 'who-don':
      return fetchWhoDon(source);
    case 'gdelt':
      return fetchGdelt(source);
  }
}
