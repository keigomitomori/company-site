// Cloudflare Workers（静的アセット）の設定。cf（Cloudflare CLI）が読む。
// デプロイは GitHub Actions から行う（.github/workflows/deploy.yml）。
// アセットの置き場所（dist）は cf のビルドエンジンである Wrangler 側の wrangler.config.ts で指定する。
// モードは `--mode preview` でプレビュー、指定なしで本番になる
import { bindings, defineConfig } from 'cf/config';

const compatibilityDate = '2026-10-01';
const entrypoint = 'worker/index.js';

// 既定の auto-trailing-slash は /about.html を /about へ転送し canonical と食い違うため止める。
// ディレクトリURLの解決・拡張子なしURLの転送・404 は worker/index.js が担う
const assets = {
  htmlHandling: 'none',
  notFoundHandling: 'none',
} as const;

// 本番。独自ドメインは Workers のカスタムドメインで割り当てる。
// www.nextb.net → nextb.net の転送は Worker ではなくゾーンの Redirect Rule で行う（CLAUDE.md の運用メモ参照）
const production = {
  worker: {
    name: 'nextb-net',
    compatibilityDate,
    entrypoint,
    // 本番を *.workers.dev でも公開すると重複コンテンツになるため閉じる
    workersDev: false,
    assets,
    domains: ['nextb.net'],
    env: {
      ASSETS: bindings.assets(),
    },
  },
};

// PR のプレビュー。独自ドメインを持たない別 Worker として workers.dev にだけ出す。
// 全リクエストを Worker で受け、検索に載らないよう noindex を付ける
const preview = {
  worker: {
    name: 'nextb-net-preview',
    compatibilityDate,
    entrypoint,
    workersDev: true,
    assets: { ...assets, runWorkerFirst: true },
    env: {
      NOINDEX: bindings.text('1'),
      ASSETS: bindings.assets(),
    },
  },
};

// 2つを1つの関数から直接返すと、TypeScript が本番側に NOINDEX?: undefined を補って型が合わなくなるため、
// 定数に分けてから選ぶ
export default defineConfig((ctx) => (ctx.mode === 'preview' ? preview : production));
