import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { getMessages, LOCALE_CODES, LOCALES } from '../../src/i18n';

for (const code of LOCALE_CODES) {
  const m = getMessages(code);

  test(`/${code}/news/: official updates first, then media in ${LOCALES[code].englishName}`, async ({ page }) => {
    await page.goto(`/${code}/news/`);
    const sections = page.locator('[data-section]');
    await expect(sections.nth(0)).toHaveAttribute('data-section', 'official');
    await expect(sections.nth(1)).toHaveAttribute('data-section', 'media');

    const official = page.locator('[data-section="official"] [data-news-item]');
    expect(await official.count()).toBeGreaterThan(0);
    for (const item of await official.all()) await expect(item).toHaveAttribute('data-official', '');

    // Media coverage is only in the reader's language, and none of it is labelled foreign.
    const media = page.locator('[data-section="media"] [data-news-item]');
    for (const item of await media.all()) {
      await expect(item).toHaveAttribute('data-lang', code);
      await expect(item.locator('[data-original-language]')).toHaveCount(0);
    }
    if ((await media.count()) === 0) await expect(page.locator('[data-section="media"]')).toContainText(m.news.mediaEmpty);

    // Items in other languages are labelled with their original language.
    for (const item of await official.all()) {
      const lang = await item.getAttribute('data-lang');
      await expect(item.locator('[data-original-language]')).toHaveCount(lang === code ? 0 : 1);
    }

    // Every headline links to the original on the publisher's site.
    for (const link of await page.locator('[data-news-item] h3 a').all()) {
      expect(await link.getAttribute('href')).toMatch(/^https?:\/\//);
    }
    await expect(page.locator('[data-news-updated] time')).toHaveAttribute('datetime', /\d{4}-\d{2}-\d{2}T/);

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test(`/${code}/news/other-languages/: only other languages, each labelled`, async ({ page }) => {
    await page.goto(`/${code}/news/other-languages/`);
    await expect(page.locator(`[data-language-section="${code}"]`)).toHaveCount(0);
    const items = page.locator('[data-news-item]');
    expect(await items.count()).toBeGreaterThan(0);
    for (const item of await items.all()) {
      expect(await item.getAttribute('data-lang')).not.toBe(code);
      await expect(item.locator('[data-original-language]')).toHaveCount(1);
      // The headline carries its own language for screen readers.
      const lang = (await item.getAttribute('data-lang'))!;
      await expect(item.locator('h3')).toHaveAttribute('lang', LOCALES[lang as keyof typeof LOCALES].htmlLang);
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test('home page shows the latest official updates and links to all news', async ({ page }) => {
  await page.goto('/en/');
  expect(await page.locator('[data-home-news] [data-news-item][data-official]').count()).toBeGreaterThan(0);
  await expect(page.locator('a[href="/en/news/"]').first()).toBeVisible();
});

test('a French reader does not see the same official announcement twice', async ({ page }) => {
  await page.goto('/fr/news/');
  const titles = await page.locator('[data-section="official"] [data-news-item] h3').allTextContents();
  expect(new Set(titles).size).toBe(titles.length);
});
