/**
 * The single list of languages the site is published in.
 *
 * To add a language (for example Portuguese, Swahili or Lingala):
 *   1. Add an entry below.
 *   2. Copy src/i18n/messages/en.json to src/i18n/messages/<code>.json and translate it.
 *   3. Register the new file in src/i18n/index.ts.
 * The build and the unit tests fail if any text is missing.
 */

export const LOCALE_CODES = ['ar', 'zh', 'en', 'fr', 'ru', 'es'] as const;

export type Locale = (typeof LOCALE_CODES)[number];

export interface LocaleInfo {
  code: Locale;
  /** Name of the language written in that language, shown in the picker and switcher. */
  nativeName: string;
  englishName: string;
  dir: 'ltr' | 'rtl';
  /** BCP 47 tag for the html lang attribute and date formatting. */
  htmlLang: string;
  /** Open Graph locale, e.g. fr_FR. */
  ogLocale: string;
  /** Browser language prefixes that should suggest this locale on the picker. */
  matches: readonly string[];
}

export const LOCALES: Record<Locale, LocaleInfo> = {
  ar: {
    code: 'ar',
    nativeName: 'العربية',
    englishName: 'Arabic',
    dir: 'rtl',
    htmlLang: 'ar',
    ogLocale: 'ar_AR',
    matches: ['ar'],
  },
  zh: {
    code: 'zh',
    nativeName: '中文',
    englishName: 'Chinese',
    dir: 'ltr',
    htmlLang: 'zh-Hans',
    ogLocale: 'zh_CN',
    matches: ['zh'],
  },
  en: {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    dir: 'ltr',
    htmlLang: 'en',
    ogLocale: 'en_GB',
    matches: ['en'],
  },
  fr: {
    code: 'fr',
    nativeName: 'Français',
    englishName: 'French',
    dir: 'ltr',
    htmlLang: 'fr',
    ogLocale: 'fr_FR',
    matches: ['fr'],
  },
  ru: {
    code: 'ru',
    nativeName: 'Русский',
    englishName: 'Russian',
    dir: 'ltr',
    htmlLang: 'ru',
    ogLocale: 'ru_RU',
    matches: ['ru'],
  },
  es: {
    code: 'es',
    nativeName: 'Español',
    englishName: 'Spanish',
    dir: 'ltr',
    htmlLang: 'es',
    ogLocale: 'es_ES',
    matches: ['es'],
  },
};

export const LOCALE_LIST: readonly LocaleInfo[] = LOCALE_CODES.map((code) => LOCALES[code]);

/** Name of the cookie that remembers the visitor's chosen language. */
export const LOCALE_COOKIE = 'ebh_locale';

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALE_CODES as readonly string[]).includes(value);
}

/**
 * Pick the best supported locale for a list of browser languages
 * (navigator.languages or Accept-Language order). Returns undefined when
 * nothing matches, so the picker shows no suggestion.
 */
export function suggestLocale(browserLanguages: readonly string[]): Locale | undefined {
  for (const tag of browserLanguages) {
    const primary = tag.toLowerCase().split('-')[0];
    const found = LOCALE_LIST.find((l) => l.matches.includes(primary ?? ''));
    if (found) return found.code;
  }
  return undefined;
}
