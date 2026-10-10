// Cloudflare Workers（静的アセットのみ・Worker コードなし）の設定。cf（Cloudflare CLI）が読む。
// デプロイは GitHub Actions から行う（.github/workflows/deploy.yml）。
// アセットの置き場所（dist）は cf のビルドエンジンである Wrangler 側の wrangler.config.ts で指定する。
// モードは `--mode preview` でプレビュー、指定なしで本番になる
import { defineConfig } from 'cf/config';

const compatibilityDate = '2026-10-01';

// /about/ 形式の URL を配信する。/about → /about/ の補完と 404.html の返却は Cloudflare に任せる。
// 旧 /about.html 形式からの 301 転送は public/_redirects、レスポンスヘッダーは public/_headers
const assets = {
  htmlHandling: 'auto-trailing-slash',
  notFoundHandling: '404-page',
} as const;

// 本番。独自ドメインは Workers のカスタムドメインで割り当てる。
// www.nextb.net → nextb.net の転送はゾーンの Redirect Rule で行う（CLAUDE.md の運用メモ参照）
const production = {
  worker: {
    name: 'nextb-net',
    compatibilityDate,
    // 本番を *.workers.dev でも公開すると重複コンテンツになるため閉じる
    workersDev: false,
    assets,
    domains: ['nextb.net'],
  },
};

// PR のプレビュー。独自ドメインを持たない別 Worker として workers.dev にだけ出す。
// 検索に載らないよう、CI がプレビュー用の dist の _headers に noindex を追記する
const preview = {
  worker: {
    name: 'nextb-net-preview',
    compatibilityDate,
    workersDev: true,
    assets,
  },
};

export default defineConfig((ctx) => (ctx.mode === 'preview' ? preview : production));
