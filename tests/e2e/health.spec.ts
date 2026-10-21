import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { getMessages, LOCALE_CODES, LOCALES } from '../../src/i18n';
import raw from '../../src/data/outbreak.json' with { type: 'json' };

const SLUGS = readdirSync('src/content/health/en').map((f) => f.replace(/\.md$/, ''));

for (const code of LOCALE_CODES) {
  const info = LOCALES[code];
  const m = getMessages(code);

  test(`/${code}/health/ lists all health pages`, async ({ page }) => {
    await page.goto(`/${code}/health/`);
    await expect(page.locator('html')).toHaveAttribute('dir', info.dir);
    await expect(page.locator('[data-health-list] a')).toHaveCount(SLUGS.length);
    for (const slug of SLUGS) {
      await expect(page.locator(`[data-health-list] a[href="/${code}/health/${slug}/"]`)).toBeVisible();
    }
  });

  for (const slug of SLUGS) {
    const url = `/${code}/health/${slug}/`;
    test(`${url}: language, banner, disclaimer, sources and accessibility`, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator('html')).toHaveAttribute('lang', info.htmlLang);
      await expect(page.locator('html')).toHaveAttribute('dir', info.dir);
      await expect(page.locator('h1')).toHaveCount(1);

      // Outbreak banner with its official source link.
      const banner = page.locator('[data-outbreak-banner]');
      await expect(banner).toBeVisible();
      await expect(banner.locator('a[href^="https://"]')).toHaveCount(2);

      // Medical disclaimer, non-affiliation footer and sources.
      await expect(page.locator('[data-medical-disclaimer]')).toHaveText(m.health.disclaimer);
      await expect(page.locator('footer [data-disclaimer]')).toHaveText(m.footer.disclaimer);
      const sources = page.locator('[data-sources] li a[href^="https://"]');
      expect(await sources.count()).toBeGreaterThan(0);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
}

test('banner shows the official figures with local number formatting', async ({ page }) => {
  await page.goto('/en/');
  const banner = page.locator('[data-outbreak-banner]');
  await expect(banner).toContainText(raw.headline.confirmedCases.toLocaleString('en-GB'));
  await expect(banner).toContainText(raw.headline.confirmedDeaths.toLocaleString('en-GB'));
  await page.goto('/fr/');
  await expect(page.locator('[data-outbreak-banner]')).toContainText('République démocratique du Congo');
});

test('health pages link to the WHO fact sheet in the reader’s own language', async ({ page }) => {
  await page.goto('/ar/health/symptoms/');
  await expect(
    page.locator('[data-sources] a[href="https://www.who.int/ar/news-room/fact-sheets/detail/ebola-disease"]'),
  ).toBeVisible();
});

test('internal links between health pages work', async ({ page }) => {
  await page.goto('/fr/health/what-is-ebola/');
  await page.locator('.prose-content a[href="../transmission/"]').click();
  await expect(page).toHaveURL('/fr/health/transmission/');
  await expect(page.locator('h1')).toHaveText('Comment Ebola se transmet');
});
