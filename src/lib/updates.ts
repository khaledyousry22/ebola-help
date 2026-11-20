import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n';

export type UpdateEntry = CollectionEntry<'updates'>;

/** Split an entry id like 'fr/2026-11-06' into its locale and slug. */
export function splitUpdateId(id: string): { locale: Locale; slug: string } {
  const [locale, slug] = id.split('/');
  return { locale: locale as Locale, slug: slug ?? '' };
}

/** Situation updates in one language, newest first. */
export async function getUpdates(locale: Locale): Promise<UpdateEntry[]> {
  const entries = await getCollection('updates', (entry) => splitUpdateId(entry.id).locale === locale);
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const updatePath = (entry: UpdateEntry) => `/updates/${splitUpdateId(entry.id).slug}/`;
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Date a page last changed (YYYY-MM-DD): its own date, or its latest correction if later. */
export const lastChange = (date: Date, corrections: readonly { date: Date }[] = []) =>
  isoDay(new Date(Math.max(date.getTime(), ...corrections.map((c) => c.date.getTime()))));
