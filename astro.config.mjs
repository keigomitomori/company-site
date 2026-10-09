import { defineConfig } from 'astro/config';
import localSitemap from './scripts/sitemap-integration.mjs';
import { SITE_URL } from './src/config/site.ts';

const site = SITE_URL;

export default defineConfig({
  site,
  compressHTML: false,
  build: {
    format: 'preserve',
  },
  integrations: [localSitemap({ site })],
});
