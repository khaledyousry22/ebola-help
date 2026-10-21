/**
 * Reads RSS 2.0, RSS 1.0 (RDF) and Atom feeds into a simple list of entries.
 * External entities are never resolved (no network access from XML).
 */
import { XMLParser } from 'fast-xml-parser';

export interface FeedEntry {
  title: string;
  link: string;
  summary?: string | undefined;
  date?: string | undefined;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
  isArray: (name) => ['item', 'entry', 'link'].includes(name),
});

type Node = Record<string, unknown>;

/** Text of an XML node that may be a string, a number or { '#text': ... }. */
function text(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (typeof value === 'object' && '#text' in (value as Node)) return text((value as Node)['#text']);
  return undefined;
}

function atomLink(links: unknown): string | undefined {
  if (!Array.isArray(links)) return text(links);
  const nodes = links as Node[];
  const alternate = nodes.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate') ?? nodes[0];
  return typeof alternate === 'string' ? alternate : text(alternate?.['@_href']);
}

export function parseFeed(xml: string): FeedEntry[] {
  const doc = parser.parse(xml) as Node;
  const rss = doc['rss'] as Node | undefined;
  const rdf = doc['rdf:RDF'] as Node | undefined;
  const atom = doc['feed'] as Node | undefined;

  const items: Node[] =
    ((rss?.['channel'] as Node | undefined)?.['item'] as Node[] | undefined) ??
    (rdf?.['item'] as Node[] | undefined) ??
    ((atom?.['entry'] as Node[] | undefined) ?? []);

  const entries: FeedEntry[] = [];
  for (const item of items) {
    const title = text(item['title']);
    const link = atom ? atomLink(item['link']) : text(item['link']) ?? text(item['guid']);
    if (!title || !link) continue;
    entries.push({
      title,
      link,
      summary: text(item['description']) ?? text(item['summary']) ?? text(item['content']),
      date:
        text(item['pubDate']) ?? text(item['dc:date']) ?? text(item['published']) ?? text(item['updated']),
    });
  }
  return entries;
}
