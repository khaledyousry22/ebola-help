/**
 * Decides what, if anything, to change in src/data/outbreak.json after
 * reading the CDC page.
 *
 * This is where the site is protected from a bad reading. A figure is
 * published only if it passes every check below; otherwise nothing is
 * written and the job reports the problem for a person to look at. Old
 * figures are better than wrong ones.
 */
import { countryName } from '../../../src/i18n/countries';
import { parseOutbreak, type Outbreak } from '../../../src/data/outbreak';
import type { CdcReading, CountryReading } from './cdc';

/** The source id the figures are credited to (src/data/sources.ts). */
export const SOURCE_ID = 'cdcSituation';

/**
 * A jump larger than this in one update is treated as a misreading rather
 * than news: the job stops and asks for a person instead of publishing it.
 */
const MAX_JUMP_SHARE = 0.25;
const MAX_JUMP_IGNORED_BELOW = 50;

export interface Change {
  what: string;
  from: string;
  to: string;
}

export interface Plan {
  /** The file as it should be written, or undefined when nothing changes. */
  data?: unknown;
  changes: Change[];
  /** Reasons not to publish. Any problem means nothing is written. */
  problems: string[];
  /** Things a person should look at, which do not stop an update. */
  notes: string[];
  /** The sentences the figures were read from. */
  quotes: string[];
  /** One line for the commit message. */
  summary: string;
}

const name = (iso: string) => countryName('en', iso);
const number = (value: number) => value.toLocaleString('en-GB');

function jumpTooBig(from: number, to: number): boolean {
  const jump = to - from;
  return jump > MAX_JUMP_IGNORED_BELOW && jump > from * MAX_JUMP_SHARE;
}

/** Checks one country's figures against what is published today. */
function checkFigures(
  iso: string,
  published: { confirmedCases: number; confirmedDeaths: number },
  reading: CountryReading,
  problems: string[],
): boolean {
  const where = name(iso);
  let fine = true;
  if (reading.confirmedDeaths > reading.confirmedCases) {
    problems.push(`${where}: the page reads ${number(reading.confirmedDeaths)} deaths but only ${number(reading.confirmedCases)} cases.`);
    fine = false;
  }
  // Cumulative totals only ever rise, so a lower number means a misreading.
  if (reading.confirmedCases < published.confirmedCases) {
    problems.push(`${where}: the page reads ${number(reading.confirmedCases)} cases, fewer than the ${number(published.confirmedCases)} already published.`);
    fine = false;
  }
  if (reading.confirmedDeaths < published.confirmedDeaths) {
    problems.push(`${where}: the page reads ${number(reading.confirmedDeaths)} deaths, fewer than the ${number(published.confirmedDeaths)} already published.`);
    fine = false;
  }
  if (jumpTooBig(published.confirmedCases, reading.confirmedCases)) {
    problems.push(`${where}: cases jump from ${number(published.confirmedCases)} to ${number(reading.confirmedCases)} in one update; please check the page.`);
    fine = false;
  }
  if (jumpTooBig(published.confirmedDeaths, reading.confirmedDeaths)) {
    problems.push(`${where}: deaths jump from ${number(published.confirmedDeaths)} to ${number(reading.confirmedDeaths)} in one update; please check the page.`);
    fine = false;
  }
  return fine;
}

interface RawFigures {
  confirmedCases: number;
  confirmedDeaths: number;
  asOf: string;
  source: string;
}

