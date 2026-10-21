/** /manifest.webmanifest: for the language picker. */
import type { APIRoute } from 'astro';
import { getMessages } from '../i18n';
import { manifest } from '../lib/manifest';

export const GET: APIRoute = () =>
  manifest({ lang: 'en', dir: 'ltr', description: getMessages('en').meta.homeDescription, startUrl: '/' });
