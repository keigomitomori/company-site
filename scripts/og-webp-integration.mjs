// コラムの OG 画像（PNG）から、アイキャッチ・サムネイル用の WebP 派生画像をビルド時に作る自前インテグレーション。
// - 入力: dist/images/og/<記事ID>.png（public/images/og/ からビルドでコピーされたもの）
// - 出力: dist/images/og/w<幅>/<記事ID>.webp（幅は src/utils/ogImage.ts の OG_WEBP_WIDTHS）
// 派生画像はリポジトリに置かない。コラムの公開は従来どおり md と PNG を置くだけで、WebP はビルドが作る。
// PNG はそのまま残し、og:image・構造化データはこれを指す。
// 参照切れ（PNG が無いのに WebP を参照している等）は scripts/check-og-images.mjs と scripts/check-links.mjs が検出する。
// `astro dev` では dist が無いため、同じパスへのリクエストに対して public の PNG からその場で変換して返す。
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { OG_WEBP_WIDTHS } from '../src/utils/ogImage.ts';

// 文字の輪郭と暗い地のグラデーションが目視で元の PNG と見分けられない品質（2026-10 に拡大比較で確認）
const WEBP_OPTIONS = { quality: 85, smartSubsample: true, effort: 6 };

const toWebp = (input, width) => sharp(input).resize({ width, withoutEnlargement: true }).webp(WEBP_OPTIONS);

export default function ogWebp() {
  return {
    name: 'og-webp',
    hooks: {
      'astro:server:setup': ({ server }) => {
        const pattern = new RegExp(`^/images/og/w(${OG_WEBP_WIDTHS.join('|')})/([^/]+)\\.webp$`);
        server.middlewares.use(async (req, res, next) => {
          const m = pattern.exec(decodeURIComponent((req.url ?? '').split('?')[0]));
          if (!m) return next();
          try {
            const png = await readFile(join('public/images/og', `${m[2]}.png`));
            const body = await toWebp(png, Number(m[1])).toBuffer();
            res.setHeader('Content-Type', 'image/webp');
            res.end(body);
          } catch {
            next();
          }
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const ogDir = join(fileURLToPath(dir), 'images/og');
        let pngs;
        try {
          pngs = (await readdir(ogDir)).filter((f) => f.endsWith('.png'));
        } catch {
          pngs = [];
        }
        for (const width of OG_WEBP_WIDTHS) await mkdir(join(ogDir, `w${width}`), { recursive: true });
        await Promise.all(
          pngs.flatMap((png) =>
            OG_WEBP_WIDTHS.map((width) =>
              toWebp(join(ogDir, png), width).toFile(join(ogDir, `w${width}`, png.replace(/\.png$/, '.webp'))),
            ),
          ),
        );
        logger.info(`OG 画像の WebP 派生画像を生成（${pngs.length} 件 × 幅 ${OG_WEBP_WIDTHS.join('/')}）`);
      },
    },
  };
}
