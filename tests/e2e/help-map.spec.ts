import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getMessages, LOCALE_CODES } from '../../src/i18n';
import { loadHelpFiles } from '../../scripts/verify-me';

const COUNTRIES = ['CD', 'KE', 'NG', 'RW', 'UG'];
const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

test('no unverified phone number, address or link appears on any page', () => {
  const pages = htmlFiles('dist').map((file) => ({ file, html: readFileSync(file, 'utf8') }));
  expect(pages.length).toBeGreaterThan(50);
  const unverified = loadHelpFiles()
    .flatMap((f) => f.entries)
    .filter((e) => e.status !== 'verified');
  expect(unverified.length).toBeGreaterThan(0);

  for (const entry of unverified) {
    const needles: string[] = [];
    if (entry.kind === 'phone') {
      const digits = entry.number.replace(/[^0-9+*#]/g, '');
      needles.push(`tel:${digits}`, `sms:${digits}`, `wa.me/${digits.replace(/^\+/, '')}`, `tel:${digits.replace(/#/g, '%23')}`);
      // Longer written forms are distinctive enough to search for as plain text.
      if (entry.display && entry.display.length >= 7) needles.push(entry.display);
    }
    if (entry.kind === 'office') {
      if (entry.address) needles.push(entry.address);
      for (const phone of entry.phones ?? []) needles.push(phone, `tel:${phone.replace(/\s/g, '')}`);
    }
    if (entry.kind === 'facility') needles.push(entry.name);
    for (const needle of needles) {
      const found = pages.find((p) => p.html.includes(needle));
      expect(found?.file, `${entry.id}: "${needle}" must not be published`).toBeUndefined();
    }
  }
  // No phone links of any kind until something is verified.
  for (const { file, html } of pages) expect(html.includes('href="tel:'), file).toBe(false);
});

for (const code of LOCALE_CODES) {
  const m = getMessages(code);

  test(`/${code}/help/ lists every country with its situation`, async ({ page }) => {
    await page.goto(`/${code}/help/`);
    for (const iso of COUNTRIES) {
      const link = page.locator(`[data-country-link="${iso}"]`);
      await expect(link).toHaveAttribute('href', `/${code}/countries/${iso.toLowerCase()}/`);
      await expect(link.locator('[data-status]')).toBeVisible();
    }
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);
  });

  test(`/${code}/countries/cd/ shows the situation, figures and no unverified contacts`, async ({ page }) => {
    await page.goto(`/${code}/countries/cd/`);
    await expect(page.locator('[data-country-situation] [data-status]')).toHaveAttribute('data-status', 'active');
    await expect(page.locator('[data-country-figures] a')).toHaveAttribute('href', /^https:\/\//);
    await expect(page.locator('[data-hotlines] [data-verified-phone]')).toHaveCount(0);
    await expect(page.locator('[data-pending-note]')).toHaveText(m.help.pendingNote);
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);
  });

  test(`/${code}/map/: coloured countries, panel and table`, async ({ page }) => {
    await page.goto(`/${code}/map/`);
    for (const iso of COUNTRIES) {
      await expect(page.locator(`[data-map] a[data-country="${iso}"]`)).toHaveCount(1);
      await expect(page.locator(`[data-map-table] [data-row="${iso}"]`)).toBeVisible();
    }
    await expect(page.locator('[data-map] a[data-country="CD"] path')).toHaveClass('map-active');
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);
  });
}

test('selecting a country on the map opens its details, Escape closes them', async ({ page }) => {
  await page.goto('/en/map/');
  await expect(page.locator('[data-panel-prompt]')).toBeVisible();
  await page.locator('[data-map] a[data-country="KE"]').click();
  await expect(page).toHaveURL('/en/map/');
  const heading = page.locator('[data-map-panel] h2');
  await expect(heading).toHaveText('Kenya');
  await expect(heading).toBeFocused();
  await expect(page.locator('[data-map-panel] a[href="/en/countries/ke/"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-panel-prompt]')).toBeVisible();
  await expect(page.locator('[data-map] a[data-country="KE"]')).toBeFocused();
});

test('without JavaScript, a country on the map opens its page', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/fr/map/');
  await page.locator('[data-map] a[data-country="UG"]').click();
  await expect(page).toHaveURL('/fr/countries/ug/');
  await context.close();
});

test('the emergency box links to the helplines page on every language home page', async ({ page }) => {
  for (const code of LOCALE_CODES) {
    await page.goto(`/${code}/`);
    await expect(page.locator(`[data-emergency-box] a[href="/${code}/help/"]`)).toBeVisible();
  }
});
