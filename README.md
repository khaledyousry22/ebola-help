# Ebola.help

An independent, multilingual public-information website about Ebola disease:
official updates, news, helplines, an outbreak map and prevention advice in
Arabic, Chinese, English, French, Russian and Spanish.

Ebola.help is **not affiliated with the World Health Organization (WHO), any
United Nations agency or any government**. It always links to the original
official sources.

---

## For the site owner (no technical knowledge needed)

### How the site works

- The website is a set of ready-made pages. There is no server or database to
  look after, so there is nothing to update or patch. Cloudflare shows it to
  visitors for free, from servers close to them, including in Africa
  (setup: [DEPLOY.md](DEPLOY.md)).
- It is designed for slow and expensive mobile connections: each page is about
  4 to 14 KB to download (the map page about 19 KB) and works without
  JavaScript.
- News updates itself every hour (see "The news" below).
- You edit helplines, outbreak figures and news through simple web forms
  (see "The editing page" below).

### The editing page

You change the outbreak figures, the helplines and the news through simple
web forms at **[app.pagescms.org](https://app.pagescms.org)** (Pages CMS, free).
Nothing to install on your computer.

**First time only:**
1. Go to [app.pagescms.org](https://app.pagescms.org) and choose
   **Sign in with GitHub**.
2. When asked, install the Pages CMS app on the `ebola-help` repository
   ("Only select repositories" → `ebola-help`).
3. Open `khaledyousry22/ebola-help`, branch `main`.

**What you can edit** (menu on the left):
- **Outbreak figures and map:** the banner figures, their date and official
  source, and each country's situation on the map. Set "Date I last reviewed
  this page" to today when you check it.
- **Helplines and contacts:** one page per country. To approve a number from
  [`VERIFY_ME.md`](VERIFY_ME.md), open the entry, set **Status** to
  "Verified" and **Date I verified it** to today, then **Save**.
- **Hide or pin news:** paste a news item's link to hide it or keep it at the
  top.

Each **Save** is recorded on GitHub with your name, so every change can be
undone. The automatic checks then run (Actions tab, "Checks"). If something is
missing or in the wrong format, the check fails and the website keeps the
previous version, so a wrong entry can never go live. A source or a country
that is not in the lists must be added in the code first: ask Claude.

### The news

Every hour, a free automatic job on GitHub ("News update", under the
**Actions** tab) reads official sources (WHO, WHO Africa, Africa CDC, ECDC,
DR Congo's National Institute of Public Health) and established news outlets
in the six languages. It keeps only items that mention Ebola and saves the
headline, source, date, a short extract and the link. It never copies full
articles and never translates them.

- **Hide an item or pin it to the top:** editing page → "Hide or pin news".
- **Run the job now:** Actions tab → "News update" → "Run workflow".
- **Add or remove a source:** `src/data/news-sources.ts` (ask for help).

If a source stops working, the others carry on. The job only reports a
failure if every source fails.

### The outbreak figures

The cases and deaths in the banner and on the map update themselves too.
Every three hours a job on GitHub ("Outbreak figures", under the **Actions**
tab) reads the CDC's current-situation page and saves the new numbers, with
the date they refer to and the sentence they were read from. Each update
reaches the website a couple of minutes later.

The job refuses to publish anything that looks wrong: a number lower than
the one already shown, a jump too large for one update, more deaths than
cases, a date in the future, a country it could not read, or wording on the
page it does not recognise. When that happens it changes nothing and opens
an issue titled "Outbreak figures need a check", so you can look at the page
yourself and, if the figures are right, type them on the editing page.

- **Run the job now:** Actions tab → "Outbreak figures" → "Run workflow".
- **Type the figures yourself:** editing page → "Outbreak figures and map".
  Your numbers stay until the official page shows something newer.
- **A country appears that the site does not list** (the job mentions it in
  its report): adding one also means choosing its colour on the map, so that
  is left to you.

### Your checklist of phone numbers

[`VERIFY_ME.md`](VERIFY_ME.md) lists every phone number, address or facility
that is waiting for your check, with the page where it was found and the
exact text to look for. Nothing on that list is shown on the website until
you confirm it.

To confirm entries, use the editing page (above), or tell Claude which ones
match (for example "cd-numero-vert-151 OK"). The list updates itself a few
minutes after each save. An automatic test checks every page of the site to
make sure no unconfirmed number or address appears.

### Helplines and the map

- **Helplines** (`/help/`): one page per country with its situation, official
  figures, confirmed helplines (tap to call), health authorities and the
  latest news about that country.
- **Map** (`/map/`): Africa, coloured by situation (active outbreak, cases
  being monitored, outbreak over). The same information is in a table under
  the map. Situations and figures come from `src/data/outbreak.json`.

### Advertising (Google AdSense)

Ads appear only on the home page, the news pages and the map, below the main
content and labelled "Advertisement". Pages with health advice, helplines,
country pages and About never show ads. Ads load only when a reader scrolls
near them, and never on data-saving or 2G connections.

- Settings: `src/config.ts` (`ADS`). Set `enabled: false` to remove all ads.
- `public/ads.txt` declares your publisher ID to advertisers.
- While ads are on, news items show headline, source and date only (no
  extracts): WHO's terms allow extracts only for non-commercial use.

- If Google has no ad to show (for example while it reviews the site), or an
  ad blocker stops it, the ad space stays hidden: no empty boxes.

Settings in your AdSense account (add the site, the consent message for
Europe, blocking "cure" and medicine ads): [DEPLOY.md, Step 7](DEPLOY.md#step-7-google-adsense-10-minutes-once-the-site-is-on-ebolahelp).

### Offline use and search engines

- **Without a connection:** after a first visit, the site keeps the reader's
  home page (with the emergency box), the helplines, the country pages and
  the symptoms, transmission and prevention pages on their phone. They open
  even with no signal. Other pages show a short "you are offline" page that
  links to the saved ones. The saved copies refresh at most once a day,
  and ads are never saved.
- **Add to home screen:** readers can install the site like an app; it then
  opens in their language.
- **Search engines:** each language has its own list of pages (sitemap),
  linked from `robots.txt`, and every page tells search engines about its
  five translations. Shared links show a preview image in the reader's
  language.

### Speed and accessibility

Checked with Google Lighthouse on mobile settings (slow 4G, mid-range phone),
on 10 pages across all six languages: **100/100** for performance,
accessibility, best practices and search engines on every page tested. The
automatic browser tests also check every language for accessibility problems
on each change.

### Reporting errors

Visitors report wrong numbers to **wrongnumber@ebola.help** (shown on every
page). Cloudflare forwards these messages to your usual inbox, for free
([DEPLOY.md, Step 6](DEPLOY.md#step-6-receive-wrongnumberebolahelp-in-your-inbox-5-minutes)).

### Project phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Languages, language picker, page layout, Arabic right-to-left | Done |
| 2 | Design, outbreak banner and health information pages | Done |
| 3 | Automatic news collection | Done |
| 4 | Helplines, treatment centres and the map | Done (numbers await your check) |
| 5 | Editing page, search engines, offline use, speed and accessibility checks | Done |
| 6 | Putting the site online at ebola.help | Ready: follow [DEPLOY.md](DEPLOY.md) |

---

## For developers

Requirements: Node.js 24 (see `.nvmrc`).

```sh
npm install
npm run dev          # local site at http://localhost:4321 with live reload
npm test             # unit tests (translations, helpers)
npm run build        # type check + build static site into dist/
npm run test:e2e     # browser tests against the build (run build first)
npm run news         # collect news now (add -- --dry to only report)
npm run verify-me    # regenerate VERIFY_ME.md after editing src/data/help/
npm run images       # redraw share images and app icons (after changing the logo or tagline)
```

The first run of `npm run test:e2e` on a new machine needs
`npx playwright install chromium`.

### Structure

```
src/
  i18n/locales.ts          list of languages (add new ones here)
  i18n/messages/*.json     all interface text, one file per language
  layouts/                 page frames (BaseLayout for language pages)
  components/              header, footer, emergency box, language menu
  pages/index.astro        language picker at /
  pages/[locale]/          pages generated for every language
  content/health/<lang>/   health information pages (Markdown), one folder per language
  data/sources.ts          every official source cited on the site
  data/outbreak.json       figures shown in the outbreak banner
  data/news-sources.ts     news sources read by the hourly job
  data/news/items.json     collected news (written by the job)
  data/news/overrides.json hide or pin news items
  data/help/<ISO>.json     helplines and contacts per country (pending/verified)
public/_headers            cache and security headers on Cloudflare
wrangler.jsonc             Cloudflare hosting settings (serves dist/)
.pages.yml                 editing page (Pages CMS) forms for the data files above
  lib/africa-map.ts        builds the SVG map from Natural Earth data
scripts/news/              the hourly news job (npm run news)
  styles/global.css        colours, fonts, base styles
public/fonts/              Noto Sans Arabic (SIL Open Font License)
tests/unit/                Vitest
tests/e2e/                 Playwright + axe accessibility checks
```

### Adding a language (for example Swahili)

1. Add an entry to `src/i18n/locales.ts` (code, native name, direction).
2. Copy `src/i18n/messages/en.json` to `sw.json` and translate every text.
3. Import it in `src/i18n/index.ts`.

The type checker and unit tests fail until every text is translated.

### Language routing

- `/` is the language picker. The browser language is highlighted as a
  suggestion, but the visitor chooses.
- The choice is saved in the `ebh_locale` cookie (one year). Later visits to
  `/` go straight to the saved language. The language menu on every page also
  updates the cookie.
- Each page lists all language versions with `hreflang` links; `x-default`
  points to `/`.
