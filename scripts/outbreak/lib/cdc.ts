/**
 * Reads the outbreak figures from the US CDC page "Ebola Outbreak: Current
 * Situation" (the `cdcSituation` source in src/data/sources.ts).
 *
 * That page writes each country's totals as ordinary sentences under the
 * country's name, for example "9,704 confirmed cases" and "4,687 confirmed
 * deaths" under "Democratic Republic of the Congo", and gives one date for
 * all of them ("Total Cases (as of Oct. 21, 2026)").
 *
 * Nothing here guesses. A country is reported only when both of its numbers
 * are found next to its name, and the sentence they were read from is kept
 * so a person can check the figure against the page. Anything else is left
 * out, and the caller decides what to do about it.
 */
import { toPlainText } from '../../news/lib/text';

export interface CountryReading {
  iso: string;
  /** The country's name as the page writes it. */
  name: string;
  confirmedCases: number;
  confirmedDeaths: number;
  /** The words the numbers were read from, for a person to check. */
  quote: string;
}

export interface CdcReading {
  /** Date the figures refer to, as the page states it (YYYY-MM-DD). */
  asOf: string;
  countries: CountryReading[];
  /** Countries named on the page whose two numbers could not both be read. */
  unreadable: string[];
  /** Anything odd that a person should look at. */
  notes: string[];
}

/**
 * Countries the page may list, as it writes their names. A country missing
 * from this list is simply not noticed; the four the site shows are what
 * matters, and a person reads the report either way.
 */
