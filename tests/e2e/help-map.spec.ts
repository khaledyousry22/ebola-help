import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getMessages, LOCALE_CODES } from '../../src/i18n';
import { loadHelpFiles } from '../../scripts/verify-me';

const COUNTRIES = ['CD', 'KE', 'NG', 'RW', 'UG'];
const HELP = loadHelpFiles();
const VERIFIED = HELP.flatMap((f) => f.entries).filter((e) => e.status === 'verified' && e.verifiedAt);
const CD_PHONES = HELP.find((f) => f.country === 'CD')!.entries.filter(
  (e) => e.kind === 'phone' && e.status === 'verified' && e.verifiedAt,
);
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
  const unverified = HELP.flatMap((f) => f.entries).filter((e) => e.status !== 'verified');

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
  // Every phone, SMS or WhatsApp link on the site belongs to a verified entry.
  const allowed = new Set(
    VERIFIED.flatMap((e) => {
      if (e.kind === 'phone') {
        const digits = e.number.replace(/[^0-9+*#]/g, '');
        return [`tel:${digits.replace(/#/g, '%23')}`, `sms:${digits}`, `https://wa.me/${digits.replace(/^\+/, '')}`];
      }
      return e.kind === 'office' ? (e.phones ?? []).map((phone) => `tel:${phone.replace(/\s/g, '')}`) : [];
    }),
  );
  for (const { file, html } of pages) {
    for (const [, href] of html.matchAll(/href="((?:tel:|sms:|https:\/\/wa\.me\/)[^"]*)"/g)) {
      expect(allowed.has(href!), `${file}: ${href} is not a verified number`).toBe(true);
    }
  }
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

  test(`/${code}/countries/cd/ shows the situation, figures and only verified helplines`, async ({ page }) => {
    await page.goto(`/${code}/countries/cd/`);
    await expect(page.locator('[data-country-situation] [data-status]')).toHaveAttribute('data-status', 'active');
    await expect(page.locator('[data-country-figures] a')).toHaveAttribute('href', /^https:\/\//);
    await expect(page.locator('[data-hotlines] [data-verified-phone]')).toHaveCount(CD_PHONES.length);
    for (const phone of CD_PHONES) {
      const card = page.locator(`[data-verified-phone="${phone.id}"]`);
      // Tap to call, with the source and the date it was last verified.
      await expect(card.locator('a[href^="tel:"], a[href^="sms:"], a[href^="https://wa.me/"]')).toBeVisible();
      await expect(card.locator(`a[href="${phone.sourceUrl}"]`)).toBeVisible();
      await expect(card).toContainText(m.help.lastVerified.split('{date}')[0]!.trim());
    }
    if (CD_PHONES.length === 0) await expect(page.locator('[data-pending-note]')).toHaveText(m.help.pendingNote);
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

test('the emergency box shows a verified number only after the visitor picks their country', async ({ page }) => {
  const country = HELP.find((f) => f.entries.some((e) => e.kind === 'phone' && e.channel === 'call' && VERIFIED.includes(e)));
  test.skip(!country, 'No verified call number yet');
  const iso = country!.country;
  const phone = VERIFIED.find((e) => e.kind === 'phone' && e.channel === 'call' && country!.entries.includes(e))!;
  const m = getMessages('fr');

  await page.goto('/fr/about/');
  const box = page.locator('[data-emergency-box]');
  const select = box.locator('select');
  await expect(select).toHaveValue('');
  await expect(select.locator('option').first()).toHaveText(m.emergency.chooseCountry);
  await expect(box.locator('[data-emergency-phones]:visible')).toHaveCount(0);

  await select.selectOption(iso);
  const list = box.locator(`[data-emergency-phones="${iso}"]`);
  await expect(list.locator('a[href^="tel:"]').first()).toBeVisible();
  await expect(list).toContainText(m.help.lastVerified.split('{date}')[0]!.trim());
  await expect(list.locator(`a[href="${phone.sourceUrl}"]`).first()).toBeVisible();

  // Remembered on the next page.
  await page.goto('/fr/news/');
  await expect(page.locator('[data-emergency-box] select')).toHaveValue(iso);
  await expect(page.locator(`[data-emergency-box] [data-emergency-phones="${iso}"]`)).toBeVisible();
  expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);
});
