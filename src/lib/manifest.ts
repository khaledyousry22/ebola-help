/** Web app manifest: lets readers add Ebola.help to their home screen. */
export interface ManifestText {
  lang: string;
  dir: 'ltr' | 'rtl';
  description: string;
  startUrl: string;
}

export function manifest({ lang, dir, description, startUrl }: ManifestText): Response {
  const body = {
    id: startUrl,
    name: 'Ebola.help',
    short_name: 'Ebola.help',
    description,
    lang,
    dir,
    start_url: startUrl,
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0a2740',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
