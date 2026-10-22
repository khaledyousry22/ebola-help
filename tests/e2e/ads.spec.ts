import { expect, test, type Page } from '@playwright/test';
import { getMessages } from '../../src/i18n';

const CLIENT = 'ca-pub-6667226078449577';
const ALLOWED = ['/en/', '/en/news/', '/en/news/other-languages/', '/en/map/', '/ar/map/'];
const NEVER = [
  '/',
  '/en/help/',
  '/en/countries/cd/',
  '/en/health/',
  '/en/health/symptoms/',
  '/en/health/vaccines-treatment/',
  '/en/about/',
  '/fr/countries/ug/',
];

/**
 * Never contact Google during tests; record whether the ad script was
 * requested. "blocked" simulates an ad blocker, "empty" a script that loads.
 */
async function watchAdScript(page: Page, mode: 'blocked' | 'empty' = 'blocked') {
  const requested: string[] = [];
  await page.route(/googlesyndication\.com|doubleclick\.net/, (route) => {
    requested.push(route.request().url());
    return mode === 'blocked' ? route.abort() : route.fulfill({ body: '', contentType: 'text/javascript' });
  });
  return requested;
}

for (const path of ALLOWED) {
  test(`${path} has one labelled ad slot, hidden until needed`, async ({ page }) => {
    await watchAdScript(page);
    await page.goto(path);
    const ins = page.locator('ins.adsbygoogle');
    await expect(ins).toHaveCount(1);
    await expect(ins).toHaveAttribute('data-ad-client', CLIENT);
    await expect(ins).toHaveAttribute('data-ad-slot', '8499220315');
    await expect(page.locator('[data-ad]')).toBeHidden();
  });
}

for (const path of NEVER) {
  test(`${path} never shows ads`, async ({ page }) => {
    await watchAdScript(page);
    await page.goto(path);
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
    await expect(page.locator('[data-ad-zone]')).toHaveCount(0);
  });
}

test('the ad script is not loaded before the reader scrolls near the ad', async ({ page }) => {
  const requested = await watchAdScript(page, 'empty');
  await page.goto('/en/news/');
  await page.waitForTimeout(2500);
  expect(requested).toEqual([]);

  await page.locator('[data-ad-zone]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-ad]')).toBeVisible();
  await expect.poll(() => requested.length).toBeGreaterThan(0);
  expect(requested[0]).toContain(`adsbygoogle.js?client=${CLIENT}`);
  await expect(page.locator('[data-ad]')).toContainText(getMessages('en').ads.label);
});

test('no empty ad box when the ad script is blocked', async ({ page }) => {
  const requested = await watchAdScript(page, 'blocked');
  await page.goto('/en/news/');
  await page.locator('[data-ad-zone]').scrollIntoViewIfNeeded();
  await expect.poll(() => requested.length).toBeGreaterThan(0);
  await expect(page.locator('[data-ad]')).toBeHidden();
});

test('no empty ad box when Google has no ad to show', async ({ page }) => {
  await watchAdScript(page, 'empty');
  await page.goto('/en/map/');
  await page.locator('[data-ad-zone]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-ad]')).toBeVisible();
  // What Google's script does when no ad is available (site under review, no advertiser).
  await page.locator('ins.adsbygoogle').evaluate((ins) => ins.setAttribute('data-ad-status', 'unfilled'));
  await expect(page.locator('[data-ad]')).toBeHidden();
});

test('no ads at all when the browser asks to save data', async ({ page }) => {
  const requested = await watchAdScript(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' } });
  });
  await page.goto('/en/news/');
  await page.waitForTimeout(1500);
  await page.locator('[data-ad-zone]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  expect(requested).toEqual([]);
  await expect(page.locator('[data-ad]')).toBeHidden();
});

test('no ads on 2G connections', async ({ page }) => {
  const requested = await watchAdScript(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: false, effectiveType: 'slow-2g' } });
  });
  await page.goto('/en/map/');
  await page.waitForTimeout(1500);
  await page.locator('[data-ad-zone]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  expect(requested).toEqual([]);
});

test('ads.txt declares the publisher and every page carries the verification tag', async ({ page, request }) => {
  const adsTxt = await (await request.get('/ads.txt')).text();
  expect(adsTxt.trim()).toBe('google.com, pub-6667226078449577, DIRECT, f08c47fec0942fa0');
  for (const path of ['/', '/en/', '/zh/health/']) {
    await page.goto(path);
    await expect(page.locator('meta[name="google-adsense-account"]')).toHaveAttribute('content', CLIENT);
  }
});

test('About page explains advertising and links to Google’s privacy pages', async ({ page }) => {
  await page.goto('/fr/about/');
  await expect(page.locator('[data-advertising]')).toContainText('Google AdSense');
  await expect(page.locator('[data-privacy] a[href="https://policies.google.com/technologies/partner-sites"]')).toBeVisible();
  await expect(page.locator('[data-privacy] a[href="https://adssettings.google.com/"]')).toBeVisible();
  await expect(page.locator('[data-privacy] a[href="https://www.aboutads.info/"]')).toBeVisible();
});

test('news items show no extracts while ads are on', async ({ page }) => {
  await page.goto('/en/news/');
  const cards = page.locator('[data-news-item]');
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(page.locator('[data-news-item] p.text-muted[lang]')).toHaveCount(0);
});
