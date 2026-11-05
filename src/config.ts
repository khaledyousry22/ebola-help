/** Site-wide settings. */

export const SITE_URL = 'https://ebola.help';

/** GitHub repository holding the site and its data. The editing page saves here. */
export const REPOSITORY = 'khaledyousry22/ebola-help';

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
 * Adsterra native banner (website 6177846, ad unit 32109314): a labelled
 * panel of sponsored links, one per page, on the same pages as AdSense
 * (home, news, other-languages news, map). Never pop-ups or redirects.
 * Not loaded on data-saving or 2G connections, or for visitors whose
 * device uses a European time zone (see NativeAd.astro).
 * Set enabled to false to remove every Adsterra ad from the site.
 */
export const ADSTERRA = {
  enabled: true,
  scriptUrl: 'https://bauval.org/21/1f0a9c3a57fe3968e0e2c11d2f931415',
  containerId: 'container-1f0a9c3a57fe3968e0e2c11d2f931415',
} as const;

/**
 * Short extracts under news headlines. Off while the site shows ads: WHO's
 * website terms allow extracts only for non-commercial use, and news feeds'
 * terms vary. Headline, source, date and link are shown either way.
 */
export const NEWS_EXCERPTS = !ADS.enabled;
