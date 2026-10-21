import type { Locale } from '../../../src/i18n/locales';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', mdash: '—', ndash: '–',
  eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô',
  icirc: 'î', ucirc: 'û', ugrave: 'ù', euml: 'ë', iuml: 'ï', aacute: 'á', iacute: 'í',
  oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü', iexcl: '¡', iquest: '¿', deg: '°',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const value = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) && value > 0 && value < 0x110000 ? String.fromCodePoint(value) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Plain text from a feed field that may contain HTML. */
export function toPlainText(value: string): string {
  // Feeds often send HTML escaped as text (&lt;p&gt;), so decode before removing tags.
  const withoutTags = decodeEntities(value)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

/** Maximum excerpt length. Chinese packs more meaning per character. */
export const EXCERPT_LIMIT: Record<Locale, number> = { ar: 200, zh: 90, en: 200, fr: 200, ru: 200, es: 200 };

/**
 * A short excerpt only: never the full article. Cut at a word boundary and
 * end with an ellipsis. Returns undefined when there is nothing useful.
 */
export function makeExcerpt(raw: string | undefined, title: string, lang: Locale): string | undefined {
  if (!raw) return undefined;
  const text = toPlainText(raw);
  if (text.length < 20) return undefined;
  if (normalizeForCompare(text).startsWith(normalizeForCompare(title))) return undefined;
  const limit = EXCERPT_LIMIT[lang];
  if (text.length <= limit) return text;
  let cut = text.slice(0, limit);
  if (lang !== 'zh') {
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > limit * 0.6) cut = cut.slice(0, lastSpace);
  }
  return `${cut.replace(/[\s,;:.–—-]+$/u, '')}…`;
}

export function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
