// cf のビルドエンジン（Wrangler）の設定。Worker の設定本体は cloudflare.config.ts。
// アセットは Astro のビルド成果物（dist）をそのまま配信する（本番・プレビュー共通）
import { defineWranglerConfig } from 'wrangler/experimental-config';

export default defineWranglerConfig(() => ({
  assetsDirectory: './dist',
}));
