/**
 * Format of src/data/news/items.json, shared by the news job (which writes
 * it) and the website build (which reads it). Anything that does not match
 * is rejected.
 */
import { z } from 'astro/zod';
import { LOCALE_CODES } from '../i18n/locales';

const isoDateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');

export const newsItemSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{16}$/),
  url: z.string().regex(/^https?:\/\//, 'Only http(s) links'),
  title: z.string().min(1).max(400),
  /** Short extract from the feed. Never the full article. */
  excerpt: z.string().max(220).optional(),
  lang: z.enum(LOCALE_CODES),
  sourceId: z.string().min(1),
  sourceName: z.string().min(1),
  official: z.boolean(),
  publishedAt: isoDateTime,
  firstSeenAt: isoDateTime,
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)),
  alsoReportedBy: z.array(z.string()).default([]),
});

export const newsFileSchema = z.object({
  /** When the list last changed. */
  updatedAt: isoDateTime,
  items: z.array(newsItemSchema),
});

export const newsOverridesSchema = z.object({
  /** Item ids or links that must not be shown. */
  hidden: z.array(z.string()).default([]),
  /** Item ids or links shown at the top of their section. */
  pinned: z.array(z.string()).default([]),
});

export type NewsItem = z.infer<typeof newsItemSchema>;
export type NewsFile = z.infer<typeof newsFileSchema>;
export type NewsOverrides = z.infer<typeof newsOverridesSchema>;
