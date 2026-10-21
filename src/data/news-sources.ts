/**
 * Every news source the hourly news job reads.
 *
 * - official: health authorities (WHO, Africa CDC, ECDC, national institutes).
 *   Shown first, under "Official updates".
 * - media: a hand-picked list of established news organisations.
 *
 * All feeds are RSS feeds or APIs that the publishers provide for this kind
 * of use. We only keep the headline, source, date, a short excerpt and the
 * link to the original article. Items must mention Ebola (see keywords.ts).
 *
 * `group` links the same publisher's feeds in different languages, so a
 * reader is not shown the same announcement six times.
 *
 * Checked on 2026-10-21 from the build environment: all enabled feeds
 * answered except GDELT, which limits shared connections to one request
 * every five seconds and often refuses; it is kept and simply skipped when
 * it fails. ReliefWeb's API needs an approved app name, so it is not used.
 */
import type { Locale } from '../i18n/locales';

export type NewsSourceKind = 'rss' | 'who-don' | 'gdelt';

export interface NewsSource {
  id: string;
  /** Name shown next to each headline, as the publisher writes it in that language. */
  name: string;
  type: 'official' | 'media';
  kind: NewsSourceKind;
  url: string;
  homepage: string;
  /** Language of the feed. GDELT items carry their own language. */
  lang?: Locale;
  /** Same publisher in several languages. */
  group?: string;
  /** Extra words that mark an item as Ebola-related for this source only. */
  extraKeywords?: string[];
  /** Countries every item from this source concerns (e.g. a national institute). */
  defaultCountries?: string[];
  enabled: boolean;
}

const WHO_NEWS = 'https://www.who.int/rss-feeds/news-{lang}.xml';
const UN_NEWS = 'https://news.un.org/feed/subscribe/{lang}/news/topic/health/feed/rss.xml';

