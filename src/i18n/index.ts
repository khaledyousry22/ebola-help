import ar from './messages/ar.json' with { type: 'json' };
import en from './messages/en.json' with { type: 'json' };
import es from './messages/es.json' with { type: 'json' };
import fr from './messages/fr.json' with { type: 'json' };
import ru from './messages/ru.json' with { type: 'json' };
import zh from './messages/zh.json' with { type: 'json' };
import { LOCALES, type Locale } from './locales';

export * from './locales';

/** English is the reference: every other language must have exactly the same keys. */
export type Messages = typeof en;

// The type annotation makes the build fail if a language is missing a key.
const MESSAGES: Record<Locale, Messages> = { ar, zh, en, fr, ru, es };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

/** Replace {name} placeholders, e.g. format('Write to {email}', { email: 'a@b' }). */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Build a URL path inside a locale, e.g. localePath('fr', '/about/') -> '/fr/about/'. */
export function localePath(locale: Locale, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/**
 * Remove the locale prefix from a pathname: '/fr/about/' -> '/about/'.
 * Used to link to the same page in another language.
 */
export function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2,3})(\/.*)?$/);
  if (match && match[1] && match[1] in LOCALES) return match[2] ?? '/';
  return pathname;
}

/** Long, human-readable date and time in the visitor's language, always in UTC. */
export function formatDateTime(locale: Locale, date: Date): string {
  return new Intl.DateTimeFormat(LOCALES[locale].htmlLang, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date) + ' UTC';
}

/**
 * Split a translated sentence around one {placeholder} so a link or other
 * element can be rendered in its place: splitAt('Write to {email}', 'email')
 * -> ['Write to ', ''].
 */
export function splitAt(template: string, key: string): [string, string] {
  const marker = `{${key}}`;
  const index = template.indexOf(marker);
  if (index === -1) return [template, ''];
  return [template.slice(0, index), template.slice(index + marker.length)];
}
