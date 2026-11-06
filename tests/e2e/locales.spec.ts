import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { getMessages, LOCALE_CODES, LOCALES } from '../../src/i18n';

const PAGES = ['/', '/news/', '/updates/', '/updates/2026-11-06/', '/map/', '/help/', '/health/', '/about/', '/editorial-policy/', '/privacy/', '/contact/', '/offline/'];

test.describe('language picker', () => {
  test('shows all six languages by their native names', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('[data-picker] a[data-locale]');
    await expect(links).toHaveCount(LOCALE_CODES.length);
    for (const code of LOCALE_CODES) {
      const link = page.locator(`[data-picker] a[data-locale="${code}"]`);
      await expect(link).toContainText(LOCALES[code].nativeName);
      await expect(link).toHaveAttribute('lang', LOCALES[code].htmlLang);
      await expect(link).toHaveAttribute('href', `/${code}/`);
    }
  });

  test('suggests the browser language without choosing it', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'fr-CD' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('a[data-locale="fr"]')).toHaveAttribute('data-suggested', '');
    await expect(page.locator('a[data-locale="fr"] [data-suggested-label]')).toBeVisible();
    await expect(page.locator('a[data-suggested]')).toHaveCount(1);
    await context.close();
  });

  test('shows no suggestion for unsupported browser languages', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'sw-KE' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('a[data-suggested]')).toHaveCount(0);
    await context.close();
  });

  test('remembers the choice and skips the picker next time', async ({ page, context }) => {
    await page.goto('/');
    await page.locator('a[data-locale="ar"]').click();
    await expect(page).toHaveURL('/ar/');
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'ebh_locale')?.value).toBe('ar');

    await page.goto('/');
    await expect(page).toHaveURL('/ar/');
  });

  test('language menu changes the saved language and keeps the same page', async ({ page, context }) => {
    await page.goto('/en/about/');
    await page.locator('details[data-menu] summary').click();
    await page.locator('details[data-menu] a[data-locale="ru"]').click();
    await expect(page).toHaveURL('/ru/about/');
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'ebh_locale')?.value).toBe('ru');
  });

  test('works without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await page.locator('a[data-locale="es"]').click();
    await expect(page).toHaveURL('/es/');
    await expect(page.locator('h1')).toBeVisible();
    await context.close();
  });
});

test.describe('localized pages', () => {
  for (const code of LOCALE_CODES) {
    const info = LOCALES[code];
    const m = getMessages(code);

    for (const path of PAGES) {
      const url = `/${code}${path}`;

      test(`${url} is in ${info.englishName} with the right direction`, async ({ page }) => {
        await page.goto(url);
        await expect(page.locator('html')).toHaveAttribute('lang', info.htmlLang);
        await expect(page.locator('html')).toHaveAttribute('dir', info.dir);
        await expect(page.locator('h1')).toHaveCount(1);
      });

      test(`${url} shows the independence disclaimer and emergency box`, async ({ page }) => {
        await page.goto(url);
        await expect(page.locator('footer [data-disclaimer]')).toHaveText(m.footer.disclaimer);
        await expect(page.locator('[data-emergency-box] h2')).toHaveText(m.emergency.title);
        await expect(page.locator('footer a[href="mailto:wrongnumber@ebola.help"]')).toBeVisible();
        for (const target of ['/about/', '/editorial-policy/', '/privacy/', '/contact/']) {
          await expect(page.locator(`footer [data-footer-links] a[href="/${code}${target}"]`)).toBeVisible();
        }
        // Calm order: the page title comes first, then the emergency box.
        const h1 = await page.locator('h1').boundingBox();
        const box = await page.locator('[data-emergency-box]').boundingBox();
        expect(h1 && box && h1.y < box.y).toBe(true);
      });

      test(`${url} links to every language version (hreflang)`, async ({ page }) => {
        await page.goto(url);
        for (const other of LOCALE_CODES) {
          await expect(
            page.locator(`link[rel="alternate"][hreflang="${LOCALES[other].htmlLang}"]`),
          ).toHaveAttribute('href', `https://ebola.help/${other}${path}`);
        }
        await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
          'href',
          'https://ebola.help/',
        );
      });

      test(`${url} has no detectable accessibility problems`, async ({ page }) => {
        await page.goto(url);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      });
    }
  }

  test('Arabic layout is mirrored: logo on the right, language menu on the left', async ({ page }) => {
    await page.goto('/ar/');
    const logo = await page.locator('[data-logo]').boundingBox();
    const menu = await page.locator('details[data-menu]').boundingBox();
    expect(logo && menu && logo.x > menu.x).toBe(true);

    await page.goto('/en/');
    const logoEn = await page.locator('[data-logo]').boundingBox();
    const menuEn = await page.locator('details[data-menu]').boundingBox();
    expect(logoEn && menuEn && logoEn.x < menuEn.x).toBe(true);
  });

  test('Arabic pages load the Arabic font; other pages do not', async ({ page }) => {
    const fonts: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/fonts/')) fonts.push(r.url());
    });
    await page.goto('/en/');
    await page.goto('/zh/');
    await page.goto('/');
    expect(fonts).toEqual([]);
    await page.goto('/ar/');
    await page.evaluate(() => document.fonts.ready);
    expect(fonts.some((f) => f.includes('noto-sans-arabic'))).toBe(true);
  });
});

test.describe('neutral pages', () => {
  test('picker page shows the disclaimer in all six languages and passes accessibility checks', async ({ page }) => {
    await page.goto('/');
    for (const code of LOCALE_CODES) {
      await expect(page.locator(`footer [data-disclaimer] [lang="${LOCALES[code].htmlLang}"]`)).toHaveText(
        getMessages(code).footer.disclaimer,
      );
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('the language picker links to the privacy policy in every language', async ({ page }) => {
    await page.goto('/');
    for (const code of LOCALE_CODES) {
      await expect(page.locator(`footer [data-privacy-links] a[href="/${code}/privacy/"]`)).toHaveText(
        getMessages(code).footer.privacy,
      );
    }
  });

  test('unknown pages show a multilingual not-found page', async ({ page }) => {
    const response = await page.goto('/does-not-exist/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('a[href="/fr/"]')).toBeVisible();
    await expect(page.locator('footer [data-disclaimer]')).toBeVisible();
  });

  test('/admin/ points the owner to the editing page and is hidden from search engines', async ({ page }) => {
    await page.goto('/admin/');
    await expect(page.locator('a[href="https://app.pagescms.org"]')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('footer [data-disclaimer]')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('situation updates', () => {
  for (const code of LOCALE_CODES) {
    test(`/${code}/ shows the latest update in short and links to it`, async ({ page }) => {
      const m = getMessages(code);
      await page.goto(`/${code}/`);
      const card = page.locator('[data-latest-update]');
      await expect(card).toContainText(m.updates.latest);
      await expect(card.locator('li').first()).toBeVisible();
      await card.locator(`a[href="/${code}/updates/2026-11-06/"]`).first().click();
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-update-disclaimer]')).toHaveText(m.updates.disclaimer);
      await expect(page.locator('[data-sources] li')).toHaveCount(6);
      await expect(page.locator(`header a[href="/${code}/updates/"]`)).toBeVisible();
    });
  }
});
