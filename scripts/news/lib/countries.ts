/**
 * Tags news items with the African countries they mention, in any of the
 * six languages. Country names come from the browser/Node language data
 * (Intl.DisplayNames), plus common short forms and the provinces and cities
 * most often named in Ebola news.
 */
import { LOCALE_LIST } from '../../../src/i18n/locales';
import { countryName } from '../../../src/i18n/countries';

/** African Union member states (ISO 3166-1 alpha-2). */
export const AFRICAN_COUNTRIES = [
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG',
  'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML',
  'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD',
  'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
] as const;

const ALIASES: Record<string, string[]> = {
  CD: [
    'DRC', 'DR Congo', 'D.R. Congo', 'Democratic Republic of Congo', 'Congo-Kinshasa', 'Congo Kinshasa',
    'RDC', 'RD Congo', 'R.D. Congo', 'RDCongo', 'République démocratique du Congo', 'RD del Congo',
    'República Democrática del Congo', 'ДРК', 'ДР Конго', 'Демократической Республике Конго',
    'Демократической Республики Конго', '刚果（金）', '刚果(金)', '刚果金', '刚果民主共和国',
    'الكونغو الديمقراطية', 'جمهورية الكونغو الديمقراطية',
    // Plain "Congo" in Ebola news nearly always means the DRC. Longer names
    // (Republic of the Congo, Congo-Brazzaville) are matched first.
    'Congo', 'Конго', '刚果', 'الكونغو',
    // Provinces and towns named in the 2026 outbreak.
    'Kinshasa', 'Ituri', 'North Kivu', 'Nord-Kivu', 'South Kivu', 'Sud-Kivu', 'Haut-Uele', 'Haut-Uélé',
    'Bas-Uele', 'Bas-Uélé', 'Tshopo', 'Sud-Ubangi', 'Nord-Ubangi', 'Bunia', 'Butembo', 'Goma',
    'Mongwalu', 'Mambasa', 'Mandima', 'Rwampara', 'Katwa', 'Kisangani', 'Итури', 'Северное Киву',
    'Северная Киву', '伊图里', '北基伍', 'إيتوري', 'شمال كيفو',
  ],
  CG: ['Congo-Brazzaville', 'Congo Brazzaville', 'Brazzaville', 'République du Congo', 'Republic of Congo'],
  UG: ['Kampala', 'Кампала', '坎帕拉', 'كمبالا'],
  KE: ['Nairobi', 'Найроби', '内罗毕', 'نيروبي'],
  NG: ['Abuja', 'Lagos', 'Абуджа', '阿布贾', 'أبوجا'],
  RW: ['Kigali'],
  SS: ['Juba', 'South Sudan', 'Soudan du Sud', 'Sudán del Sur'],
  BI: ['Bujumbura'],
  TZ: ['Dar es Salaam'],
};

const AMBIGUOUS_CONGO = new Set(['congo', 'конго', '刚果', 'الكونغو']);

/** Country names that are also common words: Russian "того" (Togo), Arabic "مالي" (financial). */
const COMMON_WORDS = new Set(['того', 'مالي']);

interface Entry {
  name: string;
  code: string;
  pattern: RegExp;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildPattern(name: string): RegExp {
  const lower = name.toLowerCase();
  if (/[一-鿿]/.test(name)) return new RegExp(escape(lower), 'u');
  if (/[؀-ۿ]/.test(name)) {
    // Arabic attaches "and", "in", "to" as one-letter prefixes (وكينيا، بالكونغو).
    return new RegExp(`(?<!\\p{L})(?:[وبلف]?(?:ال)?)?${escape(lower.replace(/^ال/, ''))}`, 'u');
  }
  if (/[Ѐ-ӿ]/.test(name) && lower.length > 4 && /[ая]$/.test(lower)) {
    // Russian case endings: Уганда, Уганде, Уганды, Уганду. Names ending in
    // other letters (Мали, Конго) do not change, so they are matched exactly.
    return new RegExp(`(?<!\\p{L})${escape(lower.slice(0, -1))}\\p{L}{0,2}(?!\\p{L})`, 'u');
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(lower)}(?![\\p{L}])`, 'u');
}

function buildGazetteer(): Entry[] {
  const seen = new Set<string>();
  const entries: Entry[] = [];
  const add = (name: string, code: string) => {
    const key = `${name.toLowerCase()}|${code}`;
    if (name.length < 3 || seen.has(key)) return;
    // Some languages call the Republic of the Congo just "Congo"; keep that for the DRC.
    if (code === 'CG' && AMBIGUOUS_CONGO.has(name.toLowerCase())) return;
    if (COMMON_WORDS.has(name.toLowerCase())) return;
    seen.add(key);
    entries.push({ name, code, pattern: buildPattern(name) });
  };
  for (const code of AFRICAN_COUNTRIES) {
    for (const locale of LOCALE_LIST) {
      add(countryName(locale.code, code), code);
      const intlName = new Intl.DisplayNames([locale.intl], { type: 'region' }).of(code);
      if (intlName && intlName !== code) add(intlName, code);
    }
    for (const alias of ALIASES[code] ?? []) add(alias, code);
  }
  // Longest names first, so "Republic of the Congo" wins over "Congo".
  return entries.sort((a, b) => b.name.length - a.name.length);
}

const GAZETTEER = buildGazetteer();

/** ISO codes of the African countries mentioned in the text, most specific names first. */
export function tagCountries(text: string): string[] {
  let remaining = text.toLowerCase();
  const found = new Set<string>();
  for (const entry of GAZETTEER) {
    const match = entry.pattern.exec(remaining);
    if (!match) continue;
    found.add(entry.code);
    // Blank out what matched so shorter names inside it are not counted again.
    remaining = remaining.replace(new RegExp(entry.pattern.source, 'gu'), (m) => ' '.repeat(m.length));
  }
  return [...found].sort();
}
