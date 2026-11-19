/**
 * Source links after each claim.
 *
 * In a health page (or situation update), write the id of a source from
 * src/data/sources.ts between double square brackets at the end of a
 * sentence, paragraph or list item:
 *
 *     Symptoms appear 2 to 21 days after infection.[[whoFactSheet]]
 *
 * The page shows it as a small numbered link, "[1]", to that source in the
 * list of sources at the end of the page. The number is the source's place
 * in the page's `sources` list, so the same marker works in every language.
 * The build fails if a page cites a source that is not in its `sources` list.
 */
import { fileURLToPath } from 'node:url';
import { defineMdastPlugin } from 'satteri';
import { format, getMessages, isLocale, type Locale } from '../i18n';

const MARKER = /\[\[([A-Za-z0-9]+)\]\]/g;

/** Anchor of a source in the list at the end of the page (SourceList). */
export const sourceAnchor = (id: string) => `source-${id}`;

/** The source ids cited in a text, in order (repeats included). */
export function citedIds(text: string): string[] {
  return [...text.matchAll(MARKER)].map((match) => match[1]!);
}

/** Remove the markers, for places without a source list (home page, social media posts). */
export function stripCitations(text: string): string {
  return text.replace(/\s*\[\[[A-Za-z0-9]+\]\]/g, '');
}

export type TextPart = { text: string } | { id: string; number: number; label: string };

/** Split a text into plain parts and numbered citations. */
export function citationParts(text: string, sources: readonly string[], locale: Locale, where = ''): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKER)) {
    const id = match[1]!;
    const number = sources.indexOf(id) + 1;
    if (number === 0) throw new Error(`${where}: [[${id}]] is not in the page's sources list`);
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ id, number, label: format(getMessages(locale).health.cite, { n: number }) });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const citationHtml = (part: { id: string; number: number; label: string }) =>
  `<sup class="cite"><a href="#${sourceAnchor(part.id)}" aria-label="${escapeHtml(part.label)}">[${part.number}]</a></sup>`;

/**
 * Markdown plugin (Astro's Sätteri processor, see astro.config.mjs) that turns
 * [[sourceId]] markers into numbered links.
 */
export const citationsPlugin = defineMdastPlugin({
  name: 'ebola-help-citations',
  text(node, ctx) {
    if (!node.value.includes('[[')) return;
    const path = ctx.fileURL ? fileURLToPath(ctx.fileURL) : '';
    const locale = path.match(/[\\/](?:health|updates)[\\/]([a-z]{2})[\\/][^\\/]+\.md$/)?.[1];
    const sources = ctx.data.astro?.frontmatter?.['sources'];
    if (!isLocale(locale) || !Array.isArray(sources)) {
      throw new Error(`${path}: source markers are only allowed in health pages and situation updates`);
    }
    ctx.replaceNode(
      node,
      citationParts(node.value, sources as string[], locale, path).map((part) =>
        'text' in part ? { type: 'text' as const, value: part.text } : { type: 'html' as const, value: citationHtml(part) },
      ),
    );
  },
});
