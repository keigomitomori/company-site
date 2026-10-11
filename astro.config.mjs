import { defineConfig } from 'astro/config';
import localSitemap from './scripts/sitemap-integration.mjs';
import ogWebp from './scripts/og-webp-integration.mjs';
import { SITE_URL } from './src/config/site.ts';

const site = SITE_URL;

export default defineConfig({
  site,
  compressHTML: false,
  // ページは /about/ 形式（about/index.html）で出力する（ユーザー決定 2026-10-11）。
  // 旧 /about.html 形式の URL は public/_redirects で 301 転送する
  build: {
    format: 'directory',
  },
  integrations: [localSitemap({ site }), ogWebp()],
});
