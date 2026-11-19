/** Pieces of schema.org structured data shared by several pages. */
import { EDITOR, SITE_URL, SOCIAL_LINKS } from '../config';

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** Who publishes the site and who runs it, as on the About page. */
export const organization = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'Ebola.help',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icons/icon-512.png`,
  sameAs: SOCIAL_LINKS.map((link) => link.url),
  founder: { '@type': 'Person', name: EDITOR.name, description: EDITOR.description },
};

/** A written page (health guide, situation update) published by the team. */
export function article(options: {
  type: 'Article' | 'MedicalWebPage';
  url: string;
  title: string;
  description: string;
  language: string;
  image: string;
  published?: string;
  modified: string;
}): Record<string, unknown> {
  return {
    '@type': options.type,
    '@id': `${options.url}#page`,
    url: options.url,
    mainEntityOfPage: options.url,
    headline: options.title,
    name: options.title,
    description: options.description,
    inLanguage: options.language,
    image: options.image,
    ...(options.published ? { datePublished: options.published } : {}),
    dateModified: options.modified,
    ...(options.type === 'MedicalWebPage' ? { lastReviewed: options.modified } : {}),
    author: { '@id': ORGANIZATION_ID },
    publisher: organization,
  };
}
