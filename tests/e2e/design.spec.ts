import { expect, test, type Page } from '@playwright/test';
import raw from '../../src/data/outbreak.json' with { type: 'json' };
import { SOCIAL_LINKS } from '../../src/config';
import { getMessages, LOCALE_CODES } from '../../src/i18n';

const SITE = 'https://ebola.help';

/** Every block of structured data on the page, parsed. */
async function structuredData(page: Page): Promise<Record<string, any>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((text) => JSON.parse(text) as Record<string, any>);
}

for (const code of LOCALE_CODES) {
  const m = getMessages(code);

  test(`/${code}/ shows the official figures as large numbers, with their date and two source links`, async ({ page }) => {
    await page.goto(`/${code}/`);
    const card = page.locator('[data-outbreak-banner]');
    await expect(card).toHaveCount(1);
    await expect(card.locator('dt').nth(0)).toHaveText(m.outbreak.cases);
    await expect(card.locator('dt').nth(1)).toHaveText(m.outbreak.deaths);
    const digits = async (index: number) => (await card.locator('dd').nth(index).innerText()).replace(/\D/g, '');
    // Arabic pages may use Arabic-Indic digits; the other languages use 0-9.
    if (code !== 'ar') {
      expect(await digits(0)).toBe(String(raw.headline.confirmedCases));
      expect(await digits(1)).toBe(String(raw.headline.confirmedDeaths));
    }
    await expect(card.locator('a[href^="https://"]')).toHaveCount(2);
    await expect(card.locator(`a[href="/${code}/map/"]`)).toBeVisible();
  });

  test(`/${code}/ has a helplines button in the header and the main actions under the title`, async ({ page }) => {
    await page.goto(`/${code}/`);
    await expect(page.locator('header [data-header-help]')).toHaveAttribute('href', `/${code}/help/`);
    await expect(page.locator('header [data-header-help]')).toHaveText(m.nav.help);
    for (const target of ['/help/', '/health/', '/updates/']) {
      await expect(page.locator(`.page-head a.btn[href="/${code}${target}"]`)).toBeVisible();
    }
  });

  test(`/${code}/health/symptoms/ can be shared, lists the other guides and describes itself to search engines`, async ({ page }) => {
    const path = `/${code}/health/symptoms/`;
    await page.goto(path);
    const title = await page.locator('h1').innerText();

    const share = page.locator('[data-share]');
    await expect(share.locator('h2')).toHaveText(m.share.title);
    const url = encodeURIComponent(`${SITE}${path}`);
    await expect(share.locator('[data-share-link="WhatsApp"]')).toHaveAttribute('href', new RegExp(`^https://api\\.whatsapp\\.com/send\\?text=.*${url}$`));
    await expect(share.locator('[data-share-link="Facebook"]')).toHaveAttribute('href', `https://www.facebook.com/sharer/sharer.php?u=${url}`);
    await expect(share.locator('[data-share-link="X"]')).toHaveAttribute('href', new RegExp(`^https://x\\.com/intent/post\\?text=.*&url=${url}$`));

    const guides = page.locator('[data-health-nav] a');
    await expect(guides).toHaveCount(11);
    await expect(page.locator('[data-health-nav] a[aria-current="page"]')).toHaveAttribute('href', path);

    const data = await structuredData(page);
    const guide = data.find((d) => d['@type'] === 'MedicalWebPage');
    expect(guide?.url).toBe(`${SITE}${path}`);
    expect(guide?.headline).toBe(title);
    expect(guide?.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(guide?.publisher?.name).toBe('Ebola.help');
    const crumbs = data.find((d) => d['@type'] === 'BreadcrumbList');
    expect(crumbs?.itemListElement.map((item: { item: string }) => item.item)).toEqual([
      `${SITE}/${code}/`,
      `${SITE}/${code}/health/`,
      `${SITE}${path}`,
    ]);
  });
}

test('the home page tells search engines who publishes the site and where else to find it', async ({ page }) => {
  await page.goto('/en/');
  const graph = (await structuredData(page)).flatMap((d) => d['@graph'] ?? [d]);
  const organization = graph.find((d) => d['@type'] === 'Organization');
  expect(organization?.name).toBe('Ebola.help');
  expect(organization?.sameAs).toEqual(SOCIAL_LINKS.map((link) => link.url));
  expect(graph.find((d) => d['@type'] === 'WebSite')?.url).toBe(`${SITE}/`);
});

test('a situation update is an article with its publication date, and can be shared', async ({ page }) => {
  await page.goto('/fr/updates/2026-11-06/');
  const article = (await structuredData(page)).find((d) => d['@type'] === 'Article');
  expect(article?.datePublished).toBe('2026-11-06');
  expect(article?.inLanguage).toBe('fr');
  await expect(page.locator('[data-share] [data-share-link]')).toHaveCount(3);
});

test('share links load nothing from the social networks', async ({ page }) => {
  const outside: string[] = [];
  page.on('request', (request) => {
    if (/whatsapp|facebook|x\.com|twitter/.test(new URL(request.url()).hostname)) outside.push(request.url());
  });
  await page.goto('/en/health/prevention/');
  await page.waitForLoadState('networkidle');
  expect(outside).toEqual([]);
});

test('printing a guide keeps the text and the sources, without menus, banner or footer', async ({ page }) => {
  await page.goto('/en/health/prevention/');
  await page.emulateMedia({ media: 'print' });
  for (const hidden of ['header', 'footer', '[data-outbreak-banner]', '[data-share]', '[data-health-nav]']) {
    await expect(page.locator(hidden).first()).toBeHidden();
  }
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('[data-key-points]')).toBeVisible();
  await expect(page.locator('[data-sources]')).toBeVisible();
  await expect(page.locator('[data-emergency-box]')).toBeVisible();
});

test('on a phone, nothing is wider than the screen', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const page = await context.newPage();
  for (const path of ['/en/', '/ru/', '/ar/', '/fr/map/', '/ru/health/symptoms/', '/es/countries/cd/', '/zh/news/', '/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  await context.close();
});
