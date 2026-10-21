import { LOCALES, type Locale } from './locales';

/**
 * Official short names for countries whose standard browser names are
 * ambiguous ("Congo - Kinshasa"). Names follow United Nations usage.
 */
const OVERRIDES: Partial<Record<string, Record<Locale, string>>> = {
  CD: {
    ar: 'جمهورية الكونغو الديمقراطية',
    zh: '刚果民主共和国',
    en: 'Democratic Republic of the Congo',
    fr: 'République démocratique du Congo',
    ru: 'Демократическая Республика Конго',
    es: 'República Democrática del Congo',
  },
  CG: {
    ar: 'جمهورية الكونغو',
    zh: '刚果共和国',
    en: 'Republic of the Congo',
    fr: 'République du Congo',
    ru: 'Республика Конго',
    es: 'República del Congo',
  },
};

/** Country name in the reader's language, from a two-letter ISO code. */
export function countryName(locale: Locale, iso: string): string {
  const override = OVERRIDES[iso];
  if (override) return override[locale];
  return new Intl.DisplayNames([LOCALES[locale].intl], { type: 'region' }).of(iso) ?? iso;
}

/** Language name in the reader's language, e.g. languageName('fr', 'en') -> 'anglais'. */
export function languageName(locale: Locale, lang: string): string {
  return new Intl.DisplayNames([LOCALES[locale].intl], { type: 'language' }).of(lang) ?? lang;
}

/** "A, B and C" joined the way the reader's language does it. */
export function formatList(locale: Locale, items: string[]): string {
  return new Intl.ListFormat(LOCALES[locale].intl, { style: 'long', type: 'conjunction' }).format(items);
}