export const NEWS_SOURCES: NewsSource[] = [
  // ----- Official -----
  {
    id: 'who-don',
    name: 'World Health Organization (WHO): Disease Outbreak News',
    type: 'official',
    kind: 'who-don',
    url: 'https://www.who.int/api/news/diseaseoutbreaknews?sf_culture=en&$top=30&$orderby=PublicationDateAndTime%20desc&$select=Title,Summary,PublicationDateAndTime,UrlName,DonId',
    homepage: 'https://www.who.int/emergencies/disease-outbreak-news',
    lang: 'en',
    enabled: true,
  },
  ...(
    [
      ['en', 'english', 'World Health Organization (WHO)'],
      ['fr', 'french', 'Organisation mondiale de la Santé (OMS)'],
      ['es', 'spanish', 'Organización Mundial de la Salud (OMS)'],
      ['ar', 'arabic', 'منظمة الصحة العالمية'],
      ['zh', 'chinese', '世界卫生组织'],
      ['ru', 'russian', 'Всемирная организация здравоохранения (ВОЗ)'],
    ] as const
  ).map(
    ([lang, file, name]): NewsSource => ({
      id: `who-news-${lang}`,
      name,
      type: 'official',
      kind: 'rss',
      url: WHO_NEWS.replace('{lang}', file),
      homepage: 'https://www.who.int/news',
      lang,
      group: 'who-news',
      enabled: true,
    }),
  ),
  {
    id: 'who-afro-en',
    name: 'WHO Regional Office for Africa',
    type: 'official',
    kind: 'rss',
    url: 'https://www.afro.who.int/rss.xml',
    homepage: 'https://www.afro.who.int/',
    lang: 'en',
    group: 'who-afro',
    enabled: true,
  },
  {
    id: 'who-afro-fr',
    name: "Bureau régional de l'OMS pour l'Afrique",
    type: 'official',
    kind: 'rss',
    url: 'https://www.afro.who.int/fr/rss.xml',
    homepage: 'https://www.afro.who.int/fr',
    lang: 'fr',
    group: 'who-afro',
    enabled: true,
  },
  {
    id: 'drc-insp',
    name: 'Institut National de Santé Publique (RDC)',
    type: 'official',
    kind: 'rss',
    url: 'https://insp.cd/feed/',
    homepage: 'https://insp.cd/',
    lang: 'fr',
    // Daily situation reports are titled "SitRep N°… /MVE-BDBV/…".
    extraKeywords: ['MVE', 'BDBV'],
    defaultCountries: ['CD'],
    enabled: true,
  },
  {
    id: 'africa-cdc',
    name: 'Africa CDC',
    type: 'official',
    kind: 'rss',
    // The site's main feed is empty; news and outbreak reports have their own feeds.
    url: 'https://africacdc.org/news-item/feed/',
    homepage: 'https://africacdc.org/',
    lang: 'en',
    group: 'africa-cdc',
    enabled: true,
  },
  {
    id: 'africa-cdc-outbreaks',
    name: 'Africa CDC',
    type: 'official',
    kind: 'rss',
    url: 'https://africacdc.org/disease-outbreak/feed/',
    homepage: 'https://africacdc.org/',
    lang: 'en',
    group: 'africa-cdc',
    enabled: true,
  },
  {
    id: 'ecdc',
    name: 'European Centre for Disease Prevention and Control (ECDC)',
    type: 'official',
    kind: 'rss',
    url: 'https://www.ecdc.europa.eu/en/taxonomy/term/1310/feed',
    homepage: 'https://www.ecdc.europa.eu/',
    lang: 'en',
    enabled: true,
  },

  // ----- Media: UN News in the six languages -----
  ...(
    [
      ['en', 'UN News'],
      ['fr', 'ONU Info'],
      ['es', 'Noticias ONU'],
      ['ar', 'أخبار الأمم المتحدة'],
      ['zh', '联合国新闻'],
      ['ru', 'Новости ООН'],
    ] as const
  ).map(
    ([lang, name]): NewsSource => ({
      id: `un-news-${lang}`,
      name,
      type: 'media',
      kind: 'rss',
      url: UN_NEWS.replace('{lang}', lang),
      homepage: `https://news.un.org/${lang}/`,
      lang,
      group: 'un-news',
      enabled: true,
    }),
  ),

  // ----- Media: Ebola topic feeds -----
  media('france24-en-ebola', 'France 24', 'en', 'https://www.france24.com/en/tag/ebola/rss', 'https://www.france24.com/en/'),
  media('france24-es-ebola', 'France 24', 'es', 'https://www.france24.com/es/tag/%C3%A9bola/rss', 'https://www.france24.com/es/'),
  media('rfi-fr-ebola', 'RFI', 'fr', 'https://www.rfi.fr/fr/tag/ebola/rss', 'https://www.rfi.fr/fr/'),
  media('rfi-es-ebola', 'RFI', 'es', 'https://www.rfi.fr/es/tag/%C3%A9bola/rss', 'https://www.rfi.fr/es/'),
  media('rfi-ru-ebola', 'RFI', 'ru', 'https://www.rfi.fr/ru/tag/%D1%8D%D0%B1%D0%BE%D0%BB%D0%B0/rss', 'https://www.rfi.fr/ru/'),

  // ----- Media: general feeds, filtered for Ebola -----
  media('france24-fr-afrique', 'France 24', 'fr', 'https://www.france24.com/fr/afrique/rss', 'https://www.france24.com/fr/'),
  media('france24-ar', 'فرانس 24', 'ar', 'https://www.france24.com/ar/rss', 'https://www.france24.com/ar/'),
  media('radio-okapi', 'Radio Okapi', 'fr', 'https://www.radiookapi.net/rss.xml', 'https://www.radiookapi.net/'),
  media('actualite-cd', 'Actualite.cd', 'fr', 'https://actualite.cd/feed', 'https://actualite.cd/'),
  media('africanews-en', 'Africanews', 'en', 'https://www.africanews.com/feed/rss', 'https://www.africanews.com/'),
  media('bbc-africa', 'BBC News', 'en', 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', 'https://www.bbc.com/news/world/africa'),
  media('bbc-arabic', 'BBC News عربي', 'ar', 'https://feeds.bbci.co.uk/arabic/rss.xml', 'https://www.bbc.com/arabic'),
  media('bbc-russian', 'BBC News Русская служба', 'ru', 'https://feeds.bbci.co.uk/russian/rss.xml', 'https://www.bbc.com/russian'),
  media('bbc-zhongwen', 'BBC News 中文', 'zh', 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml', 'https://www.bbc.com/zhongwen/simp'),
  media('bbc-mundo', 'BBC News Mundo', 'es', 'https://feeds.bbci.co.uk/mundo/rss.xml', 'https://www.bbc.com/mundo'),
  media('skynews-arabia', 'سكاي نيوز عربية', 'ar', 'https://www.skynewsarabia.com/rss/world.xml', 'https://www.skynewsarabia.com/'),
  media('dw-en', 'DW', 'en', 'https://rss.dw.com/rdf/rss-en-all', 'https://www.dw.com/en/'),
  media('dw-es', 'DW', 'es', 'https://rss.dw.com/rdf/rss-sp-all', 'https://www.dw.com/es/'),
  media('dw-ar', 'DW عربية', 'ar', 'https://rss.dw.com/rdf/rss-ar-all', 'https://www.dw.com/ar/'),
  media('dw-zh', 'DW 中文', 'zh', 'https://rss.dw.com/rdf/rss-chi-all', 'https://www.dw.com/zh/'),
  media('dw-ru', 'DW', 'ru', 'https://rss.dw.com/rdf/rss-ru-all', 'https://www.dw.com/ru/'),
  media('rfi-cn', '法广 RFI', 'zh', 'https://www.rfi.fr/cn/rss', 'https://www.rfi.fr/cn/'),
  media('chinanews', '中国新闻网', 'zh', 'https://www.chinanews.com.cn/rss/scroll-news.xml', 'https://www.chinanews.com.cn/'),
  media('tass', 'ТАСС', 'ru', 'https://tass.ru/rss/v2.xml', 'https://tass.ru/'),
  media('ria', 'РИА Новости', 'ru', 'https://ria.ru/export/rss2/archive/index.xml', 'https://ria.ru/'),
  media('interfax', 'Интерфакс', 'ru', 'https://www.interfax.ru/rss.asp', 'https://www.interfax.ru/'),
  media('elpais', 'El País', 'es', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada', 'https://elpais.com/'),

  // ----- Media: GDELT search, limited to the outlets in GDELT_DOMAINS -----
  {
    id: 'gdelt',
    name: 'GDELT',
    type: 'media',
    kind: 'gdelt',
    url: 'https://api.gdeltproject.org/api/v2/doc/doc',
    homepage: 'https://www.gdeltproject.org/',
    enabled: true,
  },
];

function media(id: string, name: string, lang: Locale, url: string, homepage: string): NewsSource {
  return { id, name, type: 'media', kind: 'rss', url, homepage, lang, enabled: true };
}

/**
 * GDELT finds articles from thousands of sites. We keep only these
 * established outlets, shown under the name given here.
 */
export const GDELT_DOMAINS: Record<string, string> = {
  'reuters.com': 'Reuters',
  'apnews.com': 'AP',
  'bbc.com': 'BBC',
  'bbc.co.uk': 'BBC',
  'theguardian.com': 'The Guardian',
  'aljazeera.com': 'Al Jazeera',
  'npr.org': 'NPR',
  'statnews.com': 'STAT',
  'theeastafrican.co.ke': 'The EastAfrican',
  'monitor.co.ug': 'Daily Monitor',
  'nation.africa': 'Nation',
  'premiumtimesng.com': 'Premium Times',
  'lemonde.fr': 'Le Monde',
  'rfi.fr': 'RFI',
  'france24.com': 'France 24',
  'jeuneafrique.com': 'Jeune Afrique',
  'radiookapi.net': 'Radio Okapi',
  'actualite.cd': 'Actualite.cd',
  'tv5monde.com': 'TV5Monde',
  'elpais.com': 'El País',
  'efe.com': 'EFE',
  'rtve.es': 'RTVE',
  'elmundo.es': 'El Mundo',
  'europapress.es': 'Europa Press',
  'dw.com': 'DW',
  'aljazeera.net': 'الجزيرة',
  'alarabiya.net': 'العربية',
  'skynewsarabia.com': 'سكاي نيوز عربية',
  'aawsat.com': 'الشرق الأوسط',
  'chinanews.com.cn': '中国新闻网',
  'people.com.cn': '人民网',
  'xinhuanet.com': '新华网',
  'news.cn': '新华网',
  'thepaper.cn': '澎湃新闻',
  'zaobao.com.sg': '联合早报',
  'caixin.com': '财新',
  'tass.ru': 'ТАСС',
  'ria.ru': 'РИА Новости',
  'interfax.ru': 'Интерфакс',
  'rbc.ru': 'РБК',
  'kommersant.ru': 'Коммерсантъ',
};

/** GDELT language names for our locales. */
export const GDELT_LANGUAGES: Record<Locale, string> = {
  ar: 'arabic',
  zh: 'chinese',
  en: 'english',
  fr: 'french',
  ru: 'russian',
  es: 'spanish',
};

export function newsSourceById(id: string): NewsSource | undefined {
  return NEWS_SOURCES.find((s) => s.id === id);
}
