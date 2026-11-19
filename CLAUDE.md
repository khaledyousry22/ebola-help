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
  not copying), using WHO's official terminology in each language; where WHO
  publishes a source in a language, add that version to `sources.ts`.
  `metaTitle` is the search title when the page title lacks "Ebola".
- Source links: `[[sourceId]]` after a claim (body or key point) becomes a
  numbered link to the page's source list (`src/lib/citations.ts`, a Sätteri
  plugin in `astro.config.mjs`); numbers follow the `sources` order. Pages
  that use them must cite every listed source, in the same paragraphs in every
  language (unit tests). Check each claim against its source first.
- Drafts awaiting approval: `src/content/drafts/health/<locale>/<slug>.md`,
  never on the live site; `npm run build:drafts` (SHOW_DRAFTS=1) builds
  `dist-drafts/` with drafts in place of the live pages. Every draft
  paragraph, list item and key point must cite a source. To publish after the
  owner approves, move the files into `src/content/health/`.
- Corrections: optional `corrections` (date, note) on health pages and
  updates, shown at the end with a "Report an error" e-mail link; the
  editorial policy promises a note for any change of meaning.
- Situation updates (weekly): `src/content/updates/<locale>/<YYYY-MM-DD>.md`
  (title, description, date, figuresAsOf, keyPoints, sources), listed at
  `/<locale>/updates/`, newest on the home page (`LatestUpdate`). Every
  language has the same dates, sources, links and number of key points
  (unit tests). Write only what the cited official reports say; the owner
  approves the English draft first. Each update ends with a Patreon note.
- Policy pages (editorial policy, privacy, contact):
  `src/content/info/<locale>/<slug>.md`, slugs in `src/lib/info-pages.ts`,
  linked from every footer. The site is run by Khaled Yousry (`EDITOR` in
  `src/config.ts`, named on About, editorial policy and contact); other pages
  are signed "the Ebola.help Team". Describe the editor without gendered pronouns or
  word forms where the language allows. The
  privacy policy must match what the site does (cookies, ad pages, hosting):
  update it when that changes.
- Search indexing: `NOINDEX_PAGES` (`src/lib/indexing.ts`) are noindex and
  left out of the sitemaps: the news headline lists and the offline page.
- Sources: `src/data/sources.ts`, with each publisher's own language versions.
  Outbreak banner: `src/data/outbreak.json`, validated by `src/data/outbreak.ts`.
- Outbreak figures: `scripts/outbreak/` (run with `npm run outbreak`, every
  three hours in `.github/workflows/outbreak.yml`). It reads the CDC
  current-situation page (`cdcSituation` in `src/data/sources.ts`), and
  `scripts/outbreak/lib/plan.ts` decides whether the reading may be
  published: totals never fall, deaths never exceed cases, no jump over 25%,
  no future date, every country with figures must be readable, countries
  marked `ended` are left alone and a country not in `outbreak.json` is only
  reported. A failed check writes nothing and opens an issue. Owner-typed
  figures stand until the page shows something newer (`asOf`). `--dry` reports
  without writing and `--page=FILE` reads a saved copy; a PR touching the job
  runs the real page through it (`outbreak-check.yml`).
- Quote YAML front matter values that contain `: `.
- News: `scripts/news/` (run with `npm run news`, hourly in
  `.github/workflows/news.yml`). Sources in `src/data/news-sources.ts`; output
  `src/data/news/items.json` validated by `src/data/news-schema.ts`; hide/pin
  in `src/data/news/overrides.json`. Excerpts are capped (200 chars, 90 for
  Chinese) and switched off while ads are on (`NEWS_EXCERPTS` in
  `src/config.ts`; WHO extracts are non-commercial only). Items are never translated; other-language items are labelled
  with their original language. In this container run it with
  `NODE_USE_ENV_PROXY=1` so Node's fetch uses the proxy.
- Social media: RSS feeds in `src/pages/feeds/`, built by
  `src/lib/social-feed.ts`, in the languages of `SOCIAL_FEED_LOCALES`
  (`src/config.ts`). `/feeds/social.xml`: official non-hidden news and weekly
  updates (one post per language), a daily health tip from the guides'
  `keyPoints` (changes at 06:00 UTC, appears with the next build) and the
  banner figures when they change (all languages in one post).
  `/feeds/media.xml`: non-official news without alarming headlines (word lists
  in `social-feed.ts`). Zapier posts each new entry on the Facebook Page (owner
  setup: `SOCIAL.md`; Zapier's free plan allows 100 posts a month, so the
  media feed goes through Make.com's free plan, checked every 2 hours). Entry ids never change, so nothing is posted twice. Previews are
  always Ebola.help pages (Facebook rejects some sites). Footer links to the
  accounts: `SOCIAL_LINKS`; Patreon: `PATREON_URL` (both in `src/config.ts`).
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
- Search engines: one `/sitemap.xml` (every page in every language plus the
  root, with last-changed dates), built from `localePages()` in
  `src/lib/site-pages.ts` (a browser test checks it matches the built pages);
  `/sitemap-index.xml` points to it for Search Console. hreflang links come
  from `src/lib/alternates.ts` for both pages and sitemap: x-default is the
  root picker for home pages and English elsewhere (the picker only links
  back to home pages). Titles: home pages show the outbreak year and
  description the latest figures, from `outbreak.json`; other pages use
  `metaTitle` messages so each title says "Ebola" (unique per language,
  browser test). Share images and app icons in `public/social/` and
  `public/icons/` are drawn by `npm run images`.
- Offline: hand-written service worker `src/pages/sw.js.ts` (network first,
  saved copy or `/<locale>/offline/` without a connection; saves
  `offlinePages()` per language; same-origin only, never ads). Browser tests
  block service workers except `tests/e2e/offline.spec.ts`.
- Design: shared classes in `src/styles/global.css` (`page-title`,
  `page-lead`, `section-title`, `eyebrow`, `card`, `card-title`, `btn`
  `btn-primary|outline|light|ghost`, `icon-chip`, `paper`, `check-list`,
  `note`). Every page has a heading band (`page-head`; the home page uses the
  dark `page-head-hero` with the figures card, `AlertBanner variant="card"`).
  Icons: `<Icon name>` from `src/lib/icons.ts` (Lucide, ISC, copied in; add an
  icon there), brand logos in `src/lib/brand-icons.ts` (Simple Icons, CC0).
  Arrows get `flip` so they point the right way in Arabic. Print styles hide
  menus, banner, footer and `.no-print`. A browser test checks nothing is
  wider than a 320px phone screen.
- Structured data for search engines: `<JsonLd>` with helpers in
  `src/lib/structured-data.ts` (organisation and website on home pages,
  `MedicalWebPage` on guides, `Article` on updates, breadcrumbs from
  `<Breadcrumbs>`). Share links (`<ShareLinks>`: WhatsApp, Facebook, X) are
  plain links on guides and updates: nothing is loaded from those networks.
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
