import { expect, test } from '@playwright/test';
import { getMessages } from '../../src/i18n';

test.use({ serviceWorkers: 'allow' });

const fr = getMessages('fr');

test('after one visit, helplines and prevention open without a connection', async ({ page, context }) => {
  await page.goto('/fr/');
  // Wait until the service worker has saved this language's essential pages.
  await expect
    .poll(() => page.evaluate(async () => !!(await caches.match('/__saved/fr'))), { timeout: 20_000 })
    .toBe(true);

  // No connection, for the page and for the service worker's own requests.
  await context.setOffline(true);
  await context.route('**/*', (route) => route.abort('internetdisconnected'));

  await page.goto('/fr/help/');
  await expect(page.locator('h1')).toHaveText(fr.help.title);
  await expect(page.locator('footer [data-disclaimer]')).toBeVisible();

  await page.goto('/fr/health/prevention/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  // Styles are saved too.
  expect(await page.evaluate(() => getComputedStyle(document.body).display)).toBe('flex');

  // A page that was never saved: the offline page, in French, with the emergency box.
  await page.goto('/fr/news/');
  await expect(page.locator('h1')).toHaveText(fr.offline.title);
  await expect(page.locator('[data-offline-links] a[href="/fr/help/"]')).toBeVisible();
  await expect(page.getByText(fr.emergency.title).first()).toBeVisible();
});

test('the service worker never handles ads or other sites', async ({ request }) => {
  const worker = await (await request.get('/sw.js')).text();
  expect(worker).toContain('url.origin !== self.location.origin) return;');
  expect(worker).not.toMatch(/googlesyndication|doubleclick/);
});

test('each language has an app manifest that opens in that language', async ({ request, page }) => {
  const manifest = await (await request.get('/ar/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ start_url: '/ar/', lang: 'ar', dir: 'rtl', scope: '/' });
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  await page.goto('/ar/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/ar/manifest.webmanifest');
});

test('the offline page is hidden from search engines', async ({ page }) => {
  await page.goto('/en/offline/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});
