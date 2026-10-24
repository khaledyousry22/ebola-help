/**
 * Keeps the dates of one source in src/data/sources.ts in step with the
 * figures, so the source shown under a figure is never dated earlier than
 * the figure itself.
 *
 * Only the two dates of the named source are touched. If the file does not
 * read exactly as expected, nothing is changed and the job reports it: a
 * half-edited source file is worse than an out-of-date one.
 */

export interface SourceDates {
  /** Date the publisher's page refers to (the CDC updates it with the figures). */
  published: string;
  /** Date we last opened the page. */
  checked: string;
}

function replaceOnce(block: string, field: keyof SourceDates, value: string, id: string): string {
  const pattern = new RegExp(`(\\n\\s*${field}:\\s*')\\d{4}-\\d{2}-\\d{2}('\\s*,)`, 'g');
  const matches = block.match(pattern) ?? [];
  if (matches.length !== 1) {
    throw new Error(`Expected one "${field}" date for the source ${id} in sources.ts, found ${matches.length}`);
  }
  return block.replace(pattern, `$1${value}$2`);
}

/** Returns the file's text with that source's dates replaced. */
export function updateSourceDates(text: string, id: string, dates: SourceDates): string {
  const start = text.indexOf(`\n  ${id}: {`);
  if (start === -1) throw new Error(`The source ${id} was not found in sources.ts`);
  const end = text.indexOf('\n  },', start);
  if (end === -1) throw new Error(`The entry for ${id} in sources.ts does not end as expected`);

  const block = text.slice(start, end);
  let updated = replaceOnce(block, 'published', dates.published, id);
  updated = replaceOnce(updated, 'checked', dates.checked, id);
  return text.slice(0, start) + updated + text.slice(end);
}
