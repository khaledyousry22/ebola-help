# Drafts waiting for approval

Health pages in this folder are drafts. They are never on the live site.

- Put a draft at `<language>/<page>.md`, in all six languages (for example
  `en/symptoms.md`, `fr/symptoms.md` and so on), with the same front matter
  as the live pages in `src/content/health/`.
- Every paragraph, list item and key point must link to its source with
  `[[sourceId]]` (the unit tests check this).
- `npm run build:drafts` builds a preview in `dist-drafts/` with the drafts
  in place of the live pages.
- To publish after approval, move the files into `src/content/health/`.

When there are no drafts, the build prints "No files found" for this folder.
That is normal.
