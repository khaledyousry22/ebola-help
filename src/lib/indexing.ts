/**
 * Pages kept out of search engines (noindex, not in the sitemaps), as the
 * part after /<locale>: the offline page, and the news lists, which are
 * headlines that link to other websites rather than our own content.
 */
export const NOINDEX_PAGES = ['/news/', '/news/other-languages/', '/offline/'];