export const CDC_COUNTRY_NAMES: Record<string, readonly string[]> = {
  CD: ['Democratic Republic of the Congo', 'Democratic Republic of Congo', 'DR Congo'],
  UG: ['Uganda'],
  KE: ['Kenya'],
  NG: ['Nigeria'],
  RW: ['Rwanda'],
  BI: ['Burundi'],
  TZ: ['United Republic of Tanzania', 'Tanzania'],
  SS: ['South Sudan'],
  SD: ['Sudan'],
  CF: ['Central African Republic'],
  CG: ['Republic of the Congo', 'Congo-Brazzaville'],
  ZM: ['Zambia'],
  AO: ['Angola'],
  ET: ['Ethiopia'],
  ZA: ['South Africa'],
  GH: ['Ghana'],
  CI: ['Côte d’Ivoire', "Côte d'Ivoire", 'Ivory Coast'],
  SN: ['Senegal'],
  FR: ['France'],
  GB: ['United Kingdom'],
  US: ['United States'],
  BE: ['Belgium'],
  DE: ['Germany'],
  NL: ['Netherlands'],
  ES: ['Spain'],
  IT: ['Italy'],
  CA: ['Canada'],
  AE: ['United Arab Emirates'],
  IN: ['India'],
  CN: ['China'],
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

/** How much text after a country's name is searched for its figures. */
const WINDOW = 600;
/**
 * How far after the name both figures must stand. A country's own numbers
 * follow its heading closely; a number further away probably belongs to
 * something else, so it is not used.
 */
const MAX_DISTANCE = 240;
const MAX_PLAUSIBLE = 10_000_000;

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "Oct. 21, 2026" → "2026-10-21". Undefined when the date makes no sense. */
export function parseCdcDate(month: string, day: string, year: string): string | undefined {
  const monthNumber = MONTHS[month.toLowerCase().replace(/\.$/, '')];
  const dayNumber = Number(day);
  const yearNumber = Number(year);
  if (!monthNumber || dayNumber < 1 || dayNumber > 31 || yearNumber < 2000 || yearNumber > 2100) return undefined;
  const iso = `${yearNumber}-${String(monthNumber).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
  // Reject a day that does not exist in that month (for example 31 February).
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso ? iso : undefined;
}

/** Every "as of <date>" on the page, oldest first. */
export function readAsOfDates(text: string): string[] {
  const dates = new Set<string>();
  for (const match of text.matchAll(/as of\s+([A-Za-z]{3,9}\.?)\s+(\d{1,2}),?\s*(\d{4})/gi)) {
    const iso = parseCdcDate(match[1]!, match[2]!, match[3]!);
    if (iso) dates.add(iso);
  }
  return [...dates].sort();
}

interface NameMatch {
  iso: string;
  name: string;
  start: number;
  end: number;
}

/**
 * Where each country is named. Longer names are matched first, so
 * "Democratic Republic of the Congo" is never also read as "Republic of the
 * Congo".
 */
export function findCountryNames(text: string): NameMatch[] {
  const candidates = Object.entries(CDC_COUNTRY_NAMES)
    .flatMap(([iso, names]) => names.map((name) => ({ iso, name })))
    .sort((a, b) => b.name.length - a.name.length);

  const found: NameMatch[] = [];
  for (const { iso, name } of candidates) {
    const pattern = new RegExp(`(?<![\\p{L}])${escape(name)}(?![\\p{L}])`, 'giu');
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      // Skip a name that sits inside a longer country name already found.
      if (found.some((other) => start < other.end && end > other.start)) continue;
      found.push({ iso, name, start, end });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

function readNumber(value: string): number | undefined {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_PLAUSIBLE ? parsed : undefined;
}

/**
 * Figures standing just after a country's name. "N confirmed cases" and
 * "N confirmed deaths" must both appear, with the number next to the words,
 * so the page's combined line ("9,735 total confirmed cases") is not read as
 * a country's own figure.
 */
function readFigures(section: string): { cases: number; deaths: number; quote: string; distance: number } | undefined {
  const cases = /([\d,]+)\s+confirmed\s+cases?/i.exec(section);
  const deaths = /([\d,]+)\s+confirmed\s+deaths?/i.exec(section);
  if (!cases || !deaths) return undefined;
  const caseCount = readNumber(cases[1]!);
  const deathCount = readNumber(deaths[1]!);
  if (caseCount === undefined || deathCount === undefined) return undefined;
  const distance = Math.max(cases.index + cases[0].length, deaths.index + deaths[0].length);
  if (distance > MAX_DISTANCE) return undefined;
  return { cases: caseCount, deaths: deathCount, quote: `${cases[0]}, ${deaths[0]}`, distance };
}

/** Reads the whole page. Throws only when the page is not the one we expect. */
export function parseCdcSituation(html: string): CdcReading {
  const text = toPlainText(html);
  if (!/confirmed cases?/i.test(text)) {
    throw new Error(`The CDC page does not mention confirmed cases (received "${text.slice(0, 80)}…")`);
  }

  const dates = readAsOfDates(text);
  if (dates.length === 0) throw new Error('The CDC page does not say which date its figures refer to');

  const notes: string[] = [];
  // Several dates can appear (cases and deaths are stated separately). The
  // oldest is used, so the site never claims figures are fresher than they are.
  if (dates.length > 1) notes.push(`The page gives more than one date (${dates.join(', ')}); the oldest is used.`);

  const names = findCountryNames(text);
  const countries: CountryReading[] = [];
  const unreadable = new Set<string>();

  for (const iso of new Set(names.map((n) => n.iso))) {
    // A country can be named several times (in the opening sentences and
    // again as a heading above its figures). The reading taken is the one
    // whose figures stand closest to the name.
    let best: CountryReading & { distance: number } | undefined;
    for (const [index, name] of names.entries()) {
      if (name.iso !== iso) continue;
      const next = names.slice(index + 1).find((other) => other.iso !== iso);
      const section = text.slice(name.end, Math.min(next ? next.start : text.length, name.end + WINDOW));
      const figures = readFigures(section);
      if (!figures || (best && best.distance <= figures.distance)) continue;
      best = {
        iso,
        name: name.name,
        confirmedCases: figures.cases,
        confirmedDeaths: figures.deaths,
        quote: `${name.name}: ${figures.quote}`,
        distance: figures.distance,
      };
    }
    if (best) {
      const { distance: _distance, ...reading } = best;
      countries.push(reading);
    } else {
      unreadable.add(iso);
    }
  }
  countries.sort((a, b) => b.confirmedCases - a.confirmedCases || a.iso.localeCompare(b.iso));

  return { asOf: dates[0]!, countries, unreadable: [...unreadable].sort(), notes };
}
