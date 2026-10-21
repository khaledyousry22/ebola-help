import { describe, expect, it } from 'vitest';
import raw from '../../src/data/outbreak.json' with { type: 'json' };
import { OUTBREAK, parseOutbreak } from '../../src/data/outbreak';

const clone = () => JSON.parse(JSON.stringify(raw));

describe('outbreak data', () => {
  it('the current file is valid', () => {
    expect(OUTBREAK.headline.confirmedCases).toBeGreaterThan(0);
    expect(OUTBREAK.headline.confirmedDeaths).toBeLessThanOrEqual(OUTBREAK.headline.confirmedCases);
  });

  it('rejects figures without a source', () => {
    const data = clone();
    delete data.headline.source;
    expect(() => parseOutbreak(data)).toThrow();
  });

  it('rejects an unknown source', () => {
    const data = clone();
    data.headline.source = 'someBlog';
    expect(() => parseOutbreak(data)).toThrow(/Unknown source/);
  });

  it('rejects malformed dates and country codes', () => {
    const badDate = clone();
    badDate.headline.asOf = '19/10/2026';
    expect(() => parseOutbreak(badDate)).toThrow();
    const badCountry = clone();
    badCountry.countries[0].iso = 'Congo';
    expect(() => parseOutbreak(badCountry)).toThrow();
  });
});
