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
