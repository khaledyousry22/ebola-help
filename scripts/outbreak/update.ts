/**
 * Keeps the outbreak figures in src/data/outbreak.json current.
 *
 *   npm run outbreak                  read the CDC page, check it, update the files
 *   npm run outbreak -- --dry         read and report, change nothing
 *   npm run outbreak -- --page=FILE   read a saved copy of the page instead
 *   npm run outbreak -- --report=FILE also write the report to a file
 *
 * The job runs every few hours (.github/workflows/outbreak.yml). It writes
 * the new figures only when every check in lib/plan.ts passes; otherwise it
 * changes nothing, explains why, and ends with exit code 1 so that a person
 * is asked. Figures a few days old are better than wrong ones.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { SOURCES } from '../../src/data/sources';
import { fetchText } from '../news/lib/fetchers';
import { parseCdcSituation, type CdcReading } from './lib/cdc';
import { planUpdate, SOURCE_ID, type Plan } from './lib/plan';
import { updateSourceDates } from './lib/sources-file';

export const OUTBREAK_PATH = 'src/data/outbreak.json';
export const SOURCES_PATH = 'src/data/sources.ts';
const PAGE_URL = SOURCES[SOURCE_ID].versions.en.url;

function report(lines: string[], plan: Plan | undefined, reading: CdcReading | undefined): string {
  const parts = [...lines];
  if (reading) {
    parts.push('', `Read from [CDC: Ebola Outbreak: Current Situation](${PAGE_URL}), figures as of ${reading.asOf}.`);
  }
  if (plan && plan.changes.length > 0) {
    parts.push('', '### What changed', '', '| What | From | To |', '| --- | --- | --- |');
    parts.push(...plan.changes.map((c) => `| ${c.what} | ${c.from} | ${c.to} |`));
  }
  if (plan && plan.quotes.length > 0) {
    parts.push('', '### Read from the page', '', ...plan.quotes.map((q) => `- ${q}`));
  }
  if (plan && plan.problems.length > 0) {
    parts.push('', '### Needs a person', '', ...plan.problems.map((p) => `- ${p}`));
    parts.push('', 'Nothing was changed. Please check the page and update the figures on the editing page.');
  }
  if (plan && plan.notes.length > 0) {
    parts.push('', '### Worth a look', '', ...plan.notes.map((n) => `- ${n}`));
  }
  return parts.join('\n');
}

/** Tells the GitHub job what happened, so it can commit or open an issue. */
function tellGitHub(values: Record<string, string>): void {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  appendFileSync(file, Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const arg = (prefix: string) => args.find((a) => a.startsWith(prefix))?.slice(prefix.length);
  const pageFile = arg('--page=');
  const reportFile = arg('--report=');
  const today = new Date().toISOString().slice(0, 10);

  const finish = (text: string) => {
    console.log(text);
    if (reportFile) writeFileSync(reportFile, text + '\n');
    const summary = process.env.GITHUB_STEP_SUMMARY;
    if (summary) appendFileSync(summary, text + '\n');
  };

  let html: string;
  try {
    html = pageFile ? readFileSync(pageFile, 'utf8') : await fetchText(PAGE_URL, { timeoutMs: 30_000 });
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    finish(report(['## Outbreak figures: the page could not be read', '', `The CDC page did not answer: ${why}`, '', `Page: ${PAGE_URL}`], undefined, undefined));
    tellGitHub({ changed: 'false', problems: 'true', summary: 'Outbreak figures: the CDC page could not be read' });
    return 1;
  }

  let reading: CdcReading;
  try {
    reading = parseCdcSituation(html);
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    finish(report(['## Outbreak figures: the page could not be understood', '', why, '', 'The page has probably changed its wording. The reading script needs a small fix (scripts/outbreak/lib/cdc.ts).', '', `Page: ${PAGE_URL}`], undefined, undefined));
    tellGitHub({ changed: 'false', problems: 'true', summary: 'Outbreak figures: the CDC page could not be understood' });
    return 1;
  }

  const raw: unknown = JSON.parse(readFileSync(OUTBREAK_PATH, 'utf8'));
  const plan = planUpdate(raw, reading, today);

  if (plan.problems.length > 0) {
    finish(report(['## Outbreak figures need a check'], plan, reading));
    tellGitHub({ changed: 'false', problems: 'true', summary: plan.summary });
    return 1;
  }

  if (!plan.data) {
    finish(report(['## Outbreak figures: nothing new', '', 'The page says the same as the site.'], plan, reading));
    tellGitHub({ changed: 'false', problems: 'false', summary: plan.summary });
    return 0;
  }

  if (!dry) {
    writeFileSync(OUTBREAK_PATH, JSON.stringify(plan.data, null, 2) + '\n');
    // The source under a figure must not look older than the figure itself.
    writeFileSync(
      SOURCES_PATH,
      updateSourceDates(readFileSync(SOURCES_PATH, 'utf8'), SOURCE_ID, { published: reading.asOf, checked: today }),
    );
  }

  finish(report([dry ? '## Outbreak figures: ready to update (dry run)' : '## Outbreak figures updated'], plan, reading));
  tellGitHub({ changed: String(!dry), problems: 'false', summary: plan.summary });
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
