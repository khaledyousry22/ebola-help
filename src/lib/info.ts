import { getEntry, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n';
import type { InfoSlug } from './info-pages';

export { INFO_PAGES, type InfoSlug } from './info-pages';

export async function getInfoPage(locale: Locale, slug: InfoSlug): Promise<CollectionEntry<'info'>> {
  const entry = await getEntry('info', `${locale}/${slug}`);
  if (!entry) throw new Error(`Missing src/content/info/${locale}/${slug}.md`);
  return entry;
}
