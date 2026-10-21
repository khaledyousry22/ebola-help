/**
 * Decides whether a headline or excerpt is about Ebola, in any of the six
 * languages. Matching is deliberately simple and conservative: the word for
 * Ebola or Bundibugyo must appear.
 */

const EBOLA_PATTERNS: RegExp[] = [
  /(?<!\p{L})[eé]bola/iu, // Ebola, ébola, Ebolavirus (en, fr, es)
  /bundibugyo/iu,
  /эбол/iu, // Эбола, Эболы, эболавирусная (ru)
  /бундибуг|бундибудж/iu,
  /[إا]يبولا/u, // إيبولا، الإيبولا، ايبولا (ar)
  /بونديبو[غج]يو/u,
  /埃博拉/u, // zh
  /本迪布焦/u,
];

export function isEbolaRelated(text: string, extraKeywords: readonly string[] = []): boolean {
  if (EBOLA_PATTERNS.some((pattern) => pattern.test(text))) return true;
  if (extraKeywords.length === 0) return false;
  const escaped = extraKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Extra keywords are abbreviations (e.g. MVE): match whole words, case-sensitive.
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${escaped.join('|')})(?![\\p{L}])`, 'u').test(text);
}
