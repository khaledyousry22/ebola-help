// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://ebola.help',
  // Plain folders with index.html files work on any static host.
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Keep HTML-aware whitespace handling so translated sentences with inline
  // elements never lose their spaces.
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
  },
});
