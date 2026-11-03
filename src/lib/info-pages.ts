/** Policy pages (src/content/info/<locale>/<slug>.md), in the order the footer lists them. */
export const INFO_PAGES = ['editorial-policy', 'privacy', 'contact'] as const;
export type InfoSlug = (typeof INFO_PAGES)[number];
