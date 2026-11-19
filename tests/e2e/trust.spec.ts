/**
 * Who runs the site, how to report errors, support links, share buttons and
 * source links: what readers, AdSense reviewers and funders look for.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { CONTACT_EMAIL, EDITOR, PATREON_URL } from '../../src/config';
import { getMessages, LOCALE_CODES } from '../../src/i18n';

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

for (const locale of LOCALE_CODES) {
  const m = getMessages(locale);

  test(`${locale}: the About page names the editor`, async ({ page }) => {
    await page.goto(`/${locale}/about/`);
    await expect(page.locator('[data-editor]')).toContainText(EDITOR.name);
  });

  test(`${locale}: a situation update ends with share buttons, an error report link and a support note`, async ({ page }) => {
    await page.goto(`/${locale}/updates/`);
    await page.locator('main a[href*="/updates/20"]').first().click();
    for (const network of ['WhatsApp', 'Facebook']) {
      await expect(page.locator(`[data-share-link="${network}"]`)).toBeVisible();
    }
    const report = page.locator('[data-report-error]');
    await expect(report).toHaveText(m.corrections.report);
    const href = decodeURIComponent((await report.getAttribute('href')) ?? '');
    expect(href).toContain(`mailto:${CONTACT_EMAIL}?subject=`);
    expect(href).toContain(new URL(page.url()).pathname);
    await expect(page.locator(`[data-update-support] a[href="${PATREON_URL}"]`)).toBeVisible();
  });

  test(`${locale}: a health page has share buttons and an error report link`, async ({ page }) => {
    await page.goto(`/${locale}/health/symptoms/`);
    for (const network of ['WhatsApp', 'Facebook']) {
      await expect(page.locator(`[data-share-link="${network}"]`)).toBeVisible();
    }
    await expect(page.locator('[data-report-error]')).toHaveText(m.corrections.report);
  });
}

test('the language picker and the "page not found" page have the support link in their footer', async ({ page }) => {
  for (const path of ['/', '/no-such-page/']) {
    await page.goto(path);
    await expect(page.locator(`footer [data-support-link][href="${PATREON_URL}"]`).first()).toBeVisible();
  }
});

test('no draft is on the live site', () => {
  for (const file of htmlFiles('dist')) {
    expect(readFileSync(file, 'utf8'), file).not.toContain('data-draft-banner');
  }
});

test('every source link after a claim points to a source listed on the same page', () => {
  for (const file of htmlFiles('dist')) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<sup class="cite"><a href="#([^"]+)"/g)) {
      expect(html, `${file}: #${match[1]}`).toContain(`id="${match[1]}"`);
    }
    expect(html, file).not.toMatch(/\[\[[A-Za-z0-9]+\]\]/);
  }
});
