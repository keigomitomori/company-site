// 公開（draft でない）コラム全件に対応する OG 画像 public/images/og/<記事ID>.png が
// 存在するかを検証する。無ければ exit 1（記事ページのアイキャッチと一覧サムネが
// この PNG を直接参照しており、置き忘れると公開ページの画像が404になるため）。
//
// 走査対象と記事IDは src/content.config.ts の glob ローダーと同じ規則で求める:
// - base 配下を再帰した '**/*.md'（tinyglobby の既定どおりドットで始まるファイル・ディレクトリは除外）
// - ID は frontmatter の slug があればそれ、無ければパスの各階層を github-slugger で slug 化し末尾の /index を除いたもの
// tinyglobby と github-slugger は Astro 自身が glob ローダーで使っている依存（同じ実装を使うことで規則のずれを防ぐ）。
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { glob } from 'tinyglobby';
import { slug as githubSlug } from 'github-slugger';

const articlesDir = 'src/content/articles';
const pattern = '**/*.md'; // content.config.ts の glob({ pattern }) と揃える
const ogDir = 'public/images/og';

/** frontmatter（--- で囲んだ先頭ブロック）を取り出す。CRLF の改行も扱う */
const frontmatterOf = (text) => text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];

/** frontmatter の単純なスカラー値（key: value）を取り出す。引用符は外す */
const scalar = (fm, key) => {
  const m = fm?.match(new RegExp(`^${key}:[ \\t]*(.*?)[ \\t]*\\r?$`, 'm'));
  if (!m) return undefined;
  return m[1].replace(/\s+#.*$/, '').replace(/^(["'])(.*)\1$/, '$2');
};

const entryId = (relPath, fm) => {
  const explicit = scalar(fm, 'slug');
  if (explicit) return explicit;
  return relPath
    .replace(/\.md$/, '')
    .split('/')
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/, '');
};

const files = (await glob(pattern, { cwd: articlesDir, expandDirectories: false })).sort();

const errors = [];
let checked = 0;
for (const relPath of files) {
  const text = await readFile(join(articlesDir, relPath), 'utf8');
  const fm = frontmatterOf(text);
  if (scalar(fm, 'draft') === 'true') continue;
  checked++;
  const id = entryId(relPath, fm);
  try {
    await access(join(ogDir, `${id}.png`));
  } catch {
    errors.push(`${relPath}: ${ogDir}/${id}.png がありません（scripts/generate-og-images.py で生成してください）`);
  }
}

if (errors.length > 0) {
  console.error('OG画像チェック失敗:');
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`OG画像チェック OK（公開記事 ${checked} 件）`);
