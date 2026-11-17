/**
 * Draws the site's images from the logo and the translations:
 * - public/social/: previews shown when a page is shared on social media or
 *   in messaging apps (1200 × 630, one per language plus a multilingual one
 *   for the language picker);
 * - public/icons/: app icons used when the site is added to a home screen.
 *
 *   npm run images
 *
 * Run again after changing the logo, the tagline or the section names.
 * Needs the Playwright browser (PW_CHROMIUM_PATH in the cloud container).
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { getMessages, LOCALE_LIST, LOCALES, type Locale } from '../src/i18n';

const OUT_DIR = 'public/social';
const ICON_DIR = 'public/icons';
const arabicFont = (weight: number) =>
  readFileSync(`public/fonts/noto-sans-arabic-arabic-${weight}-normal.woff2`).toString('base64');

const MARK = `<svg width="120" height="120" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="16" fill="#0f7d73"/><circle cx="16" cy="9.5" r="2.6" fill="#fff"/>
  <rect x="13.4" y="13.6" width="5.2" height="11.6" rx="2.6" fill="#fff"/></svg>`;

const page = (body: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: "Noto Sans Arabic"; font-weight: 400; src: url(data:font/woff2;base64,${arabicFont(400)}) format("woff2"); }
  @font-face { font-family: "Noto Sans Arabic"; font-weight: 700; src: url(data:font/woff2;base64,${arabicFont(700)}) format("woff2"); }
  * { box-sizing: border-box; margin: 0; }
  /* Same dark band as the home page (.page-head-hero in src/styles/global.css). */
  body { width: 1200px; height: 630px; color: #fff; font-family: Inter, "Noto Sans Arabic", "WenQuanYi Zen Hei", sans-serif;
    background: radial-gradient(900px 500px at 88% -10%, rgb(15 125 115 / 0.6), transparent 60%), linear-gradient(135deg, #0a2740 0%, #0d3a5c 55%, #0c4f5c 100%);
    display: flex; flex-direction: column; justify-content: center; padding: 72px 88px; border-bottom: 14px solid #0f7d73; }
  .brand { display: flex; align-items: center; gap: 28px; direction: ltr; }
  .name { font-family: Inter, sans-serif; font-size: 84px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
  .name span { color: #9adcd1; }
  .tagline { margin-top: 48px; font-size: 56px; font-weight: 700; line-height: 1.25; color: #fff; }
  .sections { margin-top: 28px; font-size: 34px; color: #d7e6f2; }
  [lang="ar"] { font-family: "Noto Sans Arabic", sans-serif; }
  [lang^="zh"] { font-family: "WenQuanYi Zen Hei", sans-serif; }
  .grid { margin-top: 44px; display: grid; grid-template-columns: 1fr 1fr; gap: 18px 48px; font-size: 30px; font-weight: 600; color: #fff; }
</style></head><body>${body}</body></html>`;

const brand = `<div class="brand">${MARK}<div class="name">Ebola<span>.help</span></div></div>`;

function localeImage(locale: Locale): string {
  const m = getMessages(locale);
  const info = LOCALES[locale];
  const sections = [m.nav.news, m.nav.help, m.nav.map, m.nav.health].join(' · ');
  return page(`${brand}
    <div lang="${info.htmlLang}" dir="${info.dir}">
      <p class="tagline">${m.meta.tagline}</p>
      <p class="sections">${sections}</p>
    </div>`);
}

function multilingualImage(): string {
  const lines = LOCALE_LIST.map(
    (l) => `<p lang="${l.htmlLang}" dir="${l.dir}">${getMessages(l.code).meta.tagline}</p>`,
  ).join('');
  return page(`${brand}<div class="grid">${lines}</div>`);
}

/** The logo mark. "full": the white symbol on a teal square, for icons the system crops (maskable, Apple). */
function icon(size: number, full: boolean): string {
  const symbol = '<circle cx="16" cy="9.5" r="2.6" fill="#fff"/><rect x="13.4" y="13.6" width="5.2" height="11.6" rx="2.6" fill="#fff"/>';
  const svg = full
    ? `<svg width="${size}" height="${size}" viewBox="-6 -6 44 44"><rect x="-6" y="-6" width="44" height="44" fill="#0c665f"/>${symbol}</svg>`
    : `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#0c665f"/>${symbol}</svg>`;
  return `<!doctype html><html><head><style>* { margin: 0 } svg { display: block }</style></head><body>${svg}</body></html>`;
}

const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
mkdirSync(OUT_DIR, { recursive: true });

const images: [string, string][] = [
  ...LOCALE_LIST.map((l): [string, string] => [l.code, localeImage(l.code)]),
  ['default', multilingualImage()],
];
for (const [name, html] of images) {
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: `${OUT_DIR}/${name}.png` });
  console.log(`Wrote ${OUT_DIR}/${name}.png`);
}
mkdirSync(ICON_DIR, { recursive: true });
const icons: [string, number, boolean][] = [
  ['icon-192', 192, false],
  ['icon-512', 512, false],
  ['maskable-512', 512, true],
  ['apple-touch-icon', 180, true],
];
for (const [name, size, full] of icons) {
  await tab.setViewportSize({ width: size, height: size });
  await tab.setContent(icon(size, full));
  await tab.screenshot({ path: `${ICON_DIR}/${name}.png`, omitBackground: !full });
  console.log(`Wrote ${ICON_DIR}/${name}.png`);
}
await browser.close();
