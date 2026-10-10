// プレビュー配信用に dist/_headers の `/*` ブロックへ X-Robots-Tag: noindex を足す（CI の preview ジョブ専用）。
// 同じパスのブロックを末尾に追記すると先のブロックが無効になりセキュリティ系ヘッダーが消えるため、
// 既存の `/*` ブロックの中に1行挿入する。本番の dist には使わない
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'dist/_headers';
const lines = readFileSync(path, 'utf8').split('\n');
const at = lines.findIndex((line) => line.trim() === '/*');
if (at === -1) {
  console.error(`${path} に /* のブロックがありません`);
  process.exit(1);
}
lines.splice(at + 1, 0, '  X-Robots-Tag: noindex');
writeFileSync(path, lines.join('\n'));
console.log(`${path} に X-Robots-Tag: noindex を追加しました`);
