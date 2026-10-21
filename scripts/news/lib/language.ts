import type { Locale } from '../../../src/i18n/locales';

const STOPWORDS: Record<'en' | 'fr' | 'es', Set<string>> = {
  en: new Set('the and of to in is for on with as from by are was has have outbreak health says'.split(' ')),
  fr: new Set('le la les des du et en un une pour dans est sur au aux qui que avec par selon santé'.split(' ')),
  es: new Set('el los las del y en un una por para con se es al que como según salud brote'.split(' ')),
};

function count(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/**
 * Guess the language of a short text. Uses the writing system first, then
 * common words for English, French and Spanish. Returns undefined if unsure.
 */
export function detectLanguage(text: string): Locale | undefined {
  const arabic = count(text, /[؀-ۿ]/g);
  const chinese = count(text, /[一-鿿]/g);
  const cyrillic = count(text, /[Ѐ-ӿ]/g);
  const latin = count(text, /[A-Za-zÀ-ÿ]/g);
  const max = Math.max(arabic, chinese, cyrillic, latin);
  if (max === 0) return undefined;
  if (max === arabic) return 'ar';
  if (max === chinese) return 'zh';
  if (max === cyrillic) return 'ru';

  const words = text.toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean);
  const scores = (['en', 'fr', 'es'] as const).map((lang) => ({
    lang,
    score: words.filter((w) => STOPWORDS[lang].has(w)).length,
  }));
  scores.sort((a, b) => b.score - a.score);
  const [best, second] = scores;
  if (!best || best.score === 0 || best.score === second?.score) return undefined;
  return best.lang;
}

/**
 * The language to record for an item: the feed's declared language, unless
 * the text is clearly written in another one.
 */
export function resolveLanguage(declared: Locale | undefined, text: string): Locale | undefined {
  const detected = detectLanguage(text);
  if (!declared) return detected;
  if (!detected || detected === declared) return declared;
  const script = (l: Locale) => (l === 'ar' || l === 'zh' || l === 'ru' ? l : 'latin');
  // Different writing system: trust the text.
  if (script(detected) !== script(declared)) return detected;
  // Same alphabet (en/fr/es): switch only with clear evidence.
  const words = text.toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean);
  const score = (l: 'en' | 'fr' | 'es') => words.filter((w) => STOPWORDS[l].has(w)).length;
  const d = detected as 'en' | 'fr' | 'es';
  const c = declared as 'en' | 'fr' | 'es';
  return score(d) >= score(c) + 2 ? detected : declared;
}