/** Writes new figures into one part of the file and records what changed. */
function applyFigures(target: RawFigures, reading: CountryReading, asOf: string, where: string, changes: Change[]): void {
  if (target.confirmedCases !== reading.confirmedCases) {
    changes.push({ what: `${where} cases`, from: number(target.confirmedCases), to: number(reading.confirmedCases) });
    target.confirmedCases = reading.confirmedCases;
  }
  if (target.confirmedDeaths !== reading.confirmedDeaths) {
    changes.push({ what: `${where} deaths`, from: number(target.confirmedDeaths), to: number(reading.confirmedDeaths) });
    target.confirmedDeaths = reading.confirmedDeaths;
  }
  if (target.asOf !== asOf) {
    changes.push({ what: `${where} figures dated`, from: target.asOf, to: asOf });
    target.asOf = asOf;
  }
  if (target.source !== SOURCE_ID) {
    changes.push({ what: `${where} source`, from: target.source, to: SOURCE_ID });
    target.source = SOURCE_ID;
  }
}

interface RawOutbreak {
  headline: RawFigures & { country: string };
  countries: { iso: string; status: string; figures?: RawFigures }[];
}

/**
 * `today` is the date the job runs, used to refuse figures dated in the
 * future (a sign the page or our reading is wrong).
 */
export function planUpdate(raw: unknown, reading: CdcReading, today: string): Plan {
  const current: Outbreak = parseOutbreak(raw);
  const data = JSON.parse(JSON.stringify(raw)) as RawOutbreak;
  const changes: Change[] = [];
  const problems: string[] = [];
  const notes: string[] = [...reading.notes];
  const quotes: string[] = [];

  if (reading.asOf > today) {
    problems.push(`The page's figures are dated ${reading.asOf}, which is in the future.`);
    return { changes, problems, notes, quotes, summary: 'Outbreak figures: dated in the future' };
  }

  const readingFor = (iso: string) => reading.countries.find((c) => c.iso === iso);

  // Countries listed on the page that the site does not show. Adding one
  // also means choosing its status on the map, so a person does that.
  for (const country of reading.countries) {
    if (!current.countries.some((c) => c.iso === country.iso)) {
      notes.push(`${name(country.iso)} is listed on the page (${country.quote}) but not on the site.`);
    }
  }

  for (const country of current.countries) {
    const where = name(country.iso);
    const published =
      country.iso === current.headline.country && !country.figures ? current.headline : country.figures;
    if (!published) continue; // No figures published for this country, so nothing to keep current.

    // An outbreak declared over does not get new figures; its numbers are history.
    if (country.status === 'ended') {
      const found = readingFor(country.iso);
      if (found && (found.confirmedCases !== published.confirmedCases || found.confirmedDeaths !== published.confirmedDeaths)) {
        notes.push(`${where}'s outbreak is marked as over, but the page now reads ${found.quote}. Left unchanged.`);
      }
      continue;
    }

    const found = readingFor(country.iso);
    if (!found) {
      problems.push(`${where}: no figures could be read from the page.`);
      continue;
    }
    if (reading.asOf < published.asOf) {
      notes.push(`${where}: the page's figures (${reading.asOf}) are older than the published ones (${published.asOf}). Left unchanged.`);
      continue;
    }
    if (!checkFigures(country.iso, published, found, problems)) continue;

    quotes.push(found.quote);
    const target =
      country.iso === current.headline.country && !country.figures
        ? data.headline
        : data.countries.find((c) => c.iso === country.iso)!.figures!;
    applyFigures(target, found, reading.asOf, where, changes);
  }

  if (problems.length > 0 || changes.length === 0) {
    return { changes, problems, notes, quotes, summary: problems.length > 0 ? 'Outbreak figures need a check' : 'Outbreak figures: nothing new' };
  }

  // Never write a file the site would refuse to build.
  try {
    parseOutbreak(data);
  } catch (error) {
    problems.push(`The updated file would be invalid: ${error instanceof Error ? error.message : String(error)}`);
    return { changes, problems, notes, quotes, summary: 'Outbreak figures need a check' };
  }

  const headline = data.headline;
  const summary = `Outbreak figures: ${name(headline.country)} ${number(headline.confirmedCases)} cases, ${number(headline.confirmedDeaths)} deaths (CDC, ${reading.asOf})`;
  return { data, changes, problems, notes, quotes, summary };
}
