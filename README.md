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
  look after, so there is nothing to update or patch.
- It is designed for slow and expensive mobile connections: each page is about
  4 to 7 KB to download and needs no JavaScript.
- News updates will run automatically every hour (from Phase 3).
- You will edit helplines and outbreak status through a simple web form
  (from Phase 5).

### Updating the outbreak figures (until the editing form arrives in Phase 5)

The banner at the top of every page reads `src/data/outbreak.json`. To update it
on GitHub: open the file, click the pencil icon, change the numbers, then:

- set `asOf` to the date the figures refer to (YYYY-MM-DD);
- set `source` to the official source they come from. Sources are listed in
  `src/data/sources.ts`; a new source must be added there first;
- set `lastReviewed` to today.

Save ("Commit changes"). If anything is missing or misspelled, the automatic
checks fail and the site is not updated, so a wrong entry can never go live.

### Your checklist of phone numbers

[`VERIFY_ME.md`](VERIFY_ME.md) lists every phone number, address or facility
that is waiting for your check. Nothing on that list is shown on the website
until you confirm it.

### Reporting errors

Visitors report wrong numbers to **wrongnumber@ebola.help** (shown on every
page). Make sure this mailbox or forward exists at your domain company
(GoDaddy).

### Project phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Languages, language picker, page layout, Arabic right-to-left | Done |
| 2 | Design, outbreak banner and health information pages | Done |
| 3 | Automatic news collection | Next |
| 4 | Helplines, treatment centres and the map | |
| 5 | Editing page, search engines, offline use, speed and accessibility checks | |
| 6 | Putting the site online at ebola.help (step-by-step guide) | |

---

## For developers

Requirements: Node.js 24 (see `.nvmrc`).

```sh
npm install
npm run dev          # local site at http://localhost:4321 with live reload
npm test             # unit tests (translations, helpers)
npm run build        # type check + build static site into dist/
npm run test:e2e     # browser tests against the build (run build first)
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
