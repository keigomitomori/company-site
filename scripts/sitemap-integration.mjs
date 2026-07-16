// ビルド成果物（dist）を対象にした自前インテグレーション。2つの役割を持つ:
// 1. sitemap.xml の自動生成 — build.format 'preserve' の実URL（ルート直下は .html、
//    index.html はディレクトリ形式）をそのまま反映するため、@astrojs/sitemap ではなく自前で生成する。
//    noindex を宣言しているページと 404 は除外する。
// 2. canonical の実URL一致検証 — 全ページの <link rel="canonical"> がそのファイルの
//    実URLと一致しなければビルドを失敗させる（ページ複製時の書き換え忘れを機械的に止める）。
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export default function localSitemap({ site }) {
  return {
    name: 'local-sitemap',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const htmlFiles = [];
        const walk = async (d) => {
          for (const entry of await readdir(d, { withFileTypes: true })) {
            const full = join(d, entry.name);
            if (entry.isDirectory()) await walk(full);
            else if (entry.name.endsWith('.html')) htmlFiles.push(full);
          }
        };
        await walk(distDir);

        const urls = [];
        const canonicalErrors = [];
        for (const file of htmlFiles) {
          const rel = relative(distDir, file).split(sep).join('/');
          const html = await readFile(file, 'utf8');
          const isIndex = rel === 'index.html' || rel.endsWith('/index.html');
          const path = isIndex ? rel.slice(0, -'index.html'.length) : rel;
          const realUrl = new URL(`/${path}`, site).href;

          const m = html.match(/<link rel="canonical" href="([^"]*)"/);
          if (!m) {
            // canonical を持たない HTML（サイト所有権確認ファイル等）はサイトマップ対象外として警告に留める
            logger.warn(`${rel}: canonical がないため sitemap から除外します`);
            continue;
          }
          if (m[1] !== realUrl) canonicalErrors.push(`${rel}: canonical=${m[1]} が実URL ${realUrl} と不一致`);

          if (rel === '404.html') continue;
          if (/<meta\s+name="robots"\s+content="noindex"/i.test(html)) continue;
          urls.push(realUrl);
        }

        if (canonicalErrors.length > 0) {
          throw new Error(`canonical 検証エラー:\n${canonicalErrors.join('\n')}`);
        }

        urls.sort();
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
          '</urlset>',
          '',
        ].join('\n');
        await writeFile(join(distDir, 'sitemap.xml'), xml);
        logger.info(`canonical 全${htmlFiles.length}ページ一致 / sitemap.xml 生成（${urls.length} URL）`);
      },
    },
  };
}
