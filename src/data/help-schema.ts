/**
 * Format of the contact files in src/data/help/<ISO>.json.
 *
 * Every entry records where it was found (official page, exact text) and
 * its status. Only "verified" entries, confirmed by the site owner on a
 * given date, are ever shown on the website.
 */
import { z } from 'astro/zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const httpsUrl = z.string().regex(/^https:\/\/\S+$/, 'Use a full https:// link');

const common = {
  id: z.string().regex(/^[a-z0-9-]+$/, 'Lower-case letters, digits and dashes only'),
  organisation: z.string().min(1),
  /** Official page where the detail was found. */
  sourceUrl: httpsUrl,
  sourceTitle: z.string().min(1),
  /** The exact text on that page, so it can be found with Ctrl+F. */
  sourceQuote: z.string().min(1),
  foundOn: isoDate,
  /** Message for the site owner, shown in VERIFY_ME.md only. */
  ownerNote: z.string().optional(),
  /** pending: waiting for the owner's check. verified: confirmed. rejected: wrong, never shown. */
  status: z.enum(['pending', 'verified', 'rejected']),
  /** Date the owner confirmed the detail against the official source. */
  verifiedAt: isoDate.nullable(),
};

export const phoneEntrySchema = z.object({
  ...common,
  kind: z.literal('phone'),
  purpose: z.enum(['ebola-hotline', 'health-hotline', 'report-symptoms', 'emergency', 'information']),
  channel: z.enum(['call', 'sms', 'whatsapp', 'ussd']),
  /** What is dialled: digits, optionally starting with + (or * and # for USSD codes). */
  number: z.string().regex(/^[+*]?[0-9]+#?$/, 'Digits only, e.g. +243815554952 or *719#'),
  /** How the number is written for people, e.g. "0800-100-066". */
  display: z.string().optional(),
  free: z.boolean().optional(),
});

export const officeEntrySchema = z.object({
  ...common,
  kind: z.literal('office'),
  role: z.enum(['ministry', 'institute', 'who']),
  address: z.string().optional(),
  phones: z.array(z.string().regex(/^\+[0-9 ]+$/, 'International format, e.g. +256 414 335500')).optional(),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).optional(),
  website: httpsUrl.optional(),
});

export const facilityEntrySchema = z.object({
  ...common,
  kind: z.literal('facility'),
  name: z.string().min(1),
  facilityType: z.enum(['treatment-centre', 'isolation', 'transit']),
  place: z.string().min(1),
  province: z.string().optional(),
  /** Only from an official source. Never estimated. */
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const helpEntrySchema = z
  .discriminatedUnion('kind', [phoneEntrySchema, officeEntrySchema, facilityEntrySchema])
  .superRefine((entry, ctx) => {
    if (entry.status === 'verified' && !entry.verifiedAt) {
      ctx.addIssue({ code: 'custom', message: `${entry.id}: a verified entry needs a verifiedAt date` });
    }
    if (entry.status !== 'verified' && entry.verifiedAt) {
      ctx.addIssue({ code: 'custom', message: `${entry.id}: verifiedAt is only for verified entries` });
    }
    if (entry.kind === 'facility' && (entry.lat === undefined) !== (entry.lng === undefined)) {
      ctx.addIssue({ code: 'custom', message: `${entry.id}: give both lat and lng, or neither` });
    }
  });

export const helpFileSchema = z
  .object({
    country: z.string().regex(/^[A-Z]{2}$/),
    entries: z.array(helpEntrySchema),
    /** Explains why no facilities are listed, if that is the case. Shown in VERIFY_ME.md. */
    facilityNote: z.string().optional(),
  })
  .superRefine((file, ctx) => {
    const ids = file.entries.map((e) => e.id);
    const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
    if (duplicate) ctx.addIssue({ code: 'custom', message: `Duplicate id ${duplicate}` });
  });

export type HelpEntry = z.infer<typeof helpEntrySchema>;
export type PhoneEntry = z.infer<typeof phoneEntrySchema>;
export type OfficeEntry = z.infer<typeof officeEntrySchema>;
export type FacilityEntry = z.infer<typeof facilityEntrySchema>;
export type HelpFile = z.infer<typeof helpFileSchema>;

export function parseHelpFile(data: unknown, fileName: string): HelpFile {
  const file = helpFileSchema.parse(data);
  if (`${file.country}.json` !== fileName) {
    throw new Error(`${fileName} says country ${file.country}; the file name must match`);
  }
  return file;
}

/** The only entries the website may show. */
export function verifiedOnly<T extends HelpEntry>(entries: T[]): T[] {
  return entries.filter((e) => e.status === 'verified' && e.verifiedAt !== null);
}
