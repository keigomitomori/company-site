// 日付表記の正本。表示形式を変えるときはここだけを直す。
// 表示（fmt）と機械可読（iso）の両方を日本時間で求める。ビルド環境のタイムゾーン（CI は UTC）に依存させない。
const tokyoDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const ymd = (d: Date) => {
  const parts = Object.fromEntries(tokyoDate.formatToParts(d).map((p) => [p.type, p.value]));
  return { y: parts.year, m: parts.month, d: parts.day };
};

/** 表示用: 2026.08.01 */
export const fmt = (date: Date) => {
  const { y, m, d } = ymd(date);
  return `${y}.${m}.${d}`;
};

/** datetime 属性・構造化データ用: 2026-08-01 */
export const iso = (date: Date) => {
  const { y, m, d } = ymd(date);
  return `${y}-${m}-${d}`;
};

/** 日本時間での年（フッターの著作権表示など） */
export const tokyoYear = (date: Date = new Date()) => ymd(date).y;
