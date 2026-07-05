import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nextb.net',
  compressHTML: false,
  build: {
    format: 'preserve',
  },
});
