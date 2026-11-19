import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n';

export type HealthEntry = CollectionEntry<'health'> | CollectionEntry<'healthDrafts'>;

/**
 * Preview build only (`npm run build:drafts`): drafts waiting for approval
 * (src/content/drafts/health/) replace the live pages, so the owner can read
 * them as they would appear. Never set when the live site is built.
 */
export const SHOW_DRAFTS = process.env['SHOW_DRAFTS'] === '1';

export const isDraft = (entry: HealthEntry) => entry.collection === 'healthDrafts';

/** Split an entry id like 'fr/symptoms' into its locale and slug. */
export function splitHealthId(id: string): { locale: Locale; slug: string } {
  const [locale, slug] = id.split('/');
  return { locale: locale as Locale, slug: slug ?? '' };
}

/** Every health page in every language (with drafts in their place in a preview build). */
export async function getAllHealthPages(): Promise<HealthEntry[]> {
  const live: HealthEntry[] = await getCollection('health');
  if (!SHOW_DRAFTS) return live;
  const drafts = new Map((await getCollection('healthDrafts')).map((entry) => [entry.id, entry]));
  return [
    ...live.map((entry) => drafts.get(entry.id) ?? entry),
    ...[...drafts.values()].filter((draft) => !live.some((entry) => entry.id === draft.id)),
  ];
}

/** Health pages of one language, in menu order. */
export async function getHealthPages(locale: Locale): Promise<HealthEntry[]> {
  const entries = (await getAllHealthPages()).filter((entry) => splitHealthId(entry.id).locale === locale);
  return entries.sort((a, b) => a.data.order - b.data.order);
}
