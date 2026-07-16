// 公開（draft でない）コラム全件に対応する OG 画像 public/images/og/<slug>.png が
// 存在するかを検証する。無ければ exit 1（記事ページのアイキャッチと一覧サムネが
// この PNG を直接参照しており、置き忘れると公開ページの画像が404になるため）。
import { readdir, readFile, access } from 'node:fs/promises';
import { join, basename } from 'node:path';

const articlesDir = 'src/content/articles';
const ogDir = 'public/images/og';

const errors = [];
for (const file of await readdir(articlesDir)) {
  if (!file.endsWith('.md')) continue;
  const slug = basename(file, '.md');
  const text = await readFile(join(articlesDir, file), 'utf8');
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  const isDraft = fm && /^draft:\s*true\s*$/m.test(fm[1]);
  if (isDraft) continue;
  try {
    await access(join(ogDir, `${slug}.png`));
  } catch {
    errors.push(`${slug}: ${ogDir}/${slug}.png がありません（scripts/generate-og-images.py で生成してください）`);
  }
}

if (errors.length > 0) {
  console.error('OG画像チェック失敗:');
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log('OG画像チェック OK');
