/** Site-wide settings. */

export const SITE_URL = 'https://ebola.help';

/** GitHub repository holding the site and its data. The editing page saves here. */
export const REPOSITORY = 'khaledyousry22/ebola-help';

/** Where readers can support the site. Linked from every footer, the About page and the editorial policy. */
export const PATREON_URL = 'https://www.patreon.com/c/ebolahelp/membership';

/** Ebola.help on social media. Linked from every footer. */
export const SOCIAL_LINKS = [
  { name: 'X', url: 'https://x.com/ebolahelpx' },
  { name: 'Facebook', url: 'https://www.facebook.com/ebolahelpfb' },
] as const;

/**
 * Languages shared on social media. /feeds/social.xml lists official news and
 * the weekly updates in these languages, and a posting service turns each new
 * entry into a Facebook post (see SOCIAL.md).
 */
export const SOCIAL_FEED_LOCALES = ['en', 'fr'] as const;

/** Where visitors report wrong phone numbers or other errors. Shown in every footer. */
export const CONTACT_EMAIL = 'wrongnumber@ebola.help';

/** Time this copy of the site was built. Shown as "Last updated" in every footer. */
export const BUILD_TIME = new Date();

/**
 * Google AdSense. Ads appear only where an <AdSlot> is placed: the home
 * page, the news pages and the map. Never on health advice, helplines,
 * country pages, About or the language picker.
 * Set enabled to false to remove every ad from the site.
 */
export const ADS = {
  enabled: true,
  client: 'ca-pub-6667226078449577',
  slot: '8499220315',
} as const;

/**
 * Short extracts under news headlines. Off while the site shows ads: WHO's
 * website terms allow extracts only for non-commercial use, and news feeds'
 * terms vary. Headline, source, date and link are shown either way.
 */
export const NEWS_EXCERPTS = !ADS.enabled;
