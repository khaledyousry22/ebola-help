// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { citationsPlugin } from './src/lib/citations.ts';

export default defineConfig({
  site: 'https://ebola.help',
  // Plain folders with index.html files work on any static host.
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Keep HTML-aware whitespace handling so translated sentences with inline
  // elements never lose their spaces.
  compressHTML: true,
  // [[sourceId]] after a claim becomes a numbered link to that source (src/lib/citations.ts).
  markdown: { processor: satteri({ mdastPlugins: [citationsPlugin] }) },
  vite: {
    plugins: [tailwindcss()],
  },
});
