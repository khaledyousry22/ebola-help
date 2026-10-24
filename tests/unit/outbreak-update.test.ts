/**
 * The job that keeps the outbreak figures current (scripts/outbreak/).
 *
 * These tests are the safety net around a figure published without a person
 * looking at it: the reading of the page, and every check that stops a bad
 * reading from reaching the site.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import raw from '../../src/data/outbreak.json' with { type: 'json' };
import { parseOutbreak } from '../../src/data/outbreak';
import { parseCdcSituation, readAsOfDates, type CdcReading } from '../../scripts/outbreak/lib/cdc';
import { planUpdate, SOURCE_ID } from '../../scripts/outbreak/lib/plan';
import { updateSourceDates } from '../../scripts/outbreak/lib/sources-file';

const page = readFileSync('tests/fixtures/cdc-situation.html', 'utf8');
const reading = parseCdcSituation(page);
const figuresFor = (data: CdcReading, iso: string) => data.countries.find((c) => c.iso === iso)!;

/** The published file, with figures a few days older than the page's. */
const published = () => {
  const data = JSON.parse(JSON.stringify(raw)) as typeof raw;
  data.headline = { ...data.headline, confirmedCases: 9637, confirmedDeaths: 4646, asOf: '2026-10-19', source: 'drcSitrep158' };
  return data;
};

const readingWith = (iso: string, changes: Partial<ReturnType<typeof figuresFor>>): CdcReading => ({
  ...reading,
  countries: reading.countries.map((c) => (c.iso === iso ? { ...c, ...changes } : c)),
});

describe('reading the CDC page', () => {
  it('reads the date the figures refer to', () => {
    expect(reading.asOf).toBe('2026-10-21');
  });

  it('reads each country, not the combined total', () => {
    expect(figuresFor(reading, 'CD')).toMatchObject({ confirmedCases: 9704, confirmedDeaths: 4687 });
    expect(figuresFor(reading, 'KE')).toMatchObject({ confirmedCases: 9, confirmedDeaths: 1 });
    expect(figuresFor(reading, 'NG')).toMatchObject({ confirmedCases: 1, confirmedDeaths: 0 });
    expect(figuresFor(reading, 'UG')).toMatchObject({ confirmedCases: 20, confirmedDeaths: 2 });
  });

  it('keeps the words each figure was read from', () => {
    expect(figuresFor(reading, 'CD').quote).toBe('Democratic Republic of the Congo: 9,704 confirmed cases, 4,687 confirmed deaths');
  });

  it('notices a country the site does not list', () => {
    expect(figuresFor(reading, 'FR')).toMatchObject({ confirmedCases: 1 });
  });

  it('never reads the DR Congo as the Republic of the Congo', () => {
    expect(reading.countries.some((c) => c.iso === 'CG')).toBe(false);
  });

  it('refuses a page that is not the one we expect', () => {
    expect(() => parseCdcSituation('<html><body><p>Service unavailable</p></body></html>')).toThrow(/confirmed cases/);
  });

  it('refuses a page with no date', () => {
    expect(() => parseCdcSituation('<p>Kenya</p><p>9 confirmed cases 1 confirmed death</p>')).toThrow(/which date/);
  });

  it('reads dates written in several ways, oldest first', () => {
    expect(readAsOfDates('as of Oct. 21, 2026 ... as of September 3, 2026')).toEqual(['2026-09-03', '2026-10-21']);
    expect(readAsOfDates('as of Feb. 31, 2026')).toEqual([]);
  });
});

