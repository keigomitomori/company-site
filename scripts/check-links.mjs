// dist 内の全HTMLからサイト内リンクを集め、リンク先が実在するかを検証する。切れていれば exit 1。
// - 対象: href / src / srcset の "/" 始まりのURLと、"#..." のページ内リンク
// - パスはパーセントエンコードを戻してから dist のファイルと照合する
// - "#アンカー" 付きのリンクは、リンク先ページ（ページ内リンクなら同じページ）にその id があるかも確かめる
// 外部URL・プロトコル相対URL・mailto・"#" だけのリンクは対象外。
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { decodeEntities, listHtmlFiles } from './lib/dist-html.mjs';

const distDir = 'dist';
const htmlFiles = await listHtmlFiles(distDir);

/** パーセントエンコードを戻す（不正なエンコードはそのまま返し、照合で失敗させる） */
const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** HTML から id 属性の集合を作る（name 属性のアンカーは使っていないので見ない） */
const idCache = new Map();
const idsOf = async (file) => {
  if (!idCache.has(file)) {
    const html = await readFile(file, 'utf8');
    const ids = new Set([...html.matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => decodeEntities(m[1] ?? m[2])));
    idCache.set(file, ids);
  }
  return idCache.get(file);
};

/** サイト内パスに対応する dist のファイルを返す（無ければ undefined） */
const resolveFile = async (path) => {
  const candidates = path.endsWith('/')
    ? [join(distDir, path, 'index.html')]
    : [join(distDir, path), join(distDir, path, 'index.html')];
  for (const c of candidates) {
    try {
      await access(c);
      return c;
    } catch {
      /* 次の候補へ */
    }
  }
  return undefined;
};

/** タグ内の URL を集める: href・src は値そのもの、srcset は「URL 幅記述子, ...」の URL 部分 */
const collectUrls = (html) => {
  const urls = [];
  for (const m of html.matchAll(/\s(href|src|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const value = decodeEntities(m[2] ?? m[3]);
    if (m[1].toLowerCase() === 'srcset') {
      for (const candidate of value.split(',')) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url) urls.push(url);
      }
    } else {
      urls.push(value.trim());
    }
  }
  return urls;
};

const errors = [];
for (const { file, rel } of htmlFiles) {
  const html = await readFile(file, 'utf8');
  for (const target of collectUrls(html)) {
    const isPageAnchor = target.startsWith('#');
    if (!isPageAnchor && (!target.startsWith('/') || target.startsWith('//'))) continue; // 外部・相対・mailto 等

    const hashIndex = target.indexOf('#');
    const beforeHash = hashIndex === -1 ? target : target.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? '' : safeDecode(target.slice(hashIndex + 1));
    const path = safeDecode(beforeHash.split('?')[0]);

    let targetFile = file;
    if (!isPageAnchor && path !== '' && path !== '/') {
      targetFile = await resolveFile(path);
      if (!targetFile) {
        errors.push(`${rel} → ${target}`);
        continue;
      }
    } else if (path === '/') {
      targetFile = join(distDir, 'index.html');
    }

    // "#" だけ・"#top" はブラウザが先頭へ移動させるので id 不要
    if (fragment === '' || fragment.toLowerCase() === 'top') continue;
    if (!targetFile.endsWith('.html')) continue; // 画像等のフラグメントは見ない
    if (!(await idsOf(targetFile)).has(fragment)) errors.push(`${rel} → ${target}（id="${fragment}" がありません）`);
  }
}

if (errors.length > 0) {
  console.error('内部リンク切れ:');
  for (const e of [...new Set(errors)]) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`内部リンクチェック OK（${htmlFiles.length}ページ）`);
