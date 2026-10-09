// ビルド成果物（dist）を対象にした自前インテグレーション。2つの役割を持つ:
// 1. sitemap.xml の自動生成 — build.format 'preserve' の実URL（ルート直下は .html、
//    index.html はディレクトリ形式）をそのまま反映するため、@astrojs/sitemap ではなく自前で生成する。
//    noindex を宣言しているページと 404 は除外する。
// 2. canonical の実URL一致検証 — 全ページの <link rel="canonical"> がそのファイルの
//    実URLと一致しなければビルドを失敗させる（ページ複製時の書き換え忘れを機械的に止める）。
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findTags, getAttr, listHtmlFiles } from './lib/dist-html.mjs';

export default function localSitemap({ site }) {
  return {
    name: 'local-sitemap',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const htmlFiles = await listHtmlFiles(distDir);

        // サイト所有権確認ファイル等、canonical を持たなくてよい既知パターン（sitemap 対象外）
        const CANONICAL_EXEMPT = [/^google[0-9a-f]+\.html$/i];
        // <meta name="robots" content="...noindex..."> を属性順・追加値に依存せず検出する
        const hasNoindex = (html) =>
          findTags(html, 'meta').some(
            (tag) =>
              getAttr(tag, 'name')?.toLowerCase() === 'robots' && /\bnoindex\b/i.test(getAttr(tag, 'content') ?? ''),
          );
        // <link rel="canonical" href="..."> を属性順・引用符の種類に依存せず取り出す
        const findCanonical = (html) => {
          const tag = findTags(html, 'link').find((t) =>
            (getAttr(t, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical'),
          );
          return tag ? getAttr(tag, 'href') : undefined;
        };
        const escapeXml = (s) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const urls = [];
        const canonicalErrors = [];
        for (const { file, rel, urlPath } of htmlFiles) {
          const html = await readFile(file, 'utf8');
          const realUrl = new URL(urlPath, site).href;

          const canonical = findCanonical(html);
          if (canonical === undefined) {
            if (CANONICAL_EXEMPT.some((re) => re.test(rel))) continue;
            canonicalErrors.push(`${rel}: canonical がありません（BaseLayout を使っていますか？）`);
            continue;
          }
          if (canonical !== realUrl) canonicalErrors.push(`${rel}: canonical=${canonical} が実URL ${realUrl} と不一致`);

          if (rel === '404.html') continue;
          if (hasNoindex(html)) continue;
          urls.push(realUrl);
        }

        if (canonicalErrors.length > 0) {
          throw new Error(`canonical 検証エラー:\n${canonicalErrors.join('\n')}`);
        }

        urls.sort();
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`),
          '</urlset>',
          '',
        ].join('\n');
        await writeFile(join(distDir, 'sitemap.xml'), xml);
        logger.info(`canonical 全${htmlFiles.length}ページ一致 / sitemap.xml 生成（${urls.length} URL）`);
      },
    },
  };
}
