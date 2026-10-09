// サイト全体の基本情報の正本。社名・サイト名・URL・計測IDを変えるときはここだけを直す。
// astro.config.mjs の `site` もここから読む。ページ側の絶対URLは Astro.site から導出する。

/** 本番のオリジン（末尾スラッシュなし） */
export const SITE_URL = 'https://nextb.net';

/** サイト名（og:site_name・og:title の接尾辞に使う） */
export const SITE_NAME = 'NEXT Bridge';

/** 正式社名（<title> の接尾辞・構造化データの組織名に使う） */
export const COMPANY_NAME = '株式会社ネクストブリッジ';

/** Google アナリティクス 4 の測定ID（本番ビルドでのみ計測タグを出力する） */
export const GA_MEASUREMENT_ID = 'G-YJH7LLFYJQ';

/** 既定の OG 画像（サイトルートからのパス） */
export const DEFAULT_OG_IMAGE = '/images/og-default.png';

/** ロゴ画像（サイトルートからのパス。構造化データの logo に使う） */
export const LOGO_PATH = '/images/logo.webp';
