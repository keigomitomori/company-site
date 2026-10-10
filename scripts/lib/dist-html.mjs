// ビルド成果物（dist）の HTML を走査する共通部品。
// scripts/check-links.mjs と scripts/sitemap-integration.mjs が使う。
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

/**
 * distDir 配下の .html を再帰的に集める。
 * @returns {Promise<{ file: string; rel: string; urlPath: string }[]>}
 *   file: 絶対/相対のファイルパス、rel: distDir からの相対パス（"/" 区切り）、
 *   urlPath: 公開URLのパス（index.html はディレクトリ形式。例: "/articles/"・"/about/"・"/404.html"）
 */
export const listHtmlFiles = async (distDir) => {
  const files = [];
  const walk = async (d) => {
    const entries = await readdir(d, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.html')) files.push(full);
    }
  };
  await walk(distDir);
  return files.map((file) => {
    const rel = relative(distDir, file).split(sep).join('/');
    const isIndex = rel === 'index.html' || rel.endsWith('/index.html');
    return { file, rel, urlPath: `/${isIndex ? rel.slice(0, -'index.html'.length) : rel}` };
  });
};

/** 開始タグ（例: "link"・"meta"）をすべて取り出す */
export const findTags = (html, tagName) => html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) ?? [];

/** タグ文字列から属性値を取り出す（属性の順序・引用符の種類に依存しない）。無ければ undefined */
export const getAttr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
};

/** 属性値の最小限の文字参照を戻す（&amp; 等。リンク先・id の比較用） */
export const decodeEntities = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
