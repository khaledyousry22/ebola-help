import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { isSourceId } from './data/sources';

/**
 * Corrections that change the meaning of a page (a figure, a date, advice),
 * listed with their date at the end of the page, as the editorial policy
 * promises. Typos and broken links are fixed without a note.
 */
const corrections = z.array(z.object({ date: z.coerce.date(), note: z.string().min(1) })).default([]);

/** Front matter of a health page (and of a health page draft). */
const healthSchema = z.object({
  title: z.string().min(1),
  /** Title for search engines and browser tabs, when the page title alone does not say "Ebola". */
  metaTitle: z.string().min(1).optional(),
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
  corrections,
});

/**
 * Health information pages: src/content/health/<locale>/<slug>.md
 * Every language has the same set of slugs (checked by unit tests).
 */
const health = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/health' }),
  schema: healthSchema,
});

/**
 * Drafts of health pages waiting for the owner's approval:
 * src/content/drafts/health/<locale>/<slug>.md. They are never on the live
 * site. A preview build (SHOW_DRAFTS=1, see src/lib/health.ts) shows them in
 * place of the live pages. To publish one, move it to src/content/health/.
 */
const healthDrafts = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/drafts/health' }),
  schema: healthSchema,
});

/**
 * Site policy pages (editorial policy, privacy policy, contact):
 * src/content/info/<locale>/<slug>.md, the same slugs in every language.
 */
const info = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/info' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    /** Date the page was last changed (YYYY-MM-DD), shown at the top. */
    updated: z.coerce.date(),
  }),
});

/**
 * Situation updates (twice a week): src/content/updates/<locale>/<YYYY-MM-DD>.md,
 * the same dates in every language, each citing the same sources.
 */
const updates = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/updates' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    /** Publication date. */
    date: z.coerce.date(),
    /** Date the figures in the update refer to. */
    figuresAsOf: z.coerce.date(),
    /** The "In short" points, also shown on the home page. */
    keyPoints: z.array(z.string().min(1)).min(1),
    sources: z
      .array(z.string().refine(isSourceId, 'Unknown source id (see src/data/sources.ts)'))
      .min(1),
    corrections,
  }),
});

export const collections = { health, healthDrafts, info, updates };
