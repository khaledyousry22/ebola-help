/**
 * Reads and checks src/data/outbreak.json. The build fails if a figure has
 * no official source, if a date is malformed or if a source id is unknown.
 */
import { z } from 'astro/zod';
import raw from './outbreak.json' with { type: 'json' };
import { isSourceId, type SourceId } from './sources';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const sourceId = z.string().refine(isSourceId, 'Unknown source id (see src/data/sources.ts)');
const countryCode = z.string().regex(/^[A-Z]{2}$/, 'Use a two-letter ISO country code');

export const outbreakSchema = z.object({
  virus: z.enum(['ebola', 'sudan', 'bundibugyo']),
  declared: isoDate,
  lastReviewed: isoDate,
  headline: z.object({
    country: countryCode,
    confirmedCases: z.number().int().nonnegative(),
    confirmedDeaths: z.number().int().nonnegative(),
    asOf: isoDate,
    source: sourceId,
  }),
  moreInformation: sourceId,
  countries: z
    .array(
      z.object({
        iso: countryCode,
        /** outbreak: ongoing outbreak; cases: related cases confirmed; ended: declared over. */
        status: z.enum(['outbreak', 'cases', 'ended']),
        endedOn: isoDate.optional(),
        source: sourceId,
      }),
    )
    .min(1),
});

export type Outbreak = z.infer<typeof outbreakSchema> & {
  headline: { source: SourceId };
  moreInformation: SourceId;
  countries: { source: SourceId }[];
};

export function parseOutbreak(data: unknown): Outbreak {
  return outbreakSchema.parse(data) as Outbreak;
}

export const OUTBREAK: Outbreak = parseOutbreak(raw);
