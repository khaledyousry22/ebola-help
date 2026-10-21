import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n';

export type HealthEntry = CollectionEntry<'health'>;

/** Split an entry id like 'fr/symptoms' into its locale and slug. */
export function splitHealthId(id: string): { locale: Locale; slug: string } {
  const [locale, slug] = id.split('/');
  return { locale: locale as Locale, slug: slug ?? '' };
}

/** Health pages of one language, in menu order. */
export async function getHealthPages(locale: Locale): Promise<HealthEntry[]> {
  const entries = await getCollection('health', (entry) => splitHealthId(entry.id).locale === locale);
  return entries.sort((a, b) => a.data.order - b.data.order);
}
