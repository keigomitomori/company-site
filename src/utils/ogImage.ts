// コラムの OG 画像（public/images/og/<記事ID>.png）と、そこからビルド時に作る WebP 派生画像のパス。
// PNG は og:image 用にそのまま配信する。記事ページのアイキャッチ・一覧のサムネイルは WebP 派生画像を使う。
// 派生画像は scripts/og-webp-integration.mjs がビルド時に dist へ書き出す（リポジトリには置かない）。
// コラムの公開は従来どおり md と PNG を置くだけでよい。

/** 書き出す WebP の幅（px）。元の PNG は 1200×630 */
export const OG_WEBP_WIDTHS = [640, 1200] as const;
export type OgWebpWidth = (typeof OG_WEBP_WIDTHS)[number];

/** og:image・構造化データに使う元の PNG */
export const ogImagePng = (id: string) => `/images/og/${id}.png`;

/** 指定幅の WebP 派生画像 */
export const ogImageWebp = (id: string, width: OgWebpWidth) => `/images/og/w${width}/${id}.webp`;

/** <img srcset> 用の候補一覧 */
export const ogImageSrcset = (id: string) => OG_WEBP_WIDTHS.map((w) => `${ogImageWebp(id, w)} ${w}w`).join(', ');
