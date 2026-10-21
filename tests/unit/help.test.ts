import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { countrySituations, OUTBREAK } from '../../src/data/outbreak';
import { helpEntrySchema, parseHelpFile, verifiedOnly, type HelpEntry } from '../../src/data/help-schema';
import { phoneHref } from '../../src/data/help';
import { loadHelpFiles, renderVerifyMe, VERIFY_ME_PATH } from '../../scripts/verify-me';

const files = loadHelpFiles();
const entries = files.flatMap((f) => f.entries);

/** Websites of the health authorities and WHO offices we accept as official. */
const OFFICIAL_HOSTS = [
  'insp.cd', 'sante.gouv.cd', 'health.go.ug', 'afro.who.int', 'who.int', 'ncdc.gov.ng',
  'rbc.gov.rw', 'moh.gov.rw', 'health.go.ke', 'kenyanews.go.ke',
];
const isOfficial = (url: string) => {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
};

const pendingPhone = {
  id: 'xx-test',
  kind: 'phone',
  purpose: 'health-hotline',
  channel: 'call',
  number: '+243815554952',
  organisation: 'Test',
  sourceUrl: 'https://example.org/',
  sourceTitle: 'Test',
  sourceQuote: 'Test',
  foundOn: '2026-10-21',
  status: 'pending',
  verifiedAt: null,
} as const;

describe('contact files', () => {
  it('are all valid and named after their country', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('give every entry a source link, the exact text found and the date', () => {
    for (const e of entries) {
      expect(e.sourceUrl, e.id).toMatch(/^https:\/\//);
      expect(e.sourceQuote.length, e.id).toBeGreaterThan(2);
      expect(e.foundOn, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('flag every entry that does not come from an official website', () => {
    for (const e of entries) {
      if (!isOfficial(e.sourceUrl)) expect(e.ownerNote, `${e.id} needs an ownerNote`).toBeTruthy();
    }
  });

  it('have nothing verified yet without the owner (no entry is verified without a date)', () => {
    for (const e of entries) {
      if (e.status === 'verified') expect(e.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('contact rules', () => {
  it('reject a verified entry without a verification date', () => {
    expect(() => helpEntrySchema.parse({ ...pendingPhone, status: 'verified' })).toThrow(/verifiedAt/);
  });

  it('reject a verification date on an unverified entry', () => {
    expect(() => helpEntrySchema.parse({ ...pendingPhone, verifiedAt: '2026-10-22' })).toThrow(/verifiedAt/);
  });

  it('reject numbers with letters and non-https sources', () => {
    expect(() => helpEntrySchema.parse({ ...pendingPhone, number: '0800-CALL' })).toThrow();
    expect(() => helpEntrySchema.parse({ ...pendingPhone, sourceUrl: 'http://example.org/' })).toThrow();
  });

  it('reject facilities with only half a location', () => {
    expect(() =>
      helpEntrySchema.parse({
        ...pendingPhone,
        kind: 'facility',
        name: 'Centre',
        facilityType: 'treatment-centre',
        place: 'Town',
        lat: 1.5,
      }),
    ).toThrow(/lat and lng/);
  });

  it('reject a file whose name does not match its country', () => {
    expect(() => parseHelpFile({ country: 'CD', entries: [] }, 'UG.json')).toThrow(/must match/);
  });

  it('only let verified entries through to the website', () => {
    const verified = { ...pendingPhone, id: 'xx-ok', status: 'verified', verifiedAt: '2026-10-22' } as const;
    const rejected = { ...pendingPhone, id: 'xx-no', status: 'rejected' } as const;
    expect(verifiedOnly([pendingPhone, verified, rejected] as HelpEntry[]).map((e) => e.id)).toEqual(['xx-ok']);
  });

  it('build tap-to-call, SMS and WhatsApp links', () => {
    const p = helpEntrySchema.parse(pendingPhone);
    if (p.kind !== 'phone') throw new Error('expected a phone entry');
    expect(phoneHref(p)).toBe('tel:+243815554952');
    expect(phoneHref({ ...p, channel: 'sms' })).toBe('sms:+243815554952');
    expect(phoneHref({ ...p, channel: 'whatsapp' })).toBe('https://wa.me/243815554952');
    expect(phoneHref({ ...p, channel: 'ussd', number: '*719#' })).toBe('tel:*719%23');
  });
});

describe('VERIFY_ME.md', () => {
  it('is up to date with the contact files (run npm run verify-me)', () => {
    expect(readFileSync(VERIFY_ME_PATH, 'utf8')).toBe(renderVerifyMe(files));
  });

  it('lists every pending entry', () => {
    const text = readFileSync(VERIFY_ME_PATH, 'utf8');
    for (const e of entries.filter((x) => x.status === 'pending')) expect(text).toContain(`\`${e.id}\``);
  });
});

describe('country situations', () => {
  it('maps outbreak data to map statuses, with figures for each country', () => {
    const situations = countrySituations();
    const cd = situations.find((s) => s.iso === OUTBREAK.headline.country)!;
    expect(cd.status).toBe('active');
    expect(cd.figures?.confirmedCases).toBe(OUTBREAK.headline.confirmedCases);
    expect(situations.find((s) => s.iso === 'UG')?.status).toBe('recent');
    expect(situations.find((s) => s.iso === 'KE')?.status).toBe('monitoring');
  });
});
