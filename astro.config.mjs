import { defineConfig } from 'astro/config';
import localSitemap from './scripts/sitemap-integration.mjs';

const site = 'https://nextb.net';

export default defineConfig({
  site,
  compressHTML: false,
  build: {
    format: 'preserve',
  },
  integrations: [localSitemap({ site })],
});
