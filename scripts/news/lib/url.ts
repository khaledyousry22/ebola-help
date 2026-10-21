import { createHash } from 'node:crypto';

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|xtor$|at_|ref$|ref_|cmp$|ns_|ocid$|mc_)/i;

/**
 * The link we store: tracking parameters and fragments removed.
 * Only http(s) links are accepted.
 */
export function cleanUrl(raw: string): string | undefined {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

/** Key used to recognise the same article behind small URL differences. */
export function urlKey(clean: string): string {
  const url = new URL(clean);
  const host = url.hostname.toLowerCase().replace(/^(www|m|amp)\./, '');
  const path = url.pathname.replace(/\/amp\/?$/, '/').replace(/\/+$/, '');
  return `${host}${path}${url.search}`;
}

export function itemId(clean: string): string {
  return createHash('sha256').update(urlKey(clean)).digest('hex').slice(0, 16);
}

/** Registrable-looking host for matching against an allowlist, e.g. 'news.bbc.co.uk' -> matches 'bbc.co.uk'. */
export function hostMatches(host: string, domain: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  return h === domain || h.endsWith(`.${domain}`);
}
