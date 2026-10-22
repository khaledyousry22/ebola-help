# Ebola.help: notes for contributors and AI assistants

Independent multilingual public-information site about Ebola disease.
The owner is not a developer: keep things simple and explain choices in
plain language.

## Non-negotiable rules

- **Never invent or guess** a phone number, address, facility, figure or
  source. Every contact entry needs `source_url` and `verified_at`; anything
  unverified goes to `VERIFY_ME.md`, never onto the site.
- **Not official.** No WHO/UN names as branding, no emblems (including red
  cross or red crescent). Every page footer shows the non-affiliation
  disclaimer; the About page explains it.
- **News:** headline, source, date, short excerpt and link only. Never
  republish articles. Machine-translated text must be labelled as such.
- **Tone:** calm and factual, never alarmist.

## How the site is built

- Astro 7, fully static output (`dist/`), no server or database. Tailwind v4.
- Hosting: Cloudflare Workers static assets (`wrangler.jsonc`, no Worker
  code), built by Workers Builds on every push to main (`npm run build`,
  then `npx wrangler deploy`). Headers in `public/_headers`. Owner setup
  steps: `DEPLOY.md`. CI runs `wrangler deploy --dry-run`.
- Languages: `src/i18n/locales.ts` (list) and `src/i18n/messages/*.json`
  (UI text). English is the reference; unit tests fail if a language is
  missing a key or a `{placeholder}`.
- Pages live under `src/pages/[locale]/` and are generated for every locale.
- Health pages: `src/content/health/<locale>/<slug>.md`. Every language has the
  same slugs and cites the same source ids (unit tests enforce this). Text is
  written by us from the sources (WHO website terms allow short extracts only,
  not copying), using WHO's official terminology in each language.
- Sources: `src/data/sources.ts`, with each publisher's own language versions.
  Outbreak banner: `src/data/outbreak.json`, validated by `src/data/outbreak.ts`.
- Quote YAML front matter values that contain `: `.
- News: `scripts/news/` (run with `npm run news`, hourly in
  `.github/workflows/news.yml`). Sources in `src/data/news-sources.ts`; output
  `src/data/news/items.json` validated by `src/data/news-schema.ts`; hide/pin
  in `src/data/news/overrides.json`. Excerpts are capped (200 chars, 90 for
  Chinese) and switched off while ads are on (`NEWS_EXCERPTS` in
  `src/config.ts`; WHO extracts are non-commercial only). Items are never translated; other-language items are labelled
  with their original language. In this container run it with
  `NODE_USE_ENV_PROXY=1` so Node's fetch uses the proxy.
- Contacts: `src/data/help/<ISO>.json` (schema `src/data/help-schema.ts`).
  Each entry has sourceUrl, sourceQuote, foundOn and a status. Only
  `verified` entries with `verifiedAt` reach the site (`src/data/help.ts`).
  Entries not from an official website need an `ownerNote`. After editing,
  run `npm run verify-me` (a test fails if VERIFY_ME.md is stale). A browser
  test scans every built page for unverified numbers and addresses.
- Editing page: Pages CMS (app.pagescms.org), configured in `.pages.yml`
  (outbreak.json, help/*.json, news/overrides.json; `/admin/` links to it).
  Forms may save empty fields as "" or null, so schemas treat those as
  absent. A unit test keeps the forms in sync with the schemas and the
  source ids: add a new source or field to `.pages.yml` too. CI regenerates
  VERIFY_ME.md on pushes to main.
- Map: SVG built at build time from world-atlas (Natural Earth) with d3-geo
  (`src/lib/africa-map.ts`); statuses and figures from `outbreak.json`.
  No map library is sent to visitors.
- Ads (Google AdSense, `ADS` in `src/config.ts`): only via `<AdSlot>` on the
  home, news, other-languages news and map pages. Never on health, help,
  country, About or picker pages (browser tests enforce this). `AdLoader`
  loads Google's script after page load, near the slot, and never on
  Save-Data or 2G. About page carries Google's required privacy disclosures.
- Search engines: `/sitemap-index.xml` and `/<locale>/sitemap.xml`, built from
  `localePages()` in `src/lib/site-pages.ts` (a browser test checks it matches
  the built pages). Share images and app icons in `public/social/` and
  `public/icons/` are drawn by `npm run images`.
- Offline: hand-written service worker `src/pages/sw.js.ts` (network first,
  saved copy or `/<locale>/offline/` without a connection; saves
  `offlinePages()` per language; same-origin only, never ads). Browser tests
  block service workers except `tests/e2e/offline.spec.ts`.
- Use logical CSS (`ms-`, `pe-`, `start-`, `end-`, `border-s`), never
  `left`/`right`, so Arabic (RTL) mirrors automatically. Phone numbers and
  e-mail addresses get the `ltr-data` class.
- No web fonts except Noto Sans Arabic (Arabic pages only). Chinese uses
  system fonts.
- Keep pages free of JavaScript unless it is essential; small inline scripts
  only. Everything must work without JavaScript.

## Commands (Node 24, see `.nvmrc`)

- `npm run dev`: local preview with live reload
- `npm test`: unit tests (translations, helpers)
- `npm run build`: type check and build to `dist/`
- `npm run test:e2e`: browser tests against the build (needs `npm run build`
  first). In the Claude cloud container set
  `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`.