describe('deciding what to publish', () => {
  it('updates the figures, their date and their source', () => {
    const plan = planUpdate(published(), reading, '2026-10-24');
    expect(plan.problems).toEqual([]);
    const updated = parseOutbreak(plan.data);
    expect(updated.headline).toMatchObject({ confirmedCases: 9704, confirmedDeaths: 4687, asOf: '2026-10-21', source: SOURCE_ID });
    expect(updated.countries.find((c) => c.iso === 'KE')!.figures).toMatchObject({ confirmedCases: 9, confirmedDeaths: 1, asOf: '2026-10-21' });
    expect(plan.summary).toContain('9,704 cases');
  });

  it('changes nothing when the page says the same as the site', () => {
    const plan = planUpdate(planUpdate(published(), reading, '2026-10-24').data, reading, '2026-10-24');
    expect(plan.data).toBeUndefined();
    expect(plan.changes).toEqual([]);
  });

  it('refuses figures lower than the ones already published', () => {
    const plan = planUpdate(published(), readingWith('CD', { confirmedCases: 9000 }), '2026-10-24');
    expect(plan.data).toBeUndefined();
    expect(plan.problems.join(' ')).toMatch(/fewer than the 9,637 already published/);
  });

  it('refuses more deaths than cases', () => {
    const plan = planUpdate(published(), readingWith('KE', { confirmedDeaths: 50 }), '2026-10-24');
    expect(plan.data).toBeUndefined();
    expect(plan.problems.join(' ')).toMatch(/deaths but only/);
  });

  it('refuses a jump too large to be one update', () => {
    const plan = planUpdate(published(), readingWith('CD', { confirmedCases: 99_000 }), '2026-10-24');
    expect(plan.data).toBeUndefined();
    expect(plan.problems.join(' ')).toMatch(/jump from 9,637 to 99,000/);
  });

  it('refuses figures dated in the future', () => {
    const plan = planUpdate(published(), { ...reading, asOf: '2026-12-01' }, '2026-10-24');
    expect(plan.data).toBeUndefined();
    expect(plan.problems.join(' ')).toMatch(/in the future/);
  });

  it('refuses to publish when a country could not be read', () => {
    const plan = planUpdate(published(), { ...reading, countries: reading.countries.filter((c) => c.iso !== 'KE') }, '2026-10-24');
    expect(plan.data).toBeUndefined();
    expect(plan.problems.join(' ')).toMatch(/Kenya: no figures could be read/);
  });

  it('leaves older figures alone and says so', () => {
    const plan = planUpdate(published(), { ...reading, asOf: '2026-10-01' }, '2026-10-24');
    expect(plan.data).toBeUndefined();
    expect(plan.notes.join(' ')).toMatch(/older than the published ones/);
  });

  it('does not change a country whose outbreak is over, but reports it', () => {
    const plan = planUpdate(published(), readingWith('UG', { confirmedCases: 25, quote: 'Uganda: 25 confirmed cases, 2 confirmed deaths' }), '2026-10-24');
    const updated = parseOutbreak(plan.data);
    expect(updated.countries.find((c) => c.iso === 'UG')!.figures!.confirmedCases).toBe(20);
    expect(plan.notes.join(' ')).toMatch(/marked as over/);
  });

  it('reports a country on the page that the site does not show', () => {
    const plan = planUpdate(published(), reading, '2026-10-24');
    expect(plan.notes.join(' ')).toMatch(/France is listed on the page/);
  });
});

describe('the dates of the source', () => {
  const sources = readFileSync('src/data/sources.ts', 'utf8');

  it('updates only the dates of the source used', () => {
    const updated = updateSourceDates(sources, SOURCE_ID, { published: '2026-10-21', checked: '2026-10-24' });
    const block = updated.slice(updated.indexOf(`\n  ${SOURCE_ID}: {`), updated.indexOf('\n  },', updated.indexOf(`\n  ${SOURCE_ID}: {`)));
    expect(block).toContain("published: '2026-10-21'");
    expect(block).toContain("checked: '2026-10-24'");
    // Every other source keeps its own dates.
    expect(updated.replace(block, '')).toBe(sources.replace(sources.slice(sources.indexOf(`\n  ${SOURCE_ID}: {`), sources.indexOf('\n  },', sources.indexOf(`\n  ${SOURCE_ID}: {`))), ''));
  });

  it('changes nothing it does not recognise', () => {
    expect(() => updateSourceDates(sources, 'someBlog', { published: '2026-10-21', checked: '2026-10-24' })).toThrow(/not found/);
  });
});
