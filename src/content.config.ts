import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { isSourceId } from './data/sources';

/**
 * Health information pages: src/content/health/<locale>/<slug>.md
 * Every language has the same set of slugs (checked by unit tests).
 */
const health = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/health' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    /** Position in the health section menu. */
    order: z.number().int(),
    keyPoints: z.array(z.string().min(1)).default([]),
    /** Ids from src/data/sources.ts. At least one source is required. */
    sources: z
      .array(z.string().refine(isSourceId, 'Unknown source id (see src/data/sources.ts)'))
      .min(1),
    /** Date the text was last checked against its sources (YYYY-MM-DD). */
    reviewed: z.coerce.date(),
  }),
});

export const collections = { health };
