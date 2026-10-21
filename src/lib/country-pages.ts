import { HELP_COUNTRIES } from '../data/help';
import { countrySituation, OUTBREAK, type CountrySituation, type MapStatus } from '../data/outbreak';
import { LOCALES, type Locale } from '../i18n';
import { countryName } from '../i18n/countries';

/** Every country with a page: those in the outbreak data and those with contacts. */
export const COUNTRY_PAGES: string[] = [...new Set([...OUTBREAK.countries.map((c) => c.iso), ...HELP_COUNTRIES])].sort();

const ORDER: Record<MapStatus, number> = { active: 0, monitoring: 1, recent: 2, none: 3 };

export interface CountryRow {
  iso: string;
  name: string;
  situation: CountrySituation;
}

/** Countries for a reader: most affected first, then alphabetical in their language. */
export function sortedCountries(locale: Locale): CountryRow[] {
  return COUNTRY_PAGES.map((iso) => ({ iso, name: countryName(locale, iso), situation: countrySituation(iso) })).sort(
    (a, b) =>
      ORDER[a.situation.status] - ORDER[b.situation.status] || a.name.localeCompare(b.name, LOCALES[locale].intl),
  );
}

export const countryPath = (iso: string) => `/countries/${iso.toLowerCase()}/`;
