// dist 内の全HTMLからサイト内リンク（href / src の "/" 始まり）を集め、
// リンク先ファイルが dist に実在するかを検証する。無ければ exit 1。
// 外部URL・mailto・アンカーのみのリンクは対象外。
import { readdir, readFile, access } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const distDir = 'dist';

const htmlFiles = [];
const walk = async (d) => {
  for (const entry of await readdir(d, { withFileTypes: true })) {
    const full = join(d, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
};
await walk(distDir);

const errors = [];
for (const file of htmlFiles) {
  const rel = relative(distDir, file).split(sep).join('/');
  const html = await readFile(file, 'utf8');
  const targets = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
  for (const target of targets) {
    const path = target.split('#')[0].split('?')[0];
    if (path === '' || path === '/') continue;
    const candidates = path.endsWith('/')
      ? [join(distDir, path, 'index.html')]
      : [join(distDir, path), join(distDir, path, 'index.html')];
    let found = false;
    for (const c of candidates) {
      try {
        await access(c);
        found = true;
        break;
      } catch {
        /* 次の候補へ */
      }
    }
    if (!found) errors.push(`${rel} → ${target}`);
  }
}

if (errors.length > 0) {
  console.error('内部リンク切れ:');
  for (const e of [...new Set(errors)]) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`内部リンクチェック OK（${htmlFiles.length}ページ）`);
